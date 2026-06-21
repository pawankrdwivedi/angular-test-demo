# 🚀 Enterprise-Grade Playwright + Cucumber BDD Test Automation Framework

This repository houses a production-ready, highly scalable, enterprise-grade test automation framework built using **Playwright**, **Cucumber BDD**, and **Node.js**.

It is structured to enforce a strict separation of concerns, featuring a generic core library layer (`qe-framework-core`) and an application-specific test suite layer located under the `src/` directory (containing page objects, feature files, step definitions, and environment-specific configuration files).

---

## 🌟 Framework Core Capabilities

1. **Modular Architecture & Code Split**:
   - `qe-framework-core` (packaged core): Houses generic, reusable modules (logger, API clients, DB wrappers, browser managers, assertions, ETL engines).
   - `src/`: Houses application-specific test assets (YAML configurations, Page Objects, Gherkin features, step definitions).
2. **Angular App Synchronization**: Built-in support for Angular testability checks, detecting `window.getAllAngularTestabilities()` to ensure page stability before interactions, preventing flaky UI tests.
3. **Self-Healing Locator Strategy**: An advanced locator mechanism that automatically falls back to alternative element selectors when the primary selector is broken, emitting details to the framework logger `[SelfHealing]`.
4. **Excel-Driven Test Data**: Dynamic mapping of Cucumber `Scenario Outline` `TestCaseID`s to test data spreadsheets. Values are resolved dynamically based on the current run environment.
5. **Unified Data Reconciliation (ETL)**: High-speed verification engines for files (CSV vs. CSV, CSV vs. DB), handling row counts, detailed cell matches, and mathematical aggregates (SUM, AVG, etc.).
6. **Robust Soft Assertions**: Built-in `SoftAssert` utility allowing multiple assertion checkpoints to run in a single test without halting execution on the first failure.
7. **Environment-Specific YAML Configurations & Centralized Defaults**: Centralized configuration management using a master `.env` file at the project root for common defaults, while environment-specific configurations reside inside `src/config/{env}.yaml`.
8. **Interactive Allure & HTML Reporting**: Built-in support for Allure reports, including screenshot attachments, browser trace logs, and execution video recordings on scenario failures.

---

## 🛠️ Technology Stack

- **Core**: Node.js (ESM), JavaScript, Playwright
- **BDD**: Cucumber.js
- **API**: Axios with AJV (JSON Schema Validation)
- **Database**: `pg` (Postgres), `mysql2` (MySQL), `tedious` (MSSQL), `oracledb` (Oracle)
- **ETL & Data**: `csv-parse`, `xlsx`
- **Config & Logs**: `js-yaml`, `winston`, `dotenv`
- **Reporting**: `allure-playwright`, `allure-cucumberjs`

---

## 📁 Repository Structure

