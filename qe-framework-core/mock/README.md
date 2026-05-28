# Mock Data Framework - README

## Quick Overview

The Mock Data Framework enables **component-level UI testing** using realistic mock data when backend services are unavailable. Perfect for:

✅ Parallel development (UI + Backend teams)  
✅ Isolated component testing  
✅ Testing error scenarios  
✅ Faster, more reliable test execution  
✅ Network latency simulation

## Files

| File | Purpose |
|------|---------|
| `MockDataManager.js` | Generate and manage mock data |
| `MockServiceInterceptor.js` | Intercept HTTP requests, serve mock responses |
| `ComponentTestHelper.js` | High-level utilities for setup & verification |
| `MockDataTemplates.js` | Pre-built scenarios (ecommerce, dashboard, etc.) |
| `ComponentTestingExamples.js` | 10 practical examples |

## 30-Second Quick Start

```javascript
import componentTestHelper from './framework/mock/ComponentTestHelper.js';

// Setup
await componentTestHelper.initializeMockMode(page);

// Register mock endpoint
componentTestHelper.registerMockEndpoint('/api/users', 'user', {
  statusCode: 200,
  delay: 100
});

// Navigate and test
await page.goto('http://localhost:3000/users');
const isVisible = await page.locator('.user-list').isVisible();
```

## 5-Minute Tutorial

### Step 1: Initialize Mock Mode

```javascript
await componentTestHelper.initializeMockMode(page, {
  enableLogging: true
});
```

### Step 2: Choose Your Approach

**Option A - Use Pre-built Templates** (Fastest)
```javascript
await componentTestHelper.setupScenario(
  mockDataTemplates.getTemplate('ecommerce')
);
// Automatically sets up products, customers, orders
```

**Option B - Register Specific Endpoints**
```javascript
componentTestHelper.registerMockEndpoints({
  '/api/users': { generator: 'user' },
  '/api/products': { generator: 'product' },
  '/api/orders': { generator: 'order' }
});
```

**Option C - Dynamic Responses**
```javascript
componentTestHelper.registerDynamicEndpoint(
  (url) => url.includes('/api/search'),
  (context) => {
    const query = new URL(context.url, 'http://localhost')
      .searchParams.get('q');
    return {
      results: componentTestHelper.createMockDataList('product', 5)
    };
  }
);
```

### Step 3: Test Your Component

```javascript
await page.goto('http://localhost:3000/users');
await componentTestHelper.verifyComponentWithMocks(page, {
  selector: '.user-list',
  expectedCount: 10
});
```

## Built-in Data Generators

| Generator | Data Type |
|-----------|-----------|
| `user` | User profiles |
| `customer` | Customer data |
| `product` | Product catalog |
| `order` | Orders with items |
| `list` | Array of any type |
| `error` | Error responses |

Example:
```javascript
const user = componentTestHelper.createMockData('user', {
  role: 'admin'
});
// { id, firstName, lastName, email, role, ... }

const products = componentTestHelper.createMockDataList('product', 10);
// Array of 10 products
```

## Pre-built Templates

| Template | Use Case |
|----------|----------|
| `ecommerce` | Products, customers, orders |
| `userManagement` | Users, authentication |
| `dashboard` | Analytics, metrics, charts |
| `cms` | Articles, pages, content |
| `searchFilter` | Search results, pagination |
| `errorHandling` | Error scenarios (404, 401, 500) |

## Cucumber/Gherkin Example

```gherkin
Feature: Component Testing

  Background:
    Given user launches application
    When user initializes mock data mode

  @component @mock
  Scenario: Test product list with mock data
    When user registers mock endpoint "/api/products" with generator "product"
    And user navigates to products page
    Then component ".product-list" should be visible
    And component ".product-item" should have 10 items
```

## Common Patterns

### Simulate Network Delay
```javascript
componentTestHelper.registerMockEndpoint('/api/data', 'product', {
  delay: 2000  // 2 second delay
});
```

### Test Error Responses
```javascript
mockServiceInterceptor.registerRoute(
  '/api/users',
  mockDataManager.generate('error', { code: 'NOT_FOUND' }),
  { statusCode: 404 }
);
```

### Create Custom Generator
```javascript
mockDataManager.registerGenerator('employee', (options) => ({
  id: faker.string.uuid(),
  name: faker.person.fullName(),
  department: options.department || 'Engineering',
  email: faker.internet.email(),
  salary: options.salary || 100000
}));

const emp = mockDataManager.generate('employee', { department: 'Sales' });
```

