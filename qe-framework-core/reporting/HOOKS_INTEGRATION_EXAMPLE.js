/**
 * EXAMPLE: Updated hooks.js with AllureReporter Integration
 * 
 * Copy the relevant sections from this file to your app/step_definition/hooks.js
 * to integrate comprehensive Allure reporting into your test suite.
 */

import { Before, After, BeforeAll, AfterAll, Status, setDefaultTimeout } from '@cucumber/cucumber';
import fs from 'fs';
import browserManager from '../../framework/browser/BrowserManager.js';
import agenticAiManager from '../../framework/ai/AgenticAiManager.js';
import dbClient from '../../framework/db/DbClient.js';
import logger from '../../framework/logger/Logger.js';
import configManager from '../../framework/config/ConfigManager.js';
import allureReporter from '../../framework/reporting/AllureReporter.js';

// Set global step/hook timeout from configuration
const timeoutMs = configManager.getExecutionConfig().timeout || 30000;
setDefaultTimeout(timeoutMs);

BeforeAll(async function () {
  logger.info('Starting Global Test Execution Setup');
  
  // Log AI configuration status
  const aiConfig = configManager.getAiConfig();
  logger.info(`AI Configuration: Enabled=${aiConfig?.enabled || false}, Execution=${aiConfig?.execution || false}, Generation=${aiConfig?.generation || false}`);
  
  // Initialize Allure reporting with environment properties
  logger.info('Initializing Allure Reporter');
  allureReporter.initializeReporting();
  
  // Connect to DB pool initially if required
  try {
    await dbClient.connect();
  } catch (err) {
    logger.warn('Global Database connection could not be established. Falling back to Mock.');
  }
});

Before(async function (scenario) {
  this.scenario = scenario;
  this.scenarioName = scenario.pickle.name;
  this.scenarioStartTime = Date.now();
  
  // Track console logs for reporting
  this.consoleLogs = [];
  this.networkLogs = [];
  
  logger.info(`------------------------------------------------------------`);
  logger.info(`Starting Scenario: "${this.scenarioName}"`);
  logger.info(`------------------------------------------------------------`);

  // Add scenario parameters to Allure report
  const tags = scenario.pickle.tags.map(t => t.name);
  allureReporter.addParameters(this, {
    'Scenario Name': this.scenarioName,
    'Environment': configManager.getEnvironment().toUpperCase(),
    'Application': configManager.getApplication(),
    'Browser': configManager.getExecutionConfig()?.browser || 'N/A',
    'Tags': tags.length > 0 ? tags.join(', ') : 'None'
  });

  // Only initialize browser context if it is a UI scenario
  if (tags.includes('@ui')) {
    const { context, page } = await browserManager.createContext(this.scenarioName);
    this.context = context;
    this.page = page;
    
    // Setup console log listener
    page.on('console', msg => {
      this.consoleLogs.push({
        type: msg.type(),
        text: msg.text(),
        args: msg.args()
      });
    });
    
    // Setup network request listener (optional)
    page.on('response', response => {
      this.networkLogs.push({
        method: response.request().method(),
        url: response.url(),
        status: response.status()
      });
    });
  } else {
    logger.info('Non-UI Scenario: Skipping browser initialization.');
  }
});

After(async function (scenario) {
  const scenarioFailed = scenario.result?.status === Status.FAILED;
  const scenarioPassed = scenario.result?.status === Status.PASSED;
  const scenarioDuration = scenario.result?.duration?.nanos / 1000000 || (Date.now() - this.scenarioStartTime);
  
  // Track video path before closing context
  let videoPath = null;
  if (this.page) {
    try {
      const video = this.page.video();
      if (video) {
        videoPath = await video.path();
      }
    } catch (err) {
      logger.debug(`Could not retrieve video path: ${err.message}`);
    }
  }

  // AI failure analysis if failed
  if (scenarioFailed) {
    logger.error(`Scenario FAILED: "${this.scenarioName}"`);
    if (scenario.result?.error) {
      try {
        const analysis = await agenticAiManager.analyzeFailure(
          this.scenarioName,
          scenario.result.error,
          this.page
        );
        
        // Attach AI analysis to report
        allureReporter.attachJson(this, analysis, 'Agentic AI Failure Analysis');
      } catch (aiErr) {
        logger.error(`AI Failure Analyzer error: ${aiErr.message}`);
      }
    }

    // Capture screenshot on failure and attach to Allure report
    if (this.page) {
      try {
        const screenshot = await this.page.screenshot({ fullPage: true });
        this.attach(screenshot, 'image/png');
        allureReporter.attachScreenshot(this, 'Failure Screenshot');
        logger.info('Failure screenshot attached to Cucumber and Allure report.');
      } catch (err) {
        logger.error(`Failed to capture screenshot: ${err.message}`);
      }
    }
    
    // Attach console logs on failure
    if (this.consoleLogs && this.consoleLogs.length > 0) {
      allureReporter.attachConsoleLogs(this, this.consoleLogs);
    }
    
    // Attach network logs on failure
    if (this.networkLogs && this.networkLogs.length > 0) {
      allureReporter.attachNetworkLogs(this, this.networkLogs);
    }
  } else {
    logger.info(`Scenario PASSED: "${this.scenarioName}"`);
  }

  // Attach video recording if available
  if (videoPath) {
    try {
      await allureReporter.attachVideo(this, videoPath, `Test Video Recording - ${this.scenarioName}`);
      logger.info(`Video attached to Allure report: ${videoPath}`);
    } catch (err) {
      logger.error(`Failed to attach video: ${err.message}`);
    }
  }

  // Evaluate and clear soft assertions
  try {
    this.softAssert.assertAll();
  } catch (assertErr) {
    logger.error(`Scenario failed due to soft assertions: ${assertErr.message}`);
    // If scenario was passed, fail it now
    if (!scenarioFailed) {
      throw assertErr;
    }
  }

  // Create test summary in Allure report
  try {
    allureReporter.createTestSummary(this, {
      testName: this.scenarioName,
      status: scenarioFailed ? 'FAILED' : (scenarioPassed ? 'PASSED' : 'UNKNOWN'),
      duration: scenarioDuration,
      startTime: this.scenarioStartTime,
      endTime: Date.now(),
      tags: this.scenario.pickle.tags.map(t => t.name),
      errorMessage: scenario.result?.error?.message || 'None'
    });
  } catch (err) {
    logger.error(`Failed to create test summary: ${err.message}`);
  }

  // Close browser context
  if (this.context) {
    try {
      await this.context.close();
      logger.debug('Browser context closed.');
    } catch (err) {
      logger.error(`Failed to close browser context: ${err.message}`);
    }
  }
});

AfterAll(async function () {
  logger.info('Global Test Execution Complete');
  try {
    await dbClient.disconnect();
  } catch (err) {
    logger.warn(`Failed to disconnect from database: ${err.message}`);
  }
});
