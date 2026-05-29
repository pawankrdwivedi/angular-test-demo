# Enterprise-Grade Playwright + Cucumber BDD Test Automation Framework

This repository houses a production-ready, highly scalable, enterprise-grade test automation framework built using **Playwright**, **Cucumber BDD**, and **Node.js**.

It is structured to enforce a strict separation of concerns, featuring a generic core library layer (`qe-framework-core`) and an application-specific test suite layer located under the `app/` directory (containing page objects, feature files, step definitions, and environment-specific configuration files).

---

## 🌟 Framework Core Capabilities

1. **Modular Architecture & Code Split**:
   - `qe-framework-core` (packaged core): Houses generic, reusable modules (logger, API clients, DB wrappers, browser managers, assertions, AI modules, ETL engines).
   - `app/`: Houses application-specific test assets (YAML configurations, Page Objects, Gherkin features, step definitions).
2. **Angular App Synchronization**: Built-in support for Angular testability checks, detecting `getAllAngularTestabilities()` to ensure page stability before interactions, preventing flaky UI tests.
3. **Self-Healing Locator Strategy**: An advanced locator mechanism that automatically falls back to alternative element selectors when the primary selector is broken, logging anomalies programmatically to `test_logs/self_healing_anomalies.json`.
4. **Excel-Driven Test Data**: Dynamic mapping of Cucumber `Scenario Outline` `TestCaseID`s to test data spreadsheets. Values are resolved dynamically based on the current run environment.
5. **Unified Data Reconciliation (ETL)**: High-speed verification engines for files (CSV vs. CSV, CSV vs. DB), handling row counts, detailed cell matches, and mathematical aggregates (SUM, AVG, etc.).
6. **Robust Soft Assertions**: Built-in `SoftAssert` utility allowing multiple assertion checkpoints to run in a single test without halting execution on the first failure.
7. **Environment-Specific YAML Configurations**: Easy environment switching (`dev`, `qa`, `uat`, `prod`) using robust YAML parsing.
8. **Interactive Allure & HTML Reporting**: Built-in support for Allure reports, including screenshot attachments and full execution video recordings on scenario failures.

---

## 🛠️ Technology Stack

- **Core**: Node.js (ESM), Javascript, Playwright
- **BDD**: Cucumber.js
- **API**: Axios with AJV (JSON Schema Validation)
- **Database**: `pg` (Postgres), `mysql2` (MySQL), `tedious` (MSSQL), `oracledb` (Oracle)
- **ETL & Data**: `csv-parse`, `xlsx`
- **Config & Logs**: `js-yaml`, `winston`
- **Reporting**: `allure-cucumberjs`

---

## 📁 Repository Structure

