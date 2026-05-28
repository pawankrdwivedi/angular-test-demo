# QE Automation Test Suite Application

This is the consumer test application that holds page objects, features, step definitions, and environment-specific configuration files. It uses the reusable core automation framework package `qe-framework-core`.

---

## Getting Started

### 1. Installation

To install and link the framework core library locally, run npm install in the root of the project:

```bash
npm install
```

This will automatically configure and link the `"qe-framework-core": "file:./framework"` dependency inside the project.

### 2. Configuration Settings

Create or modify settings in the `.env` file or environment-specific YAML configuration files inside `app/config/`:

- **`.env`**: Controls browser, headless, parallel threads, screenshot triggers, video recordings, and trace settings.
- **`app/config/qa.yaml`**: Controls environment endpoints and database configurations.

---

## Creating & Writing Tests

### 1. Page Objects
Create page object models extending the base page from the core:

```javascript
import { BasePage } from 'qe-framework-core';

export class DashboardPage extends BasePage {
  constructor(page) {
    super(page);
    this.header = '.dashboard-header';
  }
}
```

### 2. Cucumber Step Definitions
Use the world context to write steps using unified logs, assertions, and clients:

```javascript
import { Given, Then } from '@cucumber/cucumber';

Then('the dashboard header should be visible', async function () {
  const locator = this.page.locator('.dashboard-header');
  await this.softAssert.assertVisible(locator, 'Verify dashboard header is visible');
});
```

---

## Test Execution Commands

Run your tests using the following standard commands:

```bash
# Run all tests (Cucumber & Playwright Spec tests)
npm run test

# Run only Cucumber BDD tests
npm run test:cucumber

# Run only Playwright Spec tests
npm run test:playwright

# Generate Allure Report
npm run allure:generate

# Open Allure Report
npm run allure:open
```
