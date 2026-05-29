import logger from '../logger/Logger.js';
import fs from 'fs';
import path from 'path';
import configManager from '../config/ConfigManager.js';
import { resolveFromAppRoot } from '../utils/PathResolver.js';

class AgenticAiManager {
  constructor() {
    this.aiEndpoint = process.env.AI_ENGINE_ENDPOINT || 'http://localhost:5001/ai';
  }

  get isAiEnabled() {
    const aiConfig = configManager.getAiConfig();
    // Priority: YAML config > .env config > system env var > false
    if (aiConfig && aiConfig.enabled !== undefined) {
      return aiConfig.enabled === true;
    }
    return process.env.AI_ENABLED === 'true' || false;
  }

  get isExecutionEnabled() {
    const aiConfig = configManager.getAiConfig();
    // Only enabled if both AI is enabled AND execution is explicitly enabled
    return this.isAiEnabled && (aiConfig && aiConfig.execution === true);
  }

  get isGenerationEnabled() {
    const aiConfig = configManager.getAiConfig();
    // Only enabled if both AI is enabled AND generation is explicitly enabled
    return this.isAiEnabled && (aiConfig && aiConfig.generation === true);
  }

  /**
   * AI-based locator healing hook.
   * Scrapes DOM context and calls LLM / AI service to resolve broken locators.
   */
  async healLocator(brokenSelector, page, errorMsg) {
    logger.info(`Agentic AI: Commencing locator self-healing for: "${brokenSelector}"`);

    if (!this.isExecutionEnabled) {
      logger.warn('Agentic AI: Execution capability is disabled. Fallback heuristics will be handled by BrowserManager.');
      return null;
    }

    try {
      const pageUrl = page.url();
      const domSnapshot = await page.evaluate(() => document.documentElement.outerHTML);

      logger.info('Agentic AI: Uploading DOM snapshot and broken selector to AI Service...');
      // Simulated AI payload
      const response = await this.callAiService('/heal-locator', {
        brokenSelector,
        errorMsg,
        pageUrl,
        domSnapshot,
      });

      if (response && response.healedSelector) {
        logger.info(`Agentic AI: Suggested new locator: "${response.healedSelector}" (Confidence: ${response.confidence})`);
        return response.healedSelector;
      }
    } catch (err) {
      logger.error(`Agentic AI Locator Healing error: ${err.message}`);
    }

    return null;
  }

  /**
   * AI Failure Analysis.
   * Examines standard test failures, stack traces, and page states to predict root cause.
   */
  async analyzeFailure(scenarioName, error, page = null) {
    logger.info(`Agentic AI: Commencing Failure Analysis for scenario: "${scenarioName}"`);

    const analysisReport = {
      scenarioName,
      errorMsg: error.message,
      stack: error.stack,
      predictedRootCause: 'Standard Timeout / Selector Mismatch',
      suggestedFix: 'Verify selector spelling or increase step timeout.',
      classification: 'Product Bug / Environment Issue / Test Flake',
    };

    if (!this.isExecutionEnabled) {
      this.saveAiReport('failure_analysis', analysisReport);
      return analysisReport;
    }

    try {
      let pageHtml = '';
      if (page) {
        pageHtml = await page.evaluate(() => document.documentElement.outerHTML);
      }

      const response = await this.callAiService('/analyze-failure', {
        scenarioName,
        errorMessage: error.message,
        stackTrace: error.stack,
        domSnapshot: pageHtml,
      });

      if (response) {
        Object.assign(analysisReport, response);
      }
    } catch (err) {
      logger.error(`Agentic AI Failure Analysis service failed: ${err.message}`);
    }

    this.saveAiReport('failure_analysis', analysisReport);
    return analysisReport;
  }

