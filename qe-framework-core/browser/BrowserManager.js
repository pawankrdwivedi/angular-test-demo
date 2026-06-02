import { chromium, firefox, webkit } from 'playwright';
import logger from '../logger/Logger.js';
import configManager from '../config/ConfigManager.js';
import agenticAiManager from '../ai/AgenticAiManager.js';
import path from 'path';
import fs from 'fs';
import networkRecordPlaybackManager from '../mock/NetworkRecordPlaybackManager.js';
import { spawn, execSync } from 'child_process';
import os from 'os';

class BrowserManager {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.chromeProcess = null;
  }

  async launch() {
    const execConfig = configManager.getExecutionConfig();
    const browserType = process.env.BROWSER_TYPE || execConfig.browser || 'chromium';
    const headless = execConfig.headless !== undefined ? execConfig.headless : true;
    const slowMo = execConfig.slowMo || 0;

    logger.info(`Launching ${browserType} browser (Headless: ${headless})`);

    const options = {
      headless,
      slowMo,
      args: ['--disable-dev-shm-usage', '--no-sandbox'],
    };

    switch (browserType.toLowerCase()) {
      case 'chrome':
        this.browser = await chromium.launch({ ...options, channel: 'chrome' });
        break;
      case 'firefox':
        this.browser = await firefox.launch(options);
        break;
      case 'webkit':
        this.browser = await webkit.launch(options);
        break;
      case 'chromium':
      default:
        this.browser = await chromium.launch(options);
        break;
    }

    return this.browser;
  }

  async launchLocalChrome() {
    const debugPort = process.env.CHROME_DEBUG_PORT || '9222';
    const cdpEndpoint = `http://127.0.0.1:${debugPort}`;
    const execConfig = configManager.getExecutionConfig();
    const headless = execConfig.headless !== undefined ? execConfig.headless : true;
 
    try {
      logger.info(`Attempting to connect to locally installed Chrome at ${cdpEndpoint}`);
      this.browser = await chromium.connectOverCDP(cdpEndpoint);
      logger.info('Successfully connected to locally installed Chrome browser');
      return this.browser;
    } catch (error) {
      logger.warn(`Failed to connect to Chrome at ${cdpEndpoint}: ${error.message}`);
      logger.info('Attempting to launch Chrome with remote debugging port...');
      
      try {
        await this.startChromeWithRemoteDebugging(debugPort, headless);
        // Wait a moment for Chrome to start
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        this.browser = await chromium.connectOverCDP(cdpEndpoint);
        logger.info('Successfully launched and connected to Chrome via remote debugging');
        return this.browser;
      } catch (launchError) {
        logger.error(`Failed to launch Chrome with debugging: ${launchError.message}`);
        logger.info('Falling back to Playwright chromium');
        return await chromium.launch({
          headless: true,
          args: ['--disable-dev-shm-usage', '--no-sandbox'],
        });
      }
    }
  }

  async startChromeWithRemoteDebugging(debugPort, headless = true) {
    return new Promise((resolve, reject) => {
      const chromeExecutable = process.env.CHROME_EXECUTABLE_PATH || this.findChromeExecutable();
      
      if (!chromeExecutable) {
        reject(new Error('Chrome executable not found'));
        return;
      }
 
      const tempUserDataDir = path.join(os.tmpdir(), `playwright_chrome_profile_${debugPort}`);
      const args = [
        `--remote-debugging-port=${debugPort}`,
        `--user-data-dir=${tempUserDataDir}`,
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-extensions',
        '--disable-extensions-file-access-check',
        '--disable-extensions-http-throttling',
        '--disable-gpu',
        '--disable-preconnect',
        '--disable-sync',
      ];

      if (headless) {
        args.push('--headless=new');
      }

      logger.info(`Starting Chrome from: ${chromeExecutable} (Headless: ${headless})`);
      const chromeProcess = spawn(chromeExecutable, args, {
        detached: true,
        stdio: 'ignore',
      });

      this.chromeProcess = chromeProcess;

      // Unref the process so Node doesn't wait for it
      chromeProcess.unref();
      
      logger.info('Chrome process started with remote debugging enabled');
      resolve();
    });
  }

  findChromeExecutable() {
    const platform = os.platform();

    // 1. Try finding it from the system PATH
    try {
      const cmd = platform === 'win32' ? 'where.exe chrome' : 'which google-chrome || which chromium || which chromium-browser';
      const execResult = execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
      const firstPath = execResult.split('\r\n')[0].split('\n')[0];
      if (firstPath && fs.existsSync(firstPath)) {
        logger.info(`Found Chrome via system lookup: ${firstPath}`);
        return firstPath;
      }
    } catch (e) {
      // ignore path lookup failure
    }

    // 2. Try querying the Windows Registry
    if (platform === 'win32') {
      try {
        const regCmd = 'reg query "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome.exe" /ve';
        const regResult = execSync(regCmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
        const match = regResult.match(/REG_SZ\s+(.*)/);
        if (match && match[1]) {
          const resolvedPath = match[1].trim().replace(/^"|"$/g, '');
          if (fs.existsSync(resolvedPath)) {
            logger.info(`Found Chrome via Windows registry: ${resolvedPath}`);
            return resolvedPath;
          }
        }
      } catch (e) {
        // ignore registry lookup failure
      }

      try {
        const regCmd = 'reg query "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome.exe" /ve';
        const regResult = execSync(regCmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
        const match = regResult.match(/REG_SZ\s+(.*)/);
        if (match && match[1]) {
          const resolvedPath = match[1].trim().replace(/^"|"$/g, '');
          if (fs.existsSync(resolvedPath)) {
            logger.info(`Found Chrome via user registry: ${resolvedPath}`);
            return resolvedPath;
          }
        }
      } catch (e) {
        // ignore user registry lookup failure
      }
    }

    // 3. Fall back to standard possible locations
    const possiblePaths = [];
    if (platform === 'win32') {
      possiblePaths.push(
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
      );
    } else if (platform === 'darwin') {
      possiblePaths.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
    } else if (platform === 'linux') {
      possiblePaths.push('/usr/bin/google-chrome', '/usr/bin/chromium', '/snap/bin/chromium');
    }

    for (const chromePath of possiblePaths) {
      if (fs.existsSync(chromePath)) {
        logger.info(`Found Chrome executable in standard location: ${chromePath}`);
        return chromePath;
      }
    }

    logger.warn('Chrome executable not found in standard locations');
    return null;
  }

  async createContext(scenarioName = 'scenario') {
    if (!this.browser) {
      await this.launch();
    }

    const execConfig = configManager.getExecutionConfig();
    const width = execConfig.viewportWidth || 1280;
    const height = execConfig.viewportHeight || 720;

    const contextOptions = {
      viewport: { width, height },
      recordVideo: execConfig.video === 'on' || execConfig.video === 'retain-on-failure' ? {
        dir: path.join(process.cwd(), process.env.DIR_TEST_RESULTS || 'test_results', 'reports', 'videos'),
        size: { width, height },
      } : undefined,
    };

    this.context = await this.browser.newContext(contextOptions);

    // Setup Tracing if enabled
    if (execConfig.trace === 'on' || execConfig.trace === 'retain-on-failure') {
      logger.info('Starting Playwright Tracing');
      await this.context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    }

    this.page = await this.context.newPage();

    // Initialize network record/playback interception
    await networkRecordPlaybackManager.init(this.page, scenarioName);

    return { context: this.context, page: this.page };
  }

  async closeContext(scenarioFailed = false, scenarioName = 'scenario') {
    const execConfig = configManager.getExecutionConfig();
    const sanitizedScenarioName = scenarioName.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    if (this.context) {
      // Save any recorded API mocks if recording mode was active
      networkRecordPlaybackManager.saveRecordedMocks();

      // Handle screenshot
      if (execConfig.screenshot === 'on' || (execConfig.screenshot === 'only-on-failure' && scenarioFailed)) {
        try {
          const screenshotPath = path.join(
            process.cwd(),
            process.env.DIR_TEST_RESULTS || 'test_results',
            'reports',
            'screenshots',
            `${sanitizedScenarioName}_failed.png`
          );
          logger.info(`Taking failure screenshot: ${screenshotPath}`);
          await this.page.screenshot({ path: screenshotPath, fullPage: true });
        } catch (err) {
          logger.error(`Failed to take screenshot: ${err.message}`);
        }
      }

      // Handle tracing stop
      if (execConfig.trace === 'on' || (execConfig.trace === 'retain-on-failure' && scenarioFailed)) {
        try {
          const tracePath = path.join(
            process.cwd(),
            process.env.DIR_TEST_RESULTS || 'test_results',
            'reports',
            'traces',
            `${sanitizedScenarioName}_trace.zip`
          );
          logger.info(`Saving Playwright Trace to ${tracePath}`);
          await this.context.tracing.stop({ path: tracePath });
        } catch (err) {
          logger.error(`Failed to stop tracing: ${err.message}`);
        }
      } else if (execConfig.trace === 'retain-on-failure') {
        // Discard trace if it succeeded
        try {
          await this.context.tracing.stop();
        } catch (err) {
          // ignore
        }
      }

      await this.context.close();
      this.context = null;
      this.page = null;
    }
  }

  async closeBrowser() {
    if (this.browser) {
      logger.info('Closing Playwright browser');
      await this.browser.close();
      this.browser = null;
    }
    if (this.chromeProcess) {
      logger.info(`Killing spawned Chrome process (PID: ${this.chromeProcess.pid})`);
      try {
        if (os.platform() === 'win32') {
          spawn('taskkill', ['/pid', this.chromeProcess.pid.toString(), '/f', '/t']);
        } else {
          process.kill(-this.chromeProcess.pid);
        }
      } catch (err) {
        logger.debug(`Error killing Chrome process: ${err.message}`);
      }
      this.chromeProcess = null;
    }
  }

  /**
   * Self-Healing Locator utility with optional fallback strategy.
   * 
   * Behavior:
   * - If only primarySelector provided (no fallbacks): Returns element if found, throws error if not found
   * - If fallbacks provided: Executes full healing workflow with fallback selectors and AI healing
   * 
   * @param {Object} page - Playwright page object
   * @param {string} primarySelector - Primary CSS/XPath selector to locate element
   * @param {Array} fallbacks - Optional array of fallback selectors to try if primary fails
   * @param {number} timeout - Timeout in milliseconds for element wait
   * @returns {Promise<Locator>} - Playwright locator object
   * @throws {Error} - If element not found and no fallbacks provided, or all strategies fail
   */
  async findElementWithSelfHealing(page, primarySelector, fallbacks = [], timeout = 5000) {
    try {
      logger.debug(`Attempting to locate element using primary selector: ${primarySelector}`);
      const element = page.locator(primarySelector);
      await element.waitFor({ state: 'attached', timeout });
      return element;
    } catch (error) {
      // If no fallbacks provided, fail immediately
      if (!fallbacks || fallbacks.length === 0) {
        logger.error(`Primary selector "${primarySelector}" failed and no fallback selectors provided`);
        throw error;
      }

      // If fallbacks provided, proceed with full self-healing workflow
      logger.warn(`Primary selector "${primarySelector}" failed. Commencing self-healing locator strategies...`);

      // Try each fallback selector
      for (const fallback of fallbacks) {
        try {
          logger.info(`Trying fallback selector: "${fallback}"`);
          const element = page.locator(fallback);
          await element.waitFor({ state: 'attached', timeout: 2000 });
          logger.info(`Self-healing SUCCESS! Located element using fallback: "${fallback}"`);

          // Log anomaly for developer review or future agentic healing AI database
          this.logSelfHealingAction(primarySelector, fallback);

          return element;
        } catch (e) {
          logger.debug(`Fallback selector "${fallback}" failed.`);
        }
      }

      // AI Agentic Healing Hook - Only attempt if AI execution is enabled
      if (agenticAiManager.isExecutionEnabled) {
        try {
          const healedSelector = await this.callAgenticAiHealingService(primarySelector, page);
          if (healedSelector) {
            logger.info(`Agentic AI Healing SUCCESS! Healed selector: "${healedSelector}"`);
            const element = page.locator(healedSelector);
            await element.waitFor({ state: 'attached', timeout: 2000 });
            return element;
          }
        } catch (aiErr) {
          logger.error(`Agentic AI healing service error: ${aiErr.message}`);
        }
      } else {
        logger.debug('Agentic AI Healing is disabled. Skipping AI-based selector recovery.');
      }

      logger.error(`All self-healing strategies failed for primary selector: "${primarySelector}"`);
      throw error;
    }
  }

  logSelfHealingAction(broken, fixed) {
    const logsDir = process.env.DIR_TEST_LOGS || 'test_logs';
    const logFile = path.join(process.cwd(), logsDir, 'self_healing_anomalies.json');
    const anomaly = {
      timestamp: new Date().toISOString(),
      brokenSelector: broken,
      healedSelector: fixed,
      status: 'resolved'
    };

    try {
      let data = [];
      if (fs.existsSync(logFile)) {
        data = JSON.parse(fs.readFileSync(logFile, 'utf8'));
      }
      data.push(anomaly);
      fs.writeFileSync(logFile, JSON.stringify(data, null, 2));
    } catch (err) {
      logger.error(`Failed to write to self-healing anomaly log: ${err.message}`);
    }
  }

  async callAgenticAiHealingService(brokenSelector, page) {
    logger.info(`Calling Agentic AI Healing module for broken selector: "${brokenSelector}"`);
    // Placeholder logic: simulating AI locator correction by analyzing Page DOM context.
    // In a real framework, this would send the DOM structure and visual screenshots to an LLM / custom prompt,
    // which returns the corrected CSS/XPath.
    // For demonstration, we check if there are specific inputs that can match common patterns.
    return null;
  }
}

export default new BrowserManager();