```text
├── config/                     # Environment specific YAML configurations (dev, qa, uat, prod)
├── docs/                       # Project documentation
├── features/                   # Cucumber Gherkin BDD test assets
│   ├── feature/                # Feature BDD files
│   ├── step_definition/        # BDD step definition files
│   └── support/                # Cucumber environment hooks and World setup
├── page_objects/               # Page Object Models extending BasePage
├── test/                       # Playwright Spec hybrid POM tests
├── test_data/                  # Dynamic Excel spreadsheets & ETL source files
├── test_logs/                  # Dynamic execution and self-healing anomaly logs
├── test_results/               # Automated test results (screenshots, traces, videos, and reports)
├── .env                        # Common execution configurations
├── app.env                     # Framework directory paths and test data filename setups
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
To install and link the framework core library locally, run `npm install` inside the `app/` folder:
```bash
cd app
npm install
```
This will automatically configure and link the packaged core library (`"qe-framework-core": "file:qe-framework-core-1.0.0.tgz"`) as a dependency.

Next, download the Playwright browser binaries:
```bash
npx playwright install chromium
```

### 3. Configuration Settings
Create or modify configuration settings in the `.env`, `app.env`, or environment-specific YAML files inside `config/`:

* **`.env`**: Controls browser engine, headless mode, parallel execution threads, screenshot triggers, video recordings, trace settings, and Agentic AI capabilities.
  ```env
  APP=risk-dekstop
  ENV=sit-01
  BROWSER=chromium
  HEADLESS=false
  PARALLEL=0
  TIMEOUT=60000
  SCREENSHOT=only-on-failure
  VIDEO=off
  TRACE=off
  AI_ENABLED=true
  AI_EXECUTION=true
  AI_GENERATION=true
  ```

* **`app.env`**: Defines project workspace directory paths and input test data/ETL file names loaded by the runner.
  ```env
  # Project Structure Directories
  DIR_CONFIG=config
  DIR_DOCS=docs
  DIR_FEATURES=features/feature
  DIR_STEP_DEFINITIONS=features/step_definition
  DIR_SUPPORT=features/support
  DIR_PAGE_OBJECTS=page_objects
  DIR_TEST=test
  DIR_TEST_DATA=test_data
  DIR_TEST_LOGS=test_logs
  DIR_TEST_RESULTS=test_results

  # Test Data File Names
  FILE_TEST_DATA_EXCEL=test-data.xlsx
  FILE_TARGET_ETL_CSV=target_etl.csv
  FILE_SOURCE_ETL_CSV=source_etl.csv
  ```

* **`config/<env>.yaml`**: Controls environment-specific service endpoints, base URLs, and database configurations.

---

## ✍️ Creating & Writing Tests

The framework enforces a structured way to write scalable tests using Page Object Models and Cucumber step definitions.

### 1. Page Objects
Create page object models extending `BasePage` from the core library. Use primary selectors and optional fallback arrays to support **Self-Healing**:

```javascript
import { BasePage, logger, configManager } from 'qe-framework-core';

export class LoginPage extends BasePage {
  constructor(page) {
    super(page);
    
    // Primary selector is defined here
    this.usernameInput = '#username';
    
    // Fallback selectors are used automatically by the browser manager if the primary selector fails
    this.usernameInputFallbacks = [
      'input[name="user"]',
      'input[type="text"]',
      'input.login-input-field'
    ];
  }

  async login(username, password) {
    logger.info(`Attempting login for user: ${username}`);
    await this.fill(this.usernameInput, username, this.usernameInputFallbacks);
    // Continue with password and submit action...
  }
}
```

### 2. Cucumber Step Definitions
Write steps using unified assertions, logs, and context clients accessed directly via the Cucumber `World` context (`this`):

```javascript
import { Given, When, Then } from '@cucumber/cucumber';
import { LoginPage } from '../../page_objects/LoginPage.js';

Given('user loads UI test data {string}', function (testCaseId, dataTable) {
  // Dynamically loads data from Excel sheets under app/test_data/
  this.loadExceltest_data('UI_test_data', testCaseId, dataTable);
});

When('user logs in with credential set', async function () {
  this.loginPage = new LoginPage(this.page);
  await this.loginPage.login(this.test_data.username, this.test_data.password);
});

Then('dashboard welcome header should be visible', async function () {
  const locator = this.page.locator('.welcome-header');
  // Use softAssert to record checkpoints without immediately halting execution
  await this.softAssert.assertVisible(locator, 'Verify welcome header is visible');
});
```

### 3. Scaffolding New Tests
To quickly scaffold boilerplate files (Cucumber feature & steps or Playwright spec files), execute the generic test case generator:
```bash
npm run generate:testcase -- --type=<cucumber|playwright> --name=<your_test_name>
```

This utility:
1. Resolves templated boilerplate files.
2. Generates the respective files under `app/features/` & `app/features/step_definition/` (for BDD) or `app/test/` (for Playwright spec).
3. Automatically applies Agentic AI enhancements to the templates if `ai.generation` is enabled in the active config.

---

## 🏃 Test Execution Commands

Run your tests using the custom programmatic runner `run-tests.js` inside the `app` directory.

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
npm run test:cucumber:feature -- features/feature/demo_angular_ui.feature
```

#### **Run Cucumber BDD tests by Folder**
Runs all Cucumber feature files under a specific directory:
```bash
npm run test:cucumber:folder -- features/feature/
```

#### **Specify Environment Overrides**
Specify target environments (`dev`, `qa`, `uat`, `prod`) with any command:
```bash
npm run test:cucumber -- --env=dev
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
The framework supports native Playwright tests (located in `app/test/`) using the same page objects, data parsers, and services.

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
npm run test:playwright:spec -- test/hybrid_demo.spec.js
```

