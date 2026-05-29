/**
 * Component Testing Examples
 * Practical examples demonstrating how to use the mock data framework
 */

import { Before } from '@cucumber/cucumber';
import browserManager from '../browser/BrowserManager.js';
import componentTestHelper from './ComponentTestHelper.js';
import mockDataManager from './MockDataManager.js';
import mockServiceInterceptor from './MockServiceInterceptor.js';
import mockDataTemplates from './MockDataTemplates.js';
import logger from '../logger/Logger.js';
import configManager from '../config/ConfigManager.js';

function getConfiguredTimeout() {
  return configManager.getExecutionConfig().timeout;
}

/**
 * EXAMPLE 1: Basic Product List Component Test
 */
export async function example1_BasicProductList() {
  const { page } = await browserManager.getBrowserContext();

  // Initialize mock mode
  await componentTestHelper.initializeMockMode(page);

  // Create mock product data
  const mockProducts = componentTestHelper.createMockDataList('product', 10, {
    category: 'Electronics',
  });

  // Store as mock response
  mockServiceInterceptor.registerRoute('/api/products', mockProducts, {
    statusCode: 200,
    delay: 100,
  });

  // Navigate to page
  await page.goto('http://localhost:3000/products');

  // Wait for products to load
  await page.waitForSelector('.product-item', { timeout: getConfiguredTimeout() });

  // Verify component
  const productItems = await page.locator('.product-item').count();
  if (productItems === 10) {
    logger.info('✓ Product list component test passed');
  }
}

/**
 * EXAMPLE 2: E-Commerce Checkout Flow
 */
export async function example2_EcommerceCheckout() {
  const { page } = await browserManager.getBrowserContext();

  // Initialize with template
  await componentTestHelper.initializeMockMode(page, {
    template: 'ecommerce',
  });

  // The ecommerce template automatically sets up:
  // - /api/products (list of products)
  // - /api/customers (list of customers)
  // - /api/orders (list of orders)

  // Step 1: Browse products
  await page.goto('http://localhost:3000/shop');
  const productCount = await page.locator('.product-card').count();
  logger.info(`Found ${productCount} products`);

  // Step 2: Add to cart
  await page.click('.product-card:first-child button[data-action="add-to-cart"]');

  // Step 3: View cart
  await page.goto('http://localhost:3000/cart');
  await page.waitForSelector('.cart-item');

  // Step 4: Checkout
  const mockOrder = componentTestHelper.createMockData('order', {
    status: 'completed',
    itemCount: 1,
  });

  mockServiceInterceptor.registerRoute('/api/checkout', mockOrder, {
    statusCode: 201,
    delay: 500, // Simulate processing time
  });

  await page.click('button:has-text("Checkout")');
  await page.waitForURL('**/order-confirmation/**');

  logger.info('✓ E-commerce checkout flow test passed');
}

/**
 * EXAMPLE 3: User Authentication Flow
 */
export async function example3_AuthenticationFlow() {
  const { page } = await browserManager.getBrowserContext();

  await componentTestHelper.initializeMockMode(page);

  // Setup login endpoint
  mockServiceInterceptor.registerRoute(
    '/api/auth/login',
    {
      success: true,
      token: 'mock-jwt-token-abc123',
      user: componentTestHelper.createMockData('user', {
        role: 'admin',
      }),
    },
    { statusCode: 200, delay: 200 }
  );

  // Setup protected resource endpoint
  mockServiceInterceptor.registerRoute(
    '/api/user/profile',
    componentTestHelper.createMockData('user', { role: 'admin' }),
    { statusCode: 200 }
  );

  // Navigate to login
  await page.goto('http://localhost:3000/login');

  // Fill credentials
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');

  // Submit login
  await page.click('button[type="submit"]');

  // Verify redirect to dashboard
  await page.waitForURL('**/dashboard/**');
  logger.info('✓ Authentication flow test passed');
}

/**
 * EXAMPLE 4: Error Handling
 */
