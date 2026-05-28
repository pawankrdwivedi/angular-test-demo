import { chromium, firefox, webkit } from 'playwright';
import logger from '../logger/Logger.js';
import configManager from '../config/ConfigManager.js';
import agenticAiManager from '../ai/AgenticAiManager.js';
import path from 'path';
import fs from 'fs';

class BrowserManager {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  async launch() {
    const execConfig = configManager.getExecutionConfig();
    const browserType = execConfig.browser || 'chromium';
    const headless = execConfig.headless !== undefined ? execConfig.headless : true;
    const slowMo = execConfig.slowMo || 0;

    logger.info(`Launching ${browserType} browser (Headless: ${headless})`);

    const options = {
      headless,
      slowMo,
      args: ['--disable-dev-shm-usage', '--no-sandbox'],
    };

    switch (browserType.toLowerCase()) {
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
    return { context: this.context, page: this.page };
  }

  async closeContext(scenarioFailed = false, scenarioName = 'scenario') {
    const execConfig = configManager.getExecutionConfig();
    const sanitizedScenarioName = scenarioName.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    if (this.context) {
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
  }

  /**
   * Self-Healing Locator utility.
   * Resolves selector using a list of alternative locators if the primary selector fails.
   */
  async findElementWithSelfHealing(page, primarySelector, fallbacks = [], timeout = 5000) {
    try {
      logger.debug(`Attempting to locate element using primary selector: ${primarySelector}`);
      const element = page.locator(primarySelector);
      await element.waitFor({ state: 'attached', timeout });
      return element;
    } catch (error) {
      logger.warn(`Primary selector "${primarySelector}" failed. Commencing self-healing locator strategies...`);

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

      logger.error(`All locator strategies and self-healing failed for primary selector: "${primarySelector}"`);
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
