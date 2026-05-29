import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import logger from '../logger/Logger.js';
import configManager from '../config/ConfigManager.js';
import { resolveFromAppRoot } from '../utils/PathResolver.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * AllureReporter Class
 * 
 * Handles Allure report customization including:
 * - Environment configuration
 * - Screenshot and video attachments
 * - Test metadata and parameters
 * - Execution statistics
 * - Report properties
 */
class AllureReporter {
  constructor() {
    const resultsDir = process.env.DIR_TEST_RESULTS || 'test_results';
    this.allureResultsDir = resolveFromAppRoot(resultsDir, 'allure-results');
    this.environmentFile = path.join(this.allureResultsDir, 'environment.properties');
    this.initializeReporting();
  }

  /**
   * Initialize reporting by setting up directories and environment properties
   */
  initializeReporting() {
    try {
      // Ensure Allure results directory exists
      if (!fs.existsSync(this.allureResultsDir)) {
        fs.mkdirSync(this.allureResultsDir, { recursive: true });
        logger.info(`Created Allure results directory: ${this.allureResultsDir}`);
      }

      // Write environment properties
      this.writeEnvironmentProperties();
      logger.info('Allure reporting initialized successfully');
    } catch (error) {
      logger.error(`Failed to initialize Allure reporting: ${error.message}`);
    }
  }

  /**
   * Write environment properties to environment.properties file
   * This file is read by Allure and displayed in the report
   */
  writeEnvironmentProperties() {
    try {
      const properties = this.buildEnvironmentProperties();
      const propertiesContent = this.formatProperties(properties);
      
      fs.writeFileSync(this.environmentFile, propertiesContent, 'utf8');
      logger.info(`Environment properties written to ${this.environmentFile}`);
    } catch (error) {
      logger.error(`Failed to write environment properties: ${error.message}`);
    }
  }

  /**
   * Build environment properties object from configuration and system info
   */
  buildEnvironmentProperties() {
    const execConfig = configManager.getExecutionConfig();
    const uiConfig = configManager.getUiConfig();
    const apiConfig = configManager.getApiConfig();

    return {
      // Application & Environment Info
      'Application': configManager.getApplication(),
      'Environment': configManager.getEnvironment().toUpperCase(),
      'Test Runner': 'Cucumber / Playwright',
      'Node.js Version': process.version,
      'OS Platform': process.platform,
      'OS Architecture': process.arch,
      
      // URL Configuration
      'Base UI URL': uiConfig?.baseUrl || 'N/A',
      'Base API URL': apiConfig?.baseUrl || 'N/A',
      
      // Browser Configuration
      'Browser': (execConfig?.browser || 'chromium').toUpperCase(),
      'Headless Mode': String(execConfig?.headless !== false),
      'Slow Motion (ms)': String(execConfig?.slowMo || 0),
      
      // Execution Configuration
      'Parallel Workers': String(execConfig?.parallel || 1),
      'Test Timeout (ms)': String(execConfig?.timeout),
      'Viewport Width': String(execConfig?.viewportWidth || 1280),
      'Viewport Height': String(execConfig?.viewportHeight || 720),
      
      // Reporting Configuration
      'Screenshot Mode': execConfig?.screenshot || 'only-on-failure',
      'Video Recording': execConfig?.video || 'retain-on-failure',
      'Trace Recording': execConfig?.trace || 'retain-on-failure',
      
      // AI Features
      'AI Features Enabled': String(configManager.getAiConfig()?.enabled === true),
      'AI Execution': String(configManager.getAiConfig()?.execution === true),
      'AI Generation': String(configManager.getAiConfig()?.generation === true),
      
      // Execution Time
      'Execution Date': new Date().toISOString(),
      'Report Generated': new Date().toLocaleString(),
    };
  }

  /**
   * Format properties object into Allure properties format
   * Format: key=value (one per line)
   */
  formatProperties(properties) {
    return Object.entries(properties)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
  }

  /**
   * Attach a screenshot to the Allure report
   * @param {World} world - Cucumber world object
   * @param {string} name - Name/description for the attachment
   */
  async attachScreenshot(world, name = 'Screenshot') {
    try {
      if (world && world.attach && world.page) {
        const screenshotBuffer = await world.page.screenshot({ fullPage: true });
        if (screenshotBuffer) {
          world.attach(screenshotBuffer, 'image/png');
          logger.info(`Screenshot attached: ${name}`);
          return true;
        }
      }
    } catch (error) {
      logger.error(`Failed to attach screenshot: ${error.message}`);
    }
    return false;
  }