export async function example4_ErrorHandling() {
  const { page } = await browserManager.getBrowserContext();

  await componentTestHelper.initializeMockMode(page);

  // Mock a 404 error
  mockServiceInterceptor.registerRoute(
    '/api/users/invalid-id',
    componentTestHelper.createErrorResponse({
      code: 'NOT_FOUND',
      message: 'User not found',
    }),
    { statusCode: 404 }
  );

  // Mock a 500 error
  mockServiceInterceptor.registerRoute(
    '/api/data/corrupt',
    componentTestHelper.createErrorResponse({
      code: 'SERVER_ERROR',
      message: 'Internal server error',
    }),
    { statusCode: 500 }
  );

  // Test 404 handling
  await page.goto('http://localhost:3000/users/invalid-id');
  const errorMsg = await page.locator('.error-message').textContent();
  if (errorMsg.includes('Not Found')) {
    logger.info('✓ 404 error handling test passed');
  }

  // Test 500 handling
  await page.goto('http://localhost:3000/data/corrupt');
  const serverErrorMsg = await page.locator('.error-message').textContent();
  if (serverErrorMsg.includes('Internal server error')) {
    logger.info('✓ 500 error handling test passed');
  }
}

/**
 * EXAMPLE 5: Dynamic Pagination
 */
export async function example5_DynamicPagination() {
  const { page } = await browserManager.getBrowserContext();

  await componentTestHelper.initializeMockMode(page);

  // Register dynamic endpoint that handles pagination
  componentTestHelper.registerDynamicEndpoint(
    (url) => url.includes('/api/products'),
    (context) => {
      const urlObj = new URL(context.url, 'http://localhost');
      const page = parseInt(urlObj.searchParams.get('page') || '1');
      const pageSize = parseInt(urlObj.searchParams.get('pageSize') || '10');

      return {
        success: true,
        page,
        pageSize,
        data: componentTestHelper.createMockDataList('product', pageSize),
        total: 100,
        totalPages: Math.ceil(100 / pageSize),
      };
    },
    { delay: 150 }
  );

  // Test first page
  await page.goto('http://localhost:3000/products?page=1');
  await page.waitForSelector('.product-item');
  const page1Items = await page.locator('.product-item').count();
  logger.info(`Page 1 items: ${page1Items}`);

  // Test second page
  await page.goto('http://localhost:3000/products?page=2');
  const page2Items = await page.locator('.product-item').count();
  logger.info(`Page 2 items: ${page2Items}`);

  logger.info('✓ Dynamic pagination test passed');
}

/**
 * EXAMPLE 6: Custom Data Generator
 */
export async function example6_CustomDataGenerator() {
  // Register custom generator for domain-specific data
  mockDataManager.registerGenerator('employeeData', (options = {}) => ({
    id: Math.random().toString(36).substr(2, 9),
    firstName: 'John',
    lastName: 'Doe',
    email: `john.doe@company.com`,
    department: options.department || 'Engineering',
    salary: options.salary || 100000,
    reportingManager: options.reportingManager || 'Jane Smith',
    joinDate: new Date(2020, 0, 1).toISOString(),
    status: options.status || 'active',
  }));

  // Use custom generator
  const employee = mockDataManager.generate('employeeData', {
    department: 'Sales',
  });

  logger.info(`Generated employee: ${employee.firstName} ${employee.lastName} from ${employee.department}`);
  logger.info('✓ Custom generator test passed');
}

/**
 * EXAMPLE 7: Form Validation with Mock Data
 */
export async function example7_FormValidation() {
  const { page } = await browserManager.getBrowserContext();

  await componentTestHelper.initializeMockMode(page);

  // Mock form validation endpoint
  mockServiceInterceptor.registerRoute(
    '/api/validate/contact-form',
    {
      isValid: true,
      errors: {},
    },
    { statusCode: 200, delay: 100 }
  );

  // Mock form submission endpoint
  mockServiceInterceptor.registerRoute(
    '/api/submit/contact-form',
    {
      success: true,
      message: 'Form submitted successfully',
      id: Math.random().toString(36).substr(2, 9),
    },
    { statusCode: 201, delay: 300 }
  );

  // Navigate to form
  await page.goto('http://localhost:3000/contact');

  // Fill form
  await page.fill('input[name="name"]', 'John Doe');
  await page.fill('input[name="email"]', 'john@example.com');
  await page.fill('textarea[name="message"]', 'Test message');

  // Submit
  await page.click('button[type="submit"]');

  // Verify success
  await page.waitForSelector('.success-message');
  logger.info('✓ Form validation test passed');
}

/**
 * EXAMPLE 8: Search with Mock Data
 */
