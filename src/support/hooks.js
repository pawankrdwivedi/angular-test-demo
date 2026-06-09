import { Before, After, BeforeAll, AfterAll, Status, setDefaultTimeout } from '@cucumber/cucumber';
import fs from 'fs';
import path from 'path';
import { browserManager, dbClient, logger, configManager, allureReporter, SoftAssert } from 'qe-framework-core';

const appRoot = path.basename(process.cwd()) === 'app' ? process.cwd() : path.join(process.cwd(), 'app');

// Set global step/hook timeout from configuration (.env / YAML override)
const timeoutMs = configManager.getExecutionConfig().timeout;
setDefaultTimeout(timeoutMs);

BeforeAll(async function () {
  logger.info('Starting Global Test Execution Setup');
  

  // Initialize Allure reporting with environment properties
  logger.info('Initializing Allure Reporter');
  allureReporter.initializeReporting();
  
  // Connect to DB pool initially if required
  try {
    //await dbClient.connect();
  } catch (err) {
    logger.warn('Global Database connection could not be established. Falling back to Mock.');
  }
});

Before(async function (scenario) {
  this.scenario = scenario;
  this.scenarioName = scenario.pickle.name;
  this.scenarioStartTime = Date.now();
  
  // Instantiate soft asserts for this scenario
  this.softAssert = new SoftAssert();
  
  // Track console logs and network logs for Allure reporting
  this.consoleLogs = [];
  this.networkLogs = [];
  
  logger.info(`------------------------------------------------------------`);
  logger.info(`Starting Scenario: "${this.scenarioName}"`);
  logger.info(`------------------------------------------------------------`);

  // Add scenario parameters to Allure report using configManager resolved from env/yaml
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

    // Setup console log listener for Allure attachments
    page.on('console', msg => {
      this.consoleLogs.push({
        type: msg.type(),
        text: msg.text(),
        args: msg.args()
      });
    });

    // Setup network request listener for Allure attachments
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

  if (scenarioFailed) {
    logger.error(`Scenario FAILED: "${this.scenarioName}"`);
  } else {
    logger.info(`Scenario PASSED: "${this.scenarioName}"`);
  }

  // Close context to ensure screenshots, videos, and traces are saved and flushed
  if (this.context) {
    try {
      await browserManager.closeContext(scenarioFailed, this.scenarioName);
    } catch (err) {
      logger.error(`Failed to close browser context: ${err.message}`);
    }
  }

  const execConfig = configManager.getExecutionConfig();
  const sanitizedScenarioName = this.scenarioName.replace(/[^a-z0-9]/gi, '_').toLowerCase();

  // Attach screenshot based on .env / config values
  const shouldAttachScreenshot = execConfig.screenshot === 'on' || (execConfig.screenshot === 'only-on-failure' && scenarioFailed);
  if (shouldAttachScreenshot) {
    const screenshotPath = path.join(
      appRoot,
      'test_results',
      'reports',
      'screenshots',
      `${sanitizedScenarioName}_failed.png`
    );
    if (fs.existsSync(screenshotPath)) {
      try {
        const screenshotBuffer = fs.readFileSync(screenshotPath);
        this.attach(screenshotBuffer, 'image/png');
        logger.info(`Attached screenshot: ${screenshotPath}`);
      } catch (err) {
        logger.error(`Failed to attach screenshot to report: ${err.message}`);
      }
    }
  }

  // Attach video based on .env / config values
  const shouldAttachVideo = execConfig.video === 'on' || (execConfig.video === 'retain-on-failure' && scenarioFailed);
  if (shouldAttachVideo && videoPath && fs.existsSync(videoPath)) {
    try {
      await allureReporter.attachVideo(this, videoPath, `Test Video Recording - ${this.scenarioName}`);
      logger.info(`Attached execution video: ${videoPath}`);
      
      const videoBuffer = fs.readFileSync(videoPath);
      this.attach(videoBuffer, 'video/webm');
    } catch (err) {
      logger.warn(`Could not attach video file: ${err.message}`);
    }
  } else if (videoPath && fs.existsSync(videoPath)) {
    try {
      fs.unlinkSync(videoPath);
    } catch (err) {
      // ignore
    }
  }

  // Attach trace based on .env / config values
  const shouldAttachTrace = execConfig.trace === 'on' || (execConfig.trace === 'retain-on-failure' && scenarioFailed);
  if (shouldAttachTrace) {
    const tracePath = path.join(
      appRoot,
      'test_results',
      'reports',
      'traces',
      `${sanitizedScenarioName}_trace.zip`
    );
    if (fs.existsSync(tracePath)) {
      try {
        await allureReporter.attachTrace(this, tracePath, `Browser Trace - ${this.scenarioName}`);
        logger.info(`Attached execution trace: ${tracePath}`);
      } catch (err) {
        logger.warn(`Could not attach trace file: ${err.message}`);
      }
    }
  }

  // Attach console logs to Allure report on failure
  if (scenarioFailed && this.consoleLogs && this.consoleLogs.length > 0) {
    allureReporter.attachConsoleLogs(this, this.consoleLogs);
  }

  // Attach network logs to Allure report on failure
  if (scenarioFailed && this.networkLogs && this.networkLogs.length > 0) {
    allureReporter.attachNetworkLogs(this, this.networkLogs);
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

  // Evaluate and clear soft assertions
  try {
    this.softAssert.assertAll();
  } catch (assertErr) {
    logger.error(`Scenario failed due to soft assertions: ${assertErr.message}`);
    if (!scenarioFailed) {
      throw assertErr;
    }
  }
});

AfterAll(async function () {
  logger.info('Tearing down Global Test Execution');
  await browserManager.closeBrowser();
  //await dbClient.disconnect();
});