```text
├── src/                        # Main source directory for application test assets
│   ├── config/                 # Environment specific YAML configurations (sit-01, etc.)
│   ├── features/               # Cucumber Gherkin BDD test assets
│   ├── pages/           # Page Object Models extending BasePage
│   ├── step-definitions/        # BDD step definition files
│   ├── support/                # Cucumber environment hooks and World setup
│   ├── test/                   # Playwright Spec hybrid POM tests
│   └── test-data/              # Dynamic Excel spreadsheets & ETL source files
├── docs/                       # Project documentation & guides
├── test_logs/                  # Dynamic execution and self-healing anomaly logs
├── test_results/               # Automated test results (screenshots, traces, videos, and reports)
├── .env                        # Common default execution configurations
├── cucumber.yaml               # Cucumber execution configuration
├── package.json                # Project dependencies and scripts
└── run-tests.js                # Programmatic test runner script
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: `v18.0.0` or higher
- **Java** (Required only for compiling and generating local Allure reports)

### 2. Installation
To install and link the framework core library locally, run `npm install` inside the project root:
```bash
npm install
```
This will automatically configure and link the packaged core library (`"qe-framework-core": "file:qe-framework-core-1.0.10.tgz"`) as a dependency.

Next, download the Playwright browser binaries:
```bash
npx playwright install
```

> [!TIP]
> If you encounter SSL certificate verification issues during browser binaries download, execute:
> ```powershell
> $env:NODE_TLS_REJECT_UNAUTHORIZED='0'
> npx playwright install
> ```

### 3. Configuration Settings
Create or modify configuration settings in the `.env` at the project root or environment-specific YAML files inside `src/config/`:

* **`.env`**: Controls browser engine, headless mode, parallel execution threads, screenshot triggers, video recordings, and trace settings.
  ```env
  # Application Selection
  APP=angular-test-demo
  ENV=sit-01

  # Browser Configuration
  BROWSER=Chrome
  HEADLESS=false
  SLOW_MO=0

  # Execution Settings
  PARALLEL=0
  TIMEOUT=90000
  VIEWPORT_WIDTH=1280
  VIEWPORT_HEIGHT=720
  RETRY=0

  # Screenshot and Video Recording
  # off, on, only-on-failure
  SCREENSHOT=off
  # off, on, retain-on-failure, on-first-retry
  VIDEO=off
  # off, on, retain-on-failure, on-first-retry
  TRACE=off
  # Logging in Files (true/false)
  LOGGER=false
  ```

* **`src/config/{env}.yaml`**: Controls environment-specific service endpoints, base URLs, and database configurations. For example, `src/config/sit-01.yaml`:
  ```yaml
  ui:
    baseUrl: https://angular.io
  api:
    baseUrl: https://angular.io/api
  database:
    host: localhost
    port: 5432
    username: test
    password: [PASSWORD]
    name: automation_qa
    type: postgres  
  ```

### 4. Local Development & Framework Packaging
For local framework development and testing, you can package the core library and reference it directly in the test suite:

1. **Generate the Package**:
   Navigate to the core framework directory and package it:
   ```bash
   cd ../qe-framework-core
   npm install
   npm run pack
   ```
   This compiles, minifies, and packs the framework into a tarball (e.g., `qe-framework-core-1.0.10.tgz`).

2. **Link the Package**:
   Copy the generated tarball to the `angular-test-demo` directory, and install/link it:
   ```bash
   cd ../angular-test-demo
   npm install ./qe-framework-core-1.0.10.tgz
   ```
   This updates the dependency reference in `package.json` to point to the local file:
   ```json
   "dependencies": {
     "qe-framework-core": "file:qe-framework-core-1.0.10.tgz"
   }
   ```
   Now you can import core modules directly:
   ```javascript
   import { excelReader, configManager, ApiClient, dbClient, logger } from 'qe-framework-core';
   ```

---

## ✍️ Creating & Writing Tests

The framework enforces a structured way to write scalable tests using Page Object Models and Cucumber step definitions.

### 1. Page Objects
Create page object models extending `BasePage` from the core library. Use primary selectors and optional fallback arrays to support **Self-Healing**:

```javascript
import { BasePage, logger, configManager } from 'qe-framework-core';

export class AngularDemoPage extends BasePage {
  constructor(page) {
    super(page);
    const uiConfig = configManager.getUiConfig();
    this.searchUrl = uiConfig.baseUrl || 'https://angular.dev';
    
    // Primary selector is defined here
    this.searchButton = 'docs-text-field';
    
    // Fallback selectors are used automatically by the browser manager if the primary selector fails
    this.searchButtonFallbacks = [
      'button[aria-label*="Search" i]',
      'button.adev-nav-button',
      '.DocSearch-Button',
      'button.search-button'
    ];
  }

  async open() {
    await this.navigateTo(this.searchUrl);
    await this.page.waitForLoadState('networkidle');
  }

