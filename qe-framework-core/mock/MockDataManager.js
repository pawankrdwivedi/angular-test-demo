import { faker } from '@faker-js/faker';
import logger from '../logger/Logger.js';

/**
 * MockDataManager - Centralized mock data management for component testing
 * Generates realistic test data when backend is unavailable
 */
class MockDataManager {
  constructor() {
    this.mockStore = new Map();
    this.templates = new Map();
    this.customGenerators = new Map();
    this.isEnabled = false;
  }

  /**
   * Enable mock data mode
   */
  enable() {
    this.isEnabled = true;
    logger.info('Mock Data Manager enabled');
  }

  /**
   * Disable mock data mode
   */
  disable() {
    this.isEnabled = false;
    logger.info('Mock Data Manager disabled');
  }

  /**
   * Check if mock data is enabled
   */
  isActive() {
    return this.isEnabled;
  }

  /**
   * Register a custom data generator function
   * @param {string} key - Unique identifier for the generator
   * @param {Function} generatorFn - Function that generates mock data
   */
  registerGenerator(key, generatorFn) {
    this.customGenerators.set(key, generatorFn);
    logger.debug(`Registered custom generator: ${key}`);
  }

  /**
   * Generate mock data using a registered generator
   * @param {string} key - Generator key
   * @param {Object} options - Generator options
   */
  generate(key, options = {}) {
    if (this.customGenerators.has(key)) {
      const generator = this.customGenerators.get(key);
      const data = generator(options);
      logger.debug(`Generated mock data for: ${key}`);
      return data;
    }
    logger.warn(`Generator not found: ${key}`);
    return null;
  }

  /**
   * Store mock data response
   * @param {string} endpoint - API endpoint path
   * @param {Object} data - Mock data to store
   * @param {Object} options - Storage options (method, statusCode, delay)
   */
  storeMockResponse(endpoint, data, options = {}) {
    const mockResponse = {
      endpoint,
      data,
      statusCode: options.statusCode || 200,
      delay: options.delay || 0,
      method: options.method || 'GET',
      timestamp: new Date(),
      callCount: 0,
    };
    this.mockStore.set(endpoint, mockResponse);
    logger.debug(`Stored mock response for endpoint: ${endpoint}`);
  }

  /**
   * Get stored mock response
   * @param {string} endpoint - API endpoint path
   */
  getMockResponse(endpoint) {
    const response = this.mockStore.get(endpoint);
    if (response) {
      response.callCount++;
      logger.debug(`Retrieved mock response for endpoint: ${endpoint} (${response.callCount} calls)`);
    }
    return response;
  }

  /**
   * Clear all mock data
   */
  clearAll() {
    this.mockStore.clear();
    logger.info('All mock data cleared');
  }

  /**
   * Get mock store statistics
   */
  getStats() {
    const stats = {
      totalEndpoints: this.mockStore.size,
      endpoints: [],
    };
    for (const [endpoint, response] of this.mockStore) {
      stats.endpoints.push({
        endpoint,
        statusCode: response.statusCode,
        callCount: response.callCount,
      });
    }
    return stats;
  }

  /**
   * Load mock data from template
   * @param {string} templateName - Template identifier
   */
  loadTemplate(templateName) {
    if (this.templates.has(templateName)) {
      const template = this.templates.get(templateName);
      logger.info(`Loaded mock data template: ${templateName}`);
      return template;
    }
    logger.warn(`Template not found: ${templateName}`);
    return null;
  }

  /**
   * Register a template
   * @param {string} name - Template name
   * @param {Object} templateData - Template configuration
   */
  registerTemplate(name, templateData) {
    this.templates.set(name, templateData);
    logger.debug(`Registered template: ${name}`);
  }
}

// Default generators
function setupDefaultGenerators(manager) {
  // User generator
  manager.registerGenerator('user', (options = {}) => ({
    id: faker.string.uuid(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email(),
    phone: faker.phone.number(),
    role: options.role || 'user',
    status: options.status || 'active',
    createdAt: faker.date.past(),
    ...options.customFields,
  }));

  // Customer generator
  manager.registerGenerator('customer', (options = {}) => ({
    id: faker.string.uuid(),
    customerId: faker.string.alphanumeric(10).toUpperCase(),
    name: faker.company.name(),
    email: faker.internet.email(),
    phone: faker.phone.number(),
    address: faker.location.streetAddress(),
    city: faker.location.city(),
    state: faker.location.state(),
    zipCode: faker.location.zipCode(),
    country: faker.location.country(),
    status: options.status || 'active',
    createdAt: faker.date.past(),
    lastUpdated: faker.date.recent(),
    ...options.customFields,
  }));

  // Order generator
  manager.registerGenerator('order', (options = {}) => ({
    id: faker.string.uuid(),
    orderId: faker.string.alphanumeric(8).toUpperCase(),
    customerId: options.customerId || faker.string.uuid(),
    status: options.status || 'pending',
    totalAmount: parseFloat(faker.commerce.price({ min: 10, max: 1000 })),
    currency: options.currency || 'USD',
    items: options.itemCount
      ? Array.from({ length: options.itemCount }, () => ({
          id: faker.string.uuid(),
          name: faker.commerce.productName(),
          quantity: faker.number.int({ min: 1, max: 10 }),
          price: parseFloat(faker.commerce.price({ min: 5, max: 500 })),
        }))
      : [],
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...options.customFields,
  }));

  // Product generator
  manager.registerGenerator('product', (options = {}) => ({
    id: faker.string.uuid(),
    sku: faker.string.alphanumeric(10).toUpperCase(),
    name: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
    price: parseFloat(faker.commerce.price({ min: 5, max: 1000 })),
    category: options.category || faker.commerce.department(),
    stock: options.stock || faker.number.int({ min: 0, max: 100 }),
    status: options.status || 'active',
    createdAt: faker.date.past(),
    ...options.customFields,
  }));

  // List/Array generator
  manager.registerGenerator('list', (options = {}) => {
    const { type, count = 5, ...generatorOptions } = options;
    if (!type) return [];
    return Array.from({ length: count }, () => manager.generate(type, generatorOptions));
  });

  // Error response generator
  manager.registerGenerator('error', (options = {}) => ({
    success: false,
    error: {
      code: options.code || 'UNKNOWN_ERROR',
      message: options.message || faker.lorem.sentence(),
      details: options.details || null,
    },
  }));

  logger.debug('Default mock data generators registered');
}

// Export singleton instance
export const mockDataManager = new MockDataManager();
setupDefaultGenerators(mockDataManager);
export default mockDataManager;