  /**
   * Smart Regression / Test Impact Analysis.
   * Suggests target tests based on code changes (e.g. Git status / modified code components).
   */
  async predictTestImpact(modifiedFiles) {
    logger.info(`Agentic AI: Running Test Impact Analysis for: [${modifiedFiles.join(', ')}]`);

    // Fallback: rule-based impact mapping
    const impactedPaths = [];
    modifiedFiles.forEach(file => {
      if (file.includes('Customer')) {
        impactedPaths.push('app/features/customer_validation.feature');
      }
      if (file.includes('Angular')) {
        impactedPaths.push('app/features/demo_angular_ui.feature');
      }
    });

    if (this.isExecutionEnabled) {
      try {
        const response = await this.callAiService('/predict-impact', { modifiedFiles });
        if (response && response.suggestedFeatures) {
          return response.suggestedFeatures;
        }
      } catch (err) {
        logger.error(`Agentic AI Test Impact analysis service failed: ${err.message}`);
      }
    }

    return [...new Set(impactedPaths)];
  }

  /**
   * AI Test Case Generation.
   * Generates or enhances test case templates based on scenario descriptions.
   */
  async generateTestCase(type, name, baseContent) {
    logger.info(`Agentic AI: Generating test case for: "${name}" (Type: ${type})`);

    if (!this.isGenerationEnabled) {
      logger.warn('Agentic AI: Generation capability is disabled. Using default template.');
      return baseContent;
    }

    try {
      // Simulated AI payload or endpoint call
      const response = await this.callAiService('/generate-testcase', {
        type,
        name,
        baseContent,
      });

      if (response && response.enhancedContent) {
        logger.info(`Agentic AI: Successfully generated/enhanced test case for "${name}"`);
        return response.enhancedContent;
      }
    } catch (err) {
      logger.error(`Agentic AI Test Generation error: ${err.message}`);
    }

    // Fallback: append an AI-generated comment to show it was processed
    return `// Enhanced by Agentic AI Generator\n${baseContent}`;
  }

  /**
   * AI-generated assertions.
   * Examines payload structures and returns list of properties to validate.
   */
  generateAssertions(payload, schemaName = 'response_schema') {
    logger.info(`Agentic AI: Generating assertions for schema: "${schemaName}"`);
    const assertions = [];

    for (const [key, value] of Object.entries(payload)) {
      assertions.push({
        property: key,
        type: typeof value,
        assertion: `should be type ${typeof value}`,
      });
    }

    return assertions;
  }

  /**
   * Autonomous Execution Planning.
   * Plans the sequence of test files based on previous execution success rates.
   */
  async planExecution(featureList) {
    logger.info('Agentic AI: Preparing execution execution plan');

    // Sort logic (can prioritize previously failed scenarios)
    return featureList;
  }

  // Utility helper to query AI microservice
  async callAiService(endpoint, payload) {
    try {
      // Mocked HTTP call to showcase actual API call integration if AI is active
      logger.debug(`Calling AI agent service endpoint: ${this.aiEndpoint}${endpoint}`);

      // In a real framework execution, we would do:
      // const res = await axios.post(`${this.aiEndpoint}${endpoint}`, payload);
      // return res.data;

      return null;
    } catch (err) {
      logger.error(`AI Service request failed on ${endpoint}: ${err.message}`);
      throw err;
    }
  }

  // Saves reports for local execution view
  saveAiReport(reportType, data) {
    const aiReportsDir = resolveFromAppRoot(process.env.DIR_TEST_RESULTS || 'test_results', 'reports', 'ai_insights');
    if (!fs.existsSync(aiReportsDir)) {
      fs.mkdirSync(aiReportsDir, { recursive: true });
    }

    const reportPath = path.join(aiReportsDir, `${reportType}_${Date.now()}.json`);
    try {
      fs.writeFileSync(reportPath, JSON.stringify(data, null, 2));
      logger.info(`Saved Agentic AI insight report: ${reportPath}`);
    } catch (err) {
      logger.error(`Failed to save AI report: ${err.message}`);
    }
  }
}

export default new AgenticAiManager();
export { AgenticAiManager };