  async triggerSearch(query) {
    logger.info(`Performing Angular Docs search for: "${query}"`);
    await this.click(this.searchButton, this.searchButtonFallbacks);
  }
}
```

### 2. Cucumber Step Definitions
Write steps using unified assertions, logs, and context clients accessed directly via the Cucumber `World` context (`this`):

```javascript
import { Given, When, Then } from '@cucumber/cucumber';
import { AngularDemoPage } from '../pages/angular-demo-page.js';

When('user navigates to Angular documentation page', async function () {
  this.angularPage = new AngularDemoPage(this.page);
  await this.angularPage.open();
});

When('user searches for query from test data', async function () {
  const query = this.testData?.searchQuery || 'Component';
  await this.angularPage.triggerSearch(query);
});

Then('search result dialog should be visible', async function () {
  const isVisible = await this.angularPage.isSearchResultBoxVisible();
  
  // Use softAssert to record checkpoints without immediately halting execution
  this.softAssert.assertTrue(
    isVisible, 
    'Verify search dropdown modal appears on documentation site'
  );
});
```

---

## 🏃 Test Execution Commands

Run your tests using the custom programmatic runner `run-tests.js` inside the root directory.

### 1. Cucumber BDD Tests
The runner compiles dynamic Excel test data, configures execution environments, and runs Cucumber CLI.

#### **Run all Cucumber BDD tests**
```bash
npm run test:cucumber
```

#### **Run Cucumber BDD tests by Tag**
Runs BDD scenarios matching a specific tag filter:
```bash
npm run test:cucumber:tag -- "@ui"
```

#### **Run Cucumber BDD tests by Feature File**
Runs scenarios targeting a specific feature file:
```bash
npm run test:cucumber:feature -- src/features/ui/demo-ui.feature
```

#### **Run Cucumber BDD tests by Folder**
Runs all Cucumber feature files under a specific directory:
```bash
npm run test:cucumber:folder -- src/features/ui/
```

#### **Specify Environment Overrides**
Specify target environments (e.g. `sit-01`) with any command:
```bash
npm run test:cucumber -- --env=sit-01
```

> [!IMPORTANT]
> **Windows Command Prompt vs PowerShell Quoting Rules:**
> In Windows PowerShell, the `@` symbol is a special character used for splatting. You **must wrap tags in quotes** (e.g. `"@ui"` or `'@ui'`), otherwise PowerShell will throw a `VariableIsUndefined` error.
> - **Windows PowerShell (Quoted):** 
>   ```powershell
>   npm run test:cucumber:tag -- "@ui"
>   ```
> - **Windows Command Prompt (CMD) / Bash (Direct):** 
>   ```cmd
>   npm run test:cucumber:tag -- @ui
>   ```

---

### 2. Playwright Hybrid POM Tests
The framework supports native Playwright tests (located in `src/test/`) using the same page objects, data parsers, and services.

#### **Run all Playwright POM tests**
```bash
npm run test:playwright
```

#### **Run Playwright POM tests by Tag / Grep**
Runs POM tests matching a specific grep search filter:
```bash
npm run test:playwright:tag -- "Execute hybrid"
```

#### **Run Playwright POM tests by Spec File**
Runs POM tests targeting a specific spec file:
```bash
npm run test:playwright:spec -- src/test/hybrid-demo.spec.js
```

#### **Run Playwright POM tests by Folder**
Runs all POM tests under a specific directory:
```bash
npm run test:playwright:folder -- src/test/
```

#### **Interactive Playwright UI Runner**
Runs Playwright tests using the interactive UI panel:
```bash
npm run test:playwright:ui
```

#### **Specify Environment Overrides (Windows vs Bash)**
Specify target environments using the `TEST_ENV` environment variable:
- **Windows PowerShell:**
  ```powershell
  $env:TEST_ENV="sit-01"; npm run test:playwright
  ```
- **Windows Command Prompt (CMD):**
  ```cmd
  set TEST_ENV=sit-01 && npm run test:playwright
  ```
- **Bash / GitLab CI/CD:**
  ```bash
  TEST_ENV=sit-01 npm run test:playwright
  ```

---

## 📊 Viewing Test Reports

After executing tests, you can inspect execution results using various options:

* **Playwright HTML Report**: Open `test_results/reports/playwright-html/index.html` directly in any web browser.
* **Cucumber HTML Report**: Open `test_results/reports/cucumber-report.html` directly in any web browser.
* **Allure Report**:
  ```bash
  # Automatically compiles and displays Allure trend reports
  npm run allure
  ```
* **Playwright Traces**: Go to `https://trace.playwright.dev/` and upload any trace `.zip` file from `test_results/reports/traces/` to visually step through the execution.