#### **Run Playwright POM tests by Folder**
Runs all POM tests under a specific directory:
```bash
npm run test:playwright:folder -- test/
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
  $env:TEST_ENV="dev"; npm run test:playwright
  ```
- **Windows Command Prompt (CMD):**
  ```cmd
  set TEST_ENV=dev && npm run test:playwright
  ```
- **Bash / GitLab CI/CD:**
  ```bash
  TEST_ENV=dev npm run test:playwright
  ```

---

### 3. Selector Inspector & Page Element Tool
To help write locators and understand a page's DOM structure, use the Selector Inspector:
```bash
npm run inspect:selectors -- --url=<url_to_inspect> --click=<optional_button_selector>
```

Options:
- `--url`: Target page URL (defaults to environment's `ui.baseUrl` if omitted).
- `--click`: A CSS selector to click (e.g., a search button) before analyzing the page elements.
- `--timeout`: Maximum operation timeout in milliseconds (default: 5000).

Example:
```bash
npm run inspect:selectors -- --url=https://angular.dev --click=button.adev-nav-button
```

---

## 📊 Viewing Test Reports

After executing tests, you can inspect execution results using various options:

* **Playwright HTML Report**: Open `app/test_results/reports/playwright-html/index.html` directly in any web browser.
* **Cucumber HTML Report**: Open `app/test_results/reports/cucumber-report.html` directly in any web browser.
* **Allure Report**:
  ```bash
  # Automatically compiles and displays Allure trend reports
  npm run allure
  ```
* **Playwright Traces**: Go to `https://trace.playwright.dev/` and upload any trace `.zip` file from `reports/traces/` or `test_results/` to visually step through the execution.

## 📡 Network Record & Playback Mode

To ensure UI tests remain fully executable and stable even when backend APIs or testing servers are unavailable, the framework includes a built-in **Network Record & Playback Manager**.

This utility intercepts network API traffic (fetch & XHR requests) during live browser runs and can either save them as mocks or serve those mocks transparently to keep the front-end fully functional.

### 1. Enable Recording (Capture Mock Data)
To record all UI network request/response traffic during execution, set the `MOCK_RECORD` environment variable to `true`:
- **Windows PowerShell:**
  ```powershell
  $env:MOCK_RECORD="true"; npm run test
  ```
- **Windows Command Prompt (CMD):**
  ```cmd
  set MOCK_RECORD=true && npm run test
  ```
- **Bash / Linux:**
  ```bash
  MOCK_RECORD=true npm run test
  ```
This automatically captures and categorizes all API responses into scenario-specific records inside `app/test_data/network_mocks.json`.

### 2. Enable Playback (Mock Mode)
When testing in environments where the backend is unstable or offline, execute tests with `MOCK_PLAYBACK` set to `true`:
- **Windows PowerShell:**
  ```powershell
  $env:MOCK_PLAYBACK="true"; npm run test
  ```
- **Windows Command Prompt (CMD):**
  ```cmd
  set MOCK_PLAYBACK=true && npm run test
  ```
- **Bash / Linux:**
  ```bash
  MOCK_PLAYBACK=true npm run test
  ```
The framework will automatically intercept all Fetch/XHR requests and serve the matching recorded mock responses, enabling offline UI regression testing. If a request is not found in the mock file, it transparently falls back to the live network.

---

## 🧠 Agentic AI Capabilities & App-Level Configuration

The framework features an **Agentic AI manager** (`qe-framework-core/ai/AgenticAiManager.js` or via packaged core) that adds advanced self-healing and failure analysis capabilities. These capabilities are fully configurable at the application level via environment YAML files under `app/config/`.

### App-Level Configurations

Each project environment (`app/config/<env>.yaml`) contains an `ai` configuration block:

```yaml
ai:
  enabled: true          # Global switch for all AI features
  execution: true        # Toggles AI self-healing, failure analysis, and impact prediction during test execution
  generation: true       # Toggles AI test case template enhancement during test case generation
```

#### Settings by Environment
- **`dev` / `qa`**: Active by default (`enabled: true`, `execution: true`, `generation: true`).
- **`uat` / `prod`**: Fully disabled by default (`enabled: false`, `execution: false`, `generation: false`) to avoid unapproved network requests or dynamic updates in stable environments.

### Environment Variable Overrides
You can override configurations dynamically in your CI/CD pipelines or execution terminal via environment variables:
- `AI_ENABLED=true/false`
- `AI_EXECUTION=true/false`
- `AI_GENERATION=true/false`

For example (in Windows PowerShell):
```powershell
$env:AI_ENABLED="true"; $env:AI_GENERATION="false"; npm run test
```

### Dynamic Capabilities

1. **AI-Based Self-Healing & Failure Analysis (Execution)**:
   - During test execution, if a UI element cannot be located, the framework automatically queries the AI Agent to heal locator strategies based on DOM snapshot analysis.
   - Upon test failure, the hook under `app/features/support/hooks.js` triggers AI failure analysis to examine error context, stack trace, and DOM state, saving the report locally and attaching insights to Cucumber reports.

2. **AI-Enhanced Test Case Generation (Generation)**:
   - When generating new test cases with the CLI scaffolder (`npm run generate:testcase`), if `ai.generation` is enabled, the template generation automatically calls the AI Agentic service to enhance generated files with contextual edge-cases and assertions.

---

## ⚙️ Key Architectural Components

### 1. Config Manager
Loads configuration parameters from `app/config/<env>.yaml`. It determines the base URL, execution settings (headless mode, screenshots, video capturing, tracing options), AI configs, and database connection credentials.

### 2. Browser Manager & Angular Sync
- **BrowserManager**: Configures browser context options (viewports, video capturing, tracing files) and implements the **Self-Healing Locator Strategy**. When a selector fails, it checks the fallbacks list sequentially and updates `test_logs/self_healing_anomalies.json` once resolved.
- **AngularHelper**: Leverages Angular `Zone.js` stable indicators (`window.getAllAngularTestabilities()`) to pause steps until asynchronous UI operations complete.

### 3. ETL Engine
Reconciles target files with source files by verifying record counts, cell-by-cell mismatches using unique keys, and aggregate value matches (such as verifying that a column's `SUM`, `AVG`, `MIN`, `MAX` matches expectations).

### 4. Unified Database Client
Exposes a simple query interface. In local or dummy environments, it triggers **Mock Failback Mode** to return simulated test datasets, ensuring test suites can execute successfully without database server dependencies.

### 5. Generic Test Asset Generator
Reads Excel workbook sheets, rows, and CSV file structures from a unified configuration file at `app/config/test-assets.json` and dynamically generates them on test suite initialization.

### 6. Generic Test Case Scaffolder
Reads templates from the framework or application override paths to dynamically generate feature files, step definition stubs, or Playwright POM specs. If AI generation is enabled in the environment config, it automatically intercepts the filled templates and queries the `AgenticAiManager` for advanced generation and AI enhancement.

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
    - app/node_modules/

install_dependencies:
  stage: install
  image: mcr.microsoft.com/playwright:v1.44.1-jammy
  script:
    - cd app
    - npm ci
    - npx playwright install chromium

run_bdd_tests:
  stage: test
  image: mcr.microsoft.com/playwright:v1.44.1-jammy
  script:
    - cd app
    - npm run test:cucumber
  artifacts:
    when: always
    paths:
      - app/test_results/
      - app/test_logs/
    expire_in: 7 days

run_pom_tests:
  stage: test
  image: mcr.microsoft.com/playwright:v1.44.1-jammy
  script:
    - cd app
    - npm run test:playwright
  artifacts:
    when: always
    paths:
      - app/test_results/
      - app/test_logs/
    expire_in: 7 days

generate_allure_report:
  stage: report
  image: node:18-jammy
  before_script:
    - apt-get update && apt-get install -y default-jdk
    - npm install -g allure-commandline
  script:
    - cd app
    - npm run allure:generate
  artifacts:
    when: always
    paths:
      - app/test_results/reports/allure-report/
    expire_in: 30 days
```