export async function example8_SearchFunctionality() {
  const { page } = await browserManager.getBrowserContext();

  await componentTestHelper.initializeMockMode(page);

  // Register dynamic search endpoint
  componentTestHelper.registerDynamicEndpoint(
    (url) => url.includes('/api/search'),
    (context) => {
      const urlObj = new URL(context.url, 'http://localhost');
      const query = urlObj.searchParams.get('q') || '';

      return {
        success: true,
        query,
        results: componentTestHelper.createMockDataList('product', 5, {
          category: 'Search Results',
        }),
        total: 5,
      };
    }
  );

  // Navigate to search page
  await page.goto('http://localhost:3000/search');

  // Enter search query
  await page.fill('input[name="search"]', 'laptop');
  await page.press('input[name="search"]', 'Enter');

  // Wait for results
  await page.waitForSelector('.search-result');
  const resultCount = await page.locator('.search-result').count();

  if (resultCount > 0) {
    logger.info(`✓ Search functionality test passed - Found ${resultCount} results`);
  }
}

/**
 * EXAMPLE 9: Dashboard with Analytics
 */
export async function example9_DashboardAnalytics() {
  const { page } = await browserManager.getBrowserContext();

  // Use dashboard template
  await componentTestHelper.initializeMockMode(page, {
    template: 'dashboard',
  });

  // Navigate to dashboard
  await page.goto('http://localhost:3000/dashboard');

  // Wait for all components
  await page.waitForSelector('.dashboard-widget', { timeout: getConfiguredTimeout() });

  // Verify metric cards
  const metrics = await page.locator('.metric-value').allTextContents();
  logger.info(`Dashboard metrics: ${metrics.join(', ')}`);

  // Verify chart exists
  const chartExists = await page.locator('canvas').isVisible();
  if (chartExists) {
    logger.info('✓ Dashboard analytics test passed');
  }
}

/**
 * EXAMPLE 10: Network Latency Simulation
 */
export async function example10_NetworkLatency() {
  const { page } = await browserManager.getBrowserContext();

  await componentTestHelper.initializeMockMode(page);

  // Register slow endpoint
  mockServiceInterceptor.registerRoute(
    '/api/slow-data',
    componentTestHelper.createMockDataList('product', 10),
    {
      statusCode: 200,
      delay: 3000, // 3 seconds
    }
  );

  // Register fast endpoint
  mockServiceInterceptor.registerRoute(
    '/api/fast-data',
    componentTestHelper.createMockDataList('product', 10),
    {
      statusCode: 200,
      delay: 0, // No delay
    }
  );

  const startTime = Date.now();
  await page.goto('http://localhost:3000/slow-data');
  await page.waitForSelector('[data-loaded="true"]');
  const slowLoadTime = Date.now() - startTime;

  const startTime2 = Date.now();
  await page.goto('http://localhost:3000/fast-data');
  await page.waitForSelector('[data-loaded="true"]');
  const fastLoadTime = Date.now() - startTime2;

  logger.info(`Slow load: ${slowLoadTime}ms, Fast load: ${fastLoadTime}ms`);
  logger.info('✓ Network latency simulation test passed');
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  try {
    logger.info('Starting component testing examples...\n');

    logger.info('Example 1: Basic Product List');
    await example1_BasicProductList();

    logger.info('\nExample 2: E-Commerce Checkout');
    await example2_EcommerceCheckout();

    logger.info('\nExample 3: Authentication Flow');
    await example3_AuthenticationFlow();

    logger.info('\nExample 4: Error Handling');
    await example4_ErrorHandling();

    logger.info('\nExample 5: Dynamic Pagination');
    await example5_DynamicPagination();

    logger.info('\nExample 6: Custom Data Generator');
    await example6_CustomDataGenerator();

    logger.info('\nExample 7: Form Validation');
    await example7_FormValidation();

    logger.info('\nExample 8: Search Functionality');
    await example8_SearchFunctionality();

    logger.info('\nExample 9: Dashboard Analytics');
    await example9_DashboardAnalytics();

    logger.info('\nExample 10: Network Latency');
    await example10_NetworkLatency();

    logger.info('\n✅ All examples completed successfully!');
  } catch (error) {
    logger.error(`Error running examples: ${error.message}`);
  }
}