---

## 📡 Network Record & Playback Mode

To ensure UI tests remain fully executable and stable even when backend APIs or testing servers are unavailable, the framework includes a built-in **Network Record & Playback Manager**.

This utility intercepts network API traffic (fetch & XHR requests) during live browser runs and can either save them as mocks or serve those mocks transparently to keep the front-end fully functional.

### 1. Enable Recording (Capture Mock Data)
To record all UI network request/response traffic during execution, set the `MOCK_RECORD` environment variable to `true`:
- **Windows PowerShell:**
  ```powershell
  $env:MOCK_RECORD="true"; npm run test "@ui"
  ```
- **Windows Command Prompt (CMD):**
  ```cmd
  set MOCK_RECORD=true && npm run test "@ui"
  ```
- **Bash / Linux:**
  ```bash
  MOCK_RECORD=true npm run test "@ui"
  ```
This automatically captures and categorizes all API responses into scenario-specific records inside `src/test-data/network-mocks.json`.

### 2. Enable Playback (Mock Mode)
When testing in environments where the backend is unstable or offline, execute tests with `MOCK_PLAYBACK` set to `true`:
- **Windows PowerShell:**
  ```powershell
  $env:MOCK_RECORD="false"; $env:MOCK_PLAYBACK="true"; npm run test "@ui"
  ```
- **Windows Command Prompt (CMD):**
  ```cmd
  set MOCK_PLAYBACK=true && npm run test "@ui"
  ```
- **Bash / Linux:**
  ```bash
  MOCK_PLAYBACK=true npm run test "@ui"
  ```
The framework will automatically intercept all Fetch/XHR requests and serve the matching recorded mock responses, enabling offline UI regression testing. If a request is not found in the mock file, it transparently falls back to the live network.

---

## 🚀 GitLab CI/CD Pipeline Integration

Below is a production-ready `.gitlab-ci.yml` pipeline configuration to run the test suite, isolate logs, and compile Allure trend reports:

```yaml
stages:
  - install
  - test
  - report

cache:
  key: ${CI_COMMIT_REF_SLUG}
  paths:
    - node_modules/

install_dependencies:
  stage: install
  image: mcr.microsoft.com/playwright:v1.44.1-jammy
  script:
    - npm ci
    - npx playwright install chromium

run_bdd_tests:
  stage: test
  image: mcr.microsoft.com/playwright:v1.44.1-jammy
  script:
    - npm run test:cucumber
  artifacts:
    when: always
    paths:
      - test_results/
      - test_logs/
    expire_in: 7 days

run_pom_tests:
  stage: test
  image: mcr.microsoft.com/playwright:v1.44.1-jammy
  script:
    - npm run test:playwright
  artifacts:
    when: always
    paths:
      - test_results/
      - test_logs/
    expire_in: 7 days

generate_allure_report:
  stage: report
  image: node:18-jammy
  before_script:
    - apt-get update && apt-get install -y default-jdk
    - npm install -g allure-commandline
  script:
    - npm run allure:generate
  artifacts:
    when: always
    paths:
      - test_results/reports/allure-report/
    expire_in: 30 days
```