### Dynamic Pagination
```javascript
componentTestHelper.registerDynamicEndpoint(
  (url) => url.includes('/api/items'),
  (context) => {
    const url = new URL(context.url, 'http://localhost');
    const page = url.searchParams.get('page') || 1;
    const pageSize = url.searchParams.get('pageSize') || 10;
    
    return {
      page,
      pageSize,
      data: componentTestHelper.createMockDataList('product', pageSize),
      total: 100
    };
  }
);
```

## Best Practices

### 1. Use Templates When Possible
```javascript
// ✅ Good - uses built-in template
await componentTestHelper.setupScenario(
  mockDataTemplates.getTemplate('dashboard')
);

// ❌ Avoid - manual setup
mockServiceInterceptor.registerRoute('/api/metrics', {...});
mockServiceInterceptor.registerRoute('/api/charts', {...});
```

### 2. Separate Mock Tests
```gherkin
# ✅ Clear tags for organization
@mock @component
Scenario: ...

# ✅ vs integration tests
@integration @e2e
Scenario: ...
```

### 3. Clean Up After Tests
```javascript
After(async function() {
  if (mockDataManager.isActive()) {
    componentTestHelper.stopMockMode();
  }
});
```

### 4. Use Realistic Data
```javascript
// ✅ Mock data mimics real backend structure
const customer = componentTestHelper.createMockData('customer');
// { id, customerId, name, email, address, city, country, ... }

// ❌ Avoid overly simple data
const customer = { name: 'test' };
```

### 5. Monitor Mock Usage
```javascript
Then('print mock statistics', function() {
  componentTestHelper.printMockStats();
  // Verify mocks are actually being called
});
```

## Debugging

### Check if mock mode is active
```javascript
if (mockDataManager.isActive()) {
  console.log('Mock mode is ON');
} else {
  console.log('Mock mode is OFF');
}
```

### View mock statistics
```javascript
const stats = componentTestHelper.getMockStats();
console.log(stats);
// { mockData: {...}, interception: {...} }
```

### Print all registered mocks
```javascript
componentTestHelper.printMockStats();
// Shows all endpoints and call counts
```

## Running Tests

```bash
# Run all tests (including mock tests)
npm run test:cucumber

# Run only mock component tests
npm run test:cucumber -- --tags @mock

# Run specific component test
npm run test:cucumber -- --tags @component
```

## Integration with Existing Framework

- ✅ Works with Playwright
- ✅ Compatible with Cucumber/Gherkin
- ✅ Integrates with existing BasePage classes
- ✅ Uses same logger as main framework
- ✅ No backend modifications needed

## Advanced Features

### Dynamic Endpoints with Context
```javascript
componentTestHelper.registerDynamicEndpoint(
  (url, method, postData) => method === 'POST',
  (context) => {
    // context = { url, method, postData }
    return { id: faker.string.uuid(), ...context.postData };
  }
);
```

### GraphQL Support
```javascript
componentTestHelper.registerDynamicEndpoint(
  (url) => url.includes('/graphql'),
  (context) => ({
    data: { users: componentTestHelper.createMockDataList('user', 5) }
  })
);
```

### Custom Route Matchers
```javascript
mockServiceInterceptor.registerMatcher(
  (url, method, postData) => {
    // Your custom matching logic
    return url.includes('/custom') && method === 'POST';
  },
  (context) => {
    // Your response generation
    return { /* response */ };
  }
);
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Mock not responding | Check if mock mode is enabled: `mockDataManager.isActive()` |
| Wrong data structure | Create custom generator to match your API schema |
| Slow tests | Reduce `delay` value in endpoint registration |
| Endpoint not matching | Use `printMockStats()` to verify registered routes |

## Examples

See `framework/mock/ComponentTestingExamples.js` for:
1. Basic product list
2. E-commerce checkout
3. Authentication flow
4. Error handling
5. Dynamic pagination
6. Custom generators
7. Form validation
8. Search functionality
9. Dashboard analytics
10. Network latency simulation

Run examples:
```javascript
import { runAllExamples } from './framework/mock/ComponentTestingExamples.js';
await runAllExamples();
```

## Support

- 📖 Full guide: See `COMPONENT_TESTING_GUIDE.md`
- 💻 Examples: See `framework/mock/ComponentTestingExamples.js`
- 📝 Feature file: See `app/features/component-testing-mock.feature`
- 🔧 Steps: See `app/step_definition/component-mock-steps.js`

## Key Takeaways

✅ **Enable mock mode** with one line  
✅ **Choose your approach** - templates, endpoints, or dynamic  
✅ **Register API endpoints** with realistic data  
✅ **Test components** in isolation  
✅ **Verify results** with built-in helpers  
✅ **Monitor usage** with statistics

Ready to test? Start with the 30-second quick start above! 🚀
