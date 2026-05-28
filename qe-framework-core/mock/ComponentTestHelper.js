import mockDataManager from './MockDataManager.js';
import mockServiceInterceptor from './MockServiceInterceptor.js';
import logger from '../logger/Logger.js';

/**
 * ComponentTestHelper - Utilities for component-level UI testing with mock data
 * Provides convenient methods to setup, execute, and verify component tests
 */
class ComponentTestHelper {
  /**
   * Initialize mock data mode for component testing
   * @param {Page} page - Playwright page object
   * @param {Object} options - Configuration options
   */
  async initializeMockMode(page, options = {}) {
    logger.info('Initializing component test mode with mock data');

    // Enable mock data manager
    mockDataManager.enable();

    // Setup service interception
    await mockServiceInterceptor.setupInterception(page);

    // Load default template if provided
    if (options.template) {
      this.loadTemplate(options.template);
    }

    // Store common options
    this.commonDelay = options.commonDelay || 0;
    this.enableLogging = options.enableLogging !== false;

    logger.info('Mock mode initialization complete');
  }

  /**
   * Stop mock data mode
   */
  stopMockMode() {
    mockDataManager.disable();
    mockServiceInterceptor.clearRoutes();
    logger.info('Mock mode stopped');
  }

  /**
   * Setup a complete mock scenario
   * @param {Object} scenario - Scenario configuration
   */
  setupScenario(scenario) {
    const { name, endpoints, generators, delay = 0 } = scenario;

    logger.info(`Setting up mock scenario: ${name}`);

    // Register custom generators if provided
    if (generators) {
      for (const [key, generatorConfig] of Object.entries(generators)) {
        if (typeof generatorConfig === 'function') {
          mockDataManager.registerGenerator(key, generatorConfig);
        } else {
          // Assume it's a template-based generator
          mockDataManager.registerTemplate(key, generatorConfig);
        }
      }
    }

    // Register endpoints
    if (endpoints) {
      for (const endpoint of endpoints) {
        const { url, method = 'GET', response, statusCode = 200, mockDelay = delay } = endpoint;
        mockServiceInterceptor.registerRoute(url, response, {
          method,
          statusCode,
          delay: mockDelay,
        });
      }
    }

    logger.info(`Scenario setup complete: ${name}`);
  }

  /**
   * Register a mock API endpoint with generated data
   * @param {string} endpoint - API endpoint path
   * @param {string} generatorKey - Generator to use for creating data
   * @param {Object} options - Options for generator and endpoint
   */
  registerMockEndpoint(endpoint, generatorKey, options = {}) {
    const { generatorOptions = {}, statusCode = 200, delay = this.commonDelay, method = 'GET' } = options;

    const mockData = mockDataManager.generate(generatorKey, generatorOptions);

    mockServiceInterceptor.registerRoute(endpoint, mockData, {
      method,
      statusCode,
      delay,
    });

    logger.debug(`Registered mock endpoint: ${method} ${endpoint}`);
  }

  /**
   * Register multiple mock endpoints
   * @param {Object} endpointMap - Map of endpoint to generator configuration
   */
  registerMockEndpoints(endpointMap) {
    for (const [endpoint, config] of Object.entries(endpointMap)) {
      const { generator, options = {} } = config;
      this.registerMockEndpoint(endpoint, generator, options);
    }
  }

  /**
   * Create mock data for a component
   * @param {string} dataType - Type of data to generate (user, customer, order, etc.)
   * @param {Object} options - Customization options
   */
  createMockData(dataType, options = {}) {
    return mockDataManager.generate(dataType, options);
  }

  /**
   * Create multiple mock items
   * @param {string} dataType - Type of data
   * @param {number} count - Number of items to create
   * @param {Object} options - Customization options
   */
  createMockDataList(dataType, count, options = {}) {
    return mockDataManager.generate('list', {
      type: dataType,
      count,
      ...options,
    });
  }

  /**
   * Load a mock data template and register its endpoints
   * @param {string} templateName - Template name
   */
  loadTemplate(templateName) {
    const template = mockDataManager.loadTemplate(templateName);
    if (template) {
      this.setupScenario(template);
      return template;
    }
    logger.warn(`Template not found: ${templateName}`);
    return null;
  }

  /**
   * Create error mock response
   * @param {Object} errorOptions - Error configuration
   */
  createErrorResponse(errorOptions = {}) {
    return mockDataManager.generate('error', errorOptions);
  }

  /**
   * Register a dynamic endpoint that uses a function to generate responses
   * @param {Function} matcherFn - Function to match requests
   * @param {Function} responseFn - Function to generate responses
   * @param {Object} options - Options (statusCode, delay)
   */
  registerDynamicEndpoint(matcherFn, responseFn, options = {}) {
    mockServiceInterceptor.registerMatcher(matcherFn, responseFn, {
      statusCode: options.statusCode || 200,
      delay: options.delay || this.commonDelay,
    });
  }

  /**
   * Verify a component with mock data
   * @param {Page} page - Playwright page
   * @param {Object} verifyConfig - Verification configuration
   */
  async verifyComponentWithMocks(page, verifyConfig) {
    const { selector, expectedText, expectedCount, shouldBeVisible = true } = verifyConfig;

    logger.info(`Verifying component: ${selector}`);

    try {
      const elements = await page.locator(selector).all();

      if (expectedCount !== undefined) {
        if (elements.length !== expectedCount) {
          throw new Error(`Expected ${expectedCount} elements, found ${elements.length}`);
        }
        logger.debug(`Component count verified: ${expectedCount}`);
      }

      if (shouldBeVisible) {
        const isVisible = await page.locator(selector).isVisible();
        if (!isVisible) {
          throw new Error(`Component not visible: ${selector}`);
        }
        logger.debug(`Component visibility verified`);
      }

      if (expectedText) {
        const actualText = await page.locator(selector).textContent();
        if (!actualText.includes(expectedText)) {
          throw new Error(`Expected text "${expectedText}" not found. Actual: "${actualText}"`);
        }
        logger.debug(`Component text verified: ${expectedText}`);
      }

      logger.info(`Component verification passed: ${selector}`);
      return true;
    } catch (error) {
      logger.error(`Component verification failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get mock statistics
   */
  getMockStats() {
    return {
      mockData: mockDataManager.getStats(),
      interception: mockServiceInterceptor.getStats(),
    };
  }

  /**
   * Clear all mock data and routes
   */
  clearAllMocks() {
    mockDataManager.clearAll();
    mockServiceInterceptor.clearRoutes();
    logger.info('All mocks cleared');
  }

  /**
   * Print mock statistics (useful for debugging)
   */
  printMockStats() {
    const stats = this.getMockStats();
    logger.info('=== MOCK DATA STATISTICS ===');
    logger.info(`Mock Data Endpoints: ${stats.mockData.totalEndpoints}`);
    logger.info(`Intercepted Routes: ${stats.interception.registeredRoutes}`);
    logger.info(`Custom Matchers: ${stats.interception.customMatchers}`);
    stats.mockData.endpoints.forEach((ep) => {
      logger.debug(`  - ${ep.endpoint} (calls: ${ep.callCount})`);
    });
  }
}

export default new ComponentTestHelper();
