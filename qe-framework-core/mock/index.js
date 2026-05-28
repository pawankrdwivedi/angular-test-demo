/**
 * Mock Data Framework - Main Export
 * Provides unified access to all mock testing utilities
 */

export { default as mockDataManager } from './MockDataManager.js';
export { default as mockServiceInterceptor } from './MockServiceInterceptor.js';
export { default as componentTestHelper } from './ComponentTestHelper.js';
export { default as mockDataTemplates } from './MockDataTemplates.js';

// Export classes for direct use if needed
export { MockDataManager } from './MockDataManager.js';
export { MockServiceInterceptor } from './MockServiceInterceptor.js';
export { ComponentTestHelper } from './ComponentTestHelper.js';
export { MockDataTemplates } from './MockDataTemplates.js';

/**
 * Convenience export for common usage patterns
 */
export const MockFramework = {
  // Initialize mock mode for a page
  async initMockMode(page, options = {}) {
    const { componentTestHelper } = await import('./ComponentTestHelper.js');
    return componentTestHelper.initializeMockMode(page, options);
  },

  // Setup a pre-built template
  setupTemplate(templateName) {
    const { mockDataTemplates } = await import('./MockDataTemplates.js');
    const { componentTestHelper } = await import('./ComponentTestHelper.js');
    const template = mockDataTemplates.getTemplate(templateName);
    if (template) {
      componentTestHelper.setupScenario(template);
      return template;
    }
    return null;
  },

  // Create mock data
  createMockData(dataType, options = {}) {
    const { componentTestHelper } = await import('./ComponentTestHelper.js');
    return componentTestHelper.createMockData(dataType, options);
  },

  // Register endpoint
  registerEndpoint(url, generator, options = {}) {
    const { componentTestHelper } = await import('./ComponentTestHelper.js');
    return componentTestHelper.registerMockEndpoint(url, generator, options);
  },

  // Stop mock mode
  async stopMocking() {
    const { componentTestHelper } = await import('./ComponentTestHelper.js');
    componentTestHelper.stopMockMode();
  },

  // Get statistics
  async getStats() {
    const { componentTestHelper } = await import('./ComponentTestHelper.js');
    return componentTestHelper.getMockStats();
  },

  // List available templates
  async listTemplates() {
    const { mockDataTemplates } = await import('./MockDataTemplates.js');
    return mockDataTemplates.listTemplates();
  },
};

export default MockFramework;
