import { When, Then, Before, After } from '@cucumber/cucumber';
import { componentTestHelper, mockDataManager, mockDataTemplates, logger } from 'qe-framework-core';

/**
 * Step definitions for component testing with mock data
 * These steps demonstrate how to use the mock data framework
 */

Before(async function () {
  // Store mock helpers in world context for steps
  this.componentTestHelper = componentTestHelper;
  this.mockDataManager = mockDataManager;
  this.mockDataTemplates = mockDataTemplates;
});

After(async function () {
  // Cleanup after each scenario
  if (mockDataManager.isActive()) {
    componentTestHelper.stopMockMode();
  }
});

// ============= MOCK MODE SETUP STEPS =============

When('user initializes mock data mode', async function () {
  await componentTestHelper.initializeMockMode(this.page, {
    enableLogging: true,
  });
});

When('user initializes mock data mode with template {string}', async function (templateName) {
  await componentTestHelper.initializeMockMode(this.page, {
    template: templateName,
    enableLogging: true,
  });
});

When('user sets up mock scenario {string}', async function (scenarioName) {
  const scenario = this.mockDataTemplates.getTemplate(scenarioName);
  if (!scenario) {
    throw new Error(`Mock scenario not found: ${scenarioName}`);
  }
  componentTestHelper.setupScenario(scenario);
});

When('user registers mock endpoint {string} with generator {string}', async function (endpoint, generator) {
  componentTestHelper.registerMockEndpoint(endpoint, generator, {
    statusCode: 200,
    delay: 100,
  });
});

When('user registers mock endpoint {string} with generator {string} and status code {int}', async function (
  endpoint,
  generator,
  statusCode
) {
  componentTestHelper.registerMockEndpoint(endpoint, generator, {
    statusCode,
    delay: 100,
  });
});

// ============= MOCK DATA GENERATION STEPS =============

When('user generates mock data of type {string}', async function (dataType) {
  this.mockData = componentTestHelper.createMockData(dataType);
  logger.info(`Generated mock data: ${JSON.stringify(this.mockData)}`);
});

When('user generates {int} mock items of type {string}', async function (count, dataType) {
  this.mockDataList = componentTestHelper.createMockDataList(dataType, count);
  logger.info(`Generated ${count} mock items of type ${dataType}`);
});

When('user generates mock error response with code {string}', async function (errorCode) {
  this.errorResponse = componentTestHelper.createErrorResponse({
    code: errorCode,
    message: `Error: ${errorCode}`,
  });
});

// ============= ENDPOINT REGISTRATION STEPS =============

When('user registers mock endpoints', async function (dataTable) {
  const endpointMap = {};
  for (const row of dataTable.hashes()) {
    endpointMap[row.endpoint] = {
      generator: row.generator,
      options: { statusCode: parseInt(row.statusCode || '200') },
    };
  }
  componentTestHelper.registerMockEndpoints(endpointMap);
});

When('user registers mock endpoint {string} with JSON response', async function (endpoint, jsonString) {
  const response = JSON.parse(jsonString);
  mockDataManager.storeMockResponse(endpoint, response, {
    statusCode: 200,
    delay: 100,
  });
});

// ============= DYNAMIC MOCK ENDPOINT STEPS =============

When('user registers dynamic endpoint that returns current time', async function () {
  componentTestHelper.registerDynamicEndpoint(
    (url) => url.includes('/api/time'),
    () => ({
      timestamp: new Date().toISOString(),
      unix: Math.floor(Date.now() / 1000),
    })
  );
});

When('user registers dynamic endpoint for paginated list {string}', async function (dataType) {
  componentTestHelper.registerDynamicEndpoint(
    (url) => url.includes('/api/list') || url.includes('/api/' + dataType),
    (context) => {
      const url = new URL(context.url, 'http://localhost');
      const page = parseInt(url.searchParams.get('page') || '1');
      const pageSize = parseInt(url.searchParams.get('pageSize') || '10');

      return {
        success: true,
        page,
        pageSize,
        data: componentTestHelper.createMockDataList(dataType, pageSize),
        total: 100,
        totalPages: Math.ceil(100 / pageSize),
      };
    }
  );
});

// ============= VERIFICATION STEPS =============

Then('mock data should have been generated', function () {
  if (!this.mockData) {
    throw new Error('Mock data was not generated');
  }
});

Then('mock data should contain field {string}', function (fieldName) {
  if (!this.mockData || !(fieldName in this.mockData)) {
    throw new Error(`Field "${fieldName}" not found in mock data`);
  }
});

Then('mock data list should contain {int} items', function (expectedCount) {
  if (!this.mockDataList || this.mockDataList.length !== expectedCount) {
    throw new Error(`Expected ${expectedCount} items, got ${this.mockDataList?.length || 0}`);
  }
});

Then('component {string} should be visible', async function (selector) {
  const isVisible = await this.page.locator(selector).isVisible();
  if (!isVisible) {
    throw new Error(`Component not visible: ${selector}`);
  }
});

Then('component {string} should have text {string}', async function (selector, expectedText) {
  const element = this.page.locator(selector);
  const actualText = await element.textContent();
  if (!actualText.includes(expectedText)) {
    throw new Error(`Expected text not found. Expected: "${expectedText}", Actual: "${actualText}"`);
  }
});

Then('component {string} should have {int} items', async function (selector, expectedCount) {
  const count = await this.page.locator(selector).count();
  if (count !== expectedCount) {
    throw new Error(`Expected ${expectedCount} items, found ${count}`);
  }
});

Then('error response should have code {string}', function (errorCode) {
  if (!this.errorResponse || this.errorResponse.error.code !== errorCode) {
    throw new Error(`Error code mismatch. Expected: "${errorCode}", Got: "${this.errorResponse?.error?.code}"`);
  }
});

// ============= DEBUG AND STATS STEPS =============

Then('print mock statistics', function () {
  componentTestHelper.printMockStats();
});

When('user clears all mock data', function () {
  componentTestHelper.clearAllMocks();
});

Then('mock mode should be active', function () {
  if (!mockDataManager.isActive()) {
    throw new Error('Mock mode is not active');
  }
});

Then('mock mode should be inactive', function () {
  if (mockDataManager.isActive()) {
    throw new Error('Mock mode is still active');
  }
});

// ============= TEMPLATE STEPS =============

When('user lists available mock templates', function () {
  const templates = mockDataTemplates.listTemplates();
  logger.info(`Available templates: ${JSON.stringify(templates, null, 2)}`);
  this.templates = templates;
});

Then('at least {int} mock templates should be available', function (minCount) {
  if (!this.templates || this.templates.length < minCount) {
    throw new Error(`Expected at least ${minCount} templates, got ${this.templates?.length || 0}`);
  }
});