  /**
   * Attach a video file to the Allure report
   * @param {World} world - Cucumber world object
   * @param {string} videoPath - Path to video file
   * @param {string} name - Name/description for the attachment
   */
  async attachVideo(world, videoPath, name = 'Video Recording') {
    try {
      if (world && world.attach && videoPath && fs.existsSync(videoPath)) {
        const videoBuffer = fs.readFileSync(videoPath);
        world.attach(videoBuffer, 'video/mp4');
        logger.info(`Video attached: ${name} (${videoPath})`);
        return true;
      }
    } catch (error) {
      logger.error(`Failed to attach video: ${error.message}`);
    }
    return false;
  }

  /**
   * Attach a trace file to the Allure report
   * @param {World} world - Cucumber world object
   * @param {string} tracePath - Path to trace file
   * @param {string} name - Name/description for the attachment
   */
  async attachTrace(world, tracePath, name = 'Trace') {
    try {
      if (world && world.attach && tracePath && fs.existsSync(tracePath)) {
        const traceBuffer = fs.readFileSync(tracePath);
        world.attach(traceBuffer, 'application/zip');
        logger.info(`Trace attached: ${name} (${tracePath})`);
        return true;
      }
    } catch (error) {
      logger.error(`Failed to attach trace: ${error.message}`);
    }
    return false;
  }

  /**
   * Attach a file (any type) to the Allure report
   * @param {World} world - Cucumber world object
   * @param {string} filePath - Path to file
   * @param {string} mimeType - MIME type of the file
   * @param {string} name - Name/description for the attachment
   */
  async attachFile(world, filePath, mimeType, name = 'Attachment') {
    try {
      if (world && world.attach && filePath && fs.existsSync(filePath)) {
        const fileBuffer = fs.readFileSync(filePath);
        world.attach(fileBuffer, mimeType);
        logger.info(`File attached: ${name} (${filePath})`);
        return true;
      }
    } catch (error) {
      logger.error(`Failed to attach file: ${error.message}`);
    }
    return false;
  }

  /**
   * Attach text content to the Allure report
   * @param {World} world - Cucumber world object
   * @param {string} content - Text content to attach
   * @param {string} name - Name/description for the attachment
   */
  attachText(world, content, name = 'Text Report') {
    try {
      if (world && world.attach && content) {
        world.attach(content, 'text/plain');
        logger.info(`Text attachment added: ${name}`);
        return true;
      }
    } catch (error) {
      logger.error(`Failed to attach text: ${error.message}`);
    }
    return false;
  }

  /**
   * Attach JSON content to the Allure report
   * @param {World} world - Cucumber world object
   * @param {object} jsonData - JSON object to attach
   * @param {string} name - Name/description for the attachment
   */
  attachJson(world, jsonData, name = 'JSON Report') {
    try {
      if (world && world.attach && jsonData) {
        const jsonContent = JSON.stringify(jsonData, null, 2);
        world.attach(jsonContent, 'application/json');
        logger.info(`JSON attachment added: ${name}`);
        return true;
      }
    } catch (error) {
      logger.error(`Failed to attach JSON: ${error.message}`);
    }
    return false;
  }

  /**
   * Attach HTML content to the Allure report
   * @param {World} world - Cucumber world object
   * @param {string} htmlContent - HTML content to attach
   * @param {string} name - Name/description for the attachment
   */
  attachHtml(world, htmlContent, name = 'HTML Report') {
    try {
      if (world && world.attach && htmlContent) {
        world.attach(htmlContent, 'text/html');
        logger.info(`HTML attachment added: ${name}`);
        return true;
      }
    } catch (error) {
      logger.error(`Failed to attach HTML: ${error.message}`);
    }
    return false;
  }

  /**
   * Attach CSV content to the Allure report
   * @param {World} world - Cucumber world object
   * @param {string} csvContent - CSV content to attach
   * @param {string} name - Name/description for the attachment
   */
  attachCsv(world, csvContent, name = 'CSV Report') {
    try {
      if (world && world.attach && csvContent) {
        world.attach(csvContent, 'text/csv');
        logger.info(`CSV attachment added: ${name}`);
        return true;
      }
    } catch (error) {
      logger.error(`Failed to attach CSV: ${error.message}`);
    }
    return false;
  }

  /**
   * Add scenario metadata/parameters to the report
   * @param {World} world - Cucumber world object
   * @param {object} parameters - Key-value pairs of parameters
   */
  addParameters(world, parameters) {
    try {
      if (world && world.attach && parameters) {
        const parametersList = Object.entries(parameters)
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n');
        world.attach(parametersList, 'text/plain');
        logger.debug(`Parameters added to report: ${JSON.stringify(parameters)}`);
        return true;
      }
    } catch (error) {
      logger.error(`Failed to add parameters: ${error.message}`);
    }
    return false;
  }

  /**
   * Create a test summary report
   * @param {World} world - Cucumber world object
   * @param {object} summary - Summary data
   */
  createTestSummary(world, summary = {}) {
    try {
      const summaryReport = {
        'Test Name': summary.testName || 'N/A',
        'Status': summary.status || 'UNKNOWN',
        'Duration (ms)': summary.duration || 0,
        'Started At': summary.startTime ? new Date(summary.startTime).toISOString() : 'N/A',
        'Completed At': summary.endTime ? new Date(summary.endTime).toISOString() : 'N/A',
        'Environment': configManager.getEnvironment().toUpperCase(),
        'Application': configManager.getApplication(),
        'Browser': configManager.getExecutionConfig()?.browser || 'N/A',
        'User': process.env.USER || process.env.USERNAME || 'N/A',
        'Machine': os.hostname(),
        ...summary,
      };

      const summaryContent = JSON.stringify(summaryReport, null, 2);
      this.attachJson(world, summaryReport, 'Test Summary');
      return true;
    } catch (error) {
      logger.error(`Failed to create test summary: ${error.message}`);
    }
    return false;
  }

  /**
   * Capture and attach browser console logs
   * @param {World} world - Cucumber world object
   * @param {Array} consoleLogs - Array of console log entries
   */
  attachConsoleLogs(world, consoleLogs = []) {
    try {
      if (world && world.attach && consoleLogs && consoleLogs.length > 0) {
        const logsContent = consoleLogs
          .map(log => `[${log.type.toUpperCase()}] ${log.text}`)
          .join('\n');
        this.attachText(world, logsContent, 'Console Logs');
        return true;
      }
    } catch (error) {
      logger.error(`Failed to attach console logs: ${error.message}`);
    }
    return false;
  }

  /**
   * Capture and attach network requests/responses
   * @param {World} world - Cucumber world object
   * @param {Array} networkLogs - Array of network request/response data
   */
  attachNetworkLogs(world, networkLogs = []) {
    try {
      if (world && world.attach && networkLogs && networkLogs.length > 0) {
        const networkContent = networkLogs
          .map(req => `${req.method} ${req.url} - ${req.status}`)
          .join('\n');
        this.attachText(world, networkContent, 'Network Requests');
        return true;
      }
    } catch (error) {
      logger.error(`Failed to attach network logs: ${error.message}`);
    }
    return false;
  }

  /**
   * Get current test metadata
   */
  getTestMetadata() {
    return {
      application: configManager.getApplication(),
      environment: configManager.getEnvironment(),
      executionConfig: configManager.getExecutionConfig(),
      uiConfig: configManager.getUiConfig(),
      aiConfig: configManager.getAiConfig(),
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
    };
  }

  /**
   * Create a custom report file in Allure results directory
   * @param {string} filename - Name of the file
   * @param {string} content - File content
   * @param {boolean} isJson - Whether to format as JSON
   */
  writeCustomReport(filename, content, isJson = false) {
    try {
      const filepath = path.join(this.allureResultsDir, filename);
      const fileContent = isJson ? JSON.stringify(content, null, 2) : content;
      fs.writeFileSync(filepath, fileContent, 'utf8');
      logger.info(`Custom report written: ${filename}`);
      return true;
    } catch (error) {
      logger.error(`Failed to write custom report: ${error.message}`);
    }
    return false;
  }

  /**
   * Add test retry information to report
   * @param {World} world - Cucumber world object
   * @param {number} retryCount - Current retry attempt
   * @param {number} maxRetries - Maximum retries
   */
  addRetryInfo(world, retryCount, maxRetries) {
    try {
      if (world && world.attach) {
        const retryInfo = `Retry Attempt: ${retryCount + 1} of ${maxRetries + 1}`;
        this.attachText(world, retryInfo, 'Retry Information');
        return true;
      }
    } catch (error) {
      logger.error(`Failed to add retry info: ${error.message}`);
    }
    return false;
  }

  /**
   * Clean up old Allure results (optional)
   */
  cleanupOldResults() {
    try {
      if (fs.existsSync(this.allureResultsDir)) {
        fs.rmSync(this.allureResultsDir, { recursive: true, force: true });
        fs.mkdirSync(this.allureResultsDir, { recursive: true });
        logger.info('Old Allure results cleaned up');
        return true;
      }
    } catch (error) {
      logger.error(`Failed to cleanup old results: ${error.message}`);
    }
    return false;
  }
}

// Export singleton instance
export default new AllureReporter();
