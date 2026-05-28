# Enterprise-Grade Playwright + Cucumber BDD Test Automation Framework

This repository contains a production-ready, highly scalable, enterprise-grade test automation framework built using **Playwright**, **Cucumber BDD**, and **Node.js**.

The framework is structured to enforce a strict separation of concerns, featuring a generic core library layer under the `framework/` directory and application-specific implementations under the `app/` directory.

---

## 🌟 Framework Core Capabilities

1. **Modular Architecture & Code Split**:
   - `framework/`: Houses generic, reusable modules (logger, API clients, DB wrappers, browser managers, assertions, AI modules, ETL engines).
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
├── .github/workflows/          # CI/CD Workflows (GitHub Actions)
├── app/                        # Application Specific Files
│   ├── config/                 # Environment specific YAML configurations (dev, qa, uat, prod)
│   ├── features/               # Cucumber Gherkin feature files
│   ├── pages/                  # Page Object Models extending BasePage
│   ├── step_definition/       # Cucumber steps and hooks
│   └── test_data/               # Dynamic Excel spreadsheets & ETL source files
├── framework/                  # Reusable, Application-Agnostic Core Modules
│   ├── ai/                     # Agentic AI failure analysis and auto-healing mocks
│   ├── api/                    # Axios-based API client wrapper with JSON Schema support
│   ├── assertions/             # Custom Assertions and Soft Assertions
│   ├── browser/                # Playwright Context, Tracing, and Angular Sync helpers
│   ├── config/                 # Environment-specific configuration loader
│   ├── data/                   # Excel & CSV data parsers
│   ├── db/                     # Unified Database Client (Postgres, MySQL, Oracle, MSSQL)
│   ├── etl/                    # ETL file reconciliation and data matching engine
│   └── logger/                 # Winston-based logging system (console & file logs)
├── test_logs/                  # Execution and self-healing anomaly logs
├── reports/                    # Test execution assets (screenshots, traces, videos, HTML report)
├── cucumber.yaml               # Cucumber execution configuration
├── package.json                # Project dependencies and scripts
└── run-tests.js                # Programmatic test runner script
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: `v18.0.0` or higher
- **Java** (Required only for generating local Allure reports)

### 2. Installation
Install the project dependencies and download the Playwright browser binaries:
```bash
npm install
npx playwright install chromium
```

### 3. Execution (Cucumber BDD)
The framework features a custom programmatic runner `run-tests.js` that compiles dynamic Excel test data, configures execution environments, and runs Cucumber CLI. It supports BDD script execution filtered by tags, specific feature files, or entire feature directories.

#### **Run all BDD tests**
Runs all Cucumber tests (default environment: `sit-01`):
```bash
npm run test:cucumber
```

#### **Run BDD tests by Tag**
Runs Cucumber scenarios matching a specific tag filter:
```bash
npm run test:cucumber:tag -- "@ui"
```

#### **Run BDD tests by Feature File**
Runs Cucumber scenarios targeting a specific feature file:
```bash
npm run test:cucumber:feature -- features/feature/demo_angular_ui.feature
```

#### **Run BDD tests by Folder**
Runs all Cucumber feature files under a specific directory:
```bash
npm run test:cucumber:folder -- features/feature/
```

#### **Specify Environment Overrides**
You can specify target environments (`dev`, `qa`, `uat`, `prod`) with any command:
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

### 4. Execution (Playwright Hybrid POM Tests)
The framework supports native Playwright tests (located in `app/test/`) that utilize the same page object models, test data managers, database clients, and API clients. You can run them isolated through our programmatic runner filtered by tags/grep, specific spec files, or entire spec directories.

#### **Run all Playwright POM tests**
Runs all Playwright tests (default environment: `sit-01`):
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
Specify target environments using the `TEST_ENV` environment variable before running Playwright tests:
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

### 5. GitLab CI/CD Pipeline Integration
Below is a production-ready `.gitlab-ci.yml` pipeline configuration to run the test suite, isolate logs, and compile allure trend reports:

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

---

### 6. Viewing Test Reports
After test execution, you can compile and view reports:

* **Playwright HTML Report**: Open `test_results/reports/playwright-html/index.html` directly in any web browser.
* **Allure Report**:
  ```bash
  npm run allure
  ```
* **Cucumber HTML Report**: Open `test_results/reports/cucumber-report.html` directly in any web browser.
* **Playwright Traces**: Open `https://trace.playwright.dev/` and drop any trace `.zip` file from `reports/traces/` (for Cucumber) or `test_results/` (for Playwright) to inspect UI steps.

### 6. Scaffolding New Tests (Cucumber & Playwright)
To quickly scaffold boilerplate tests, execute the generic scaffolder:
```bash
npm run generate:testcase -- --type=<cucumber|playwright> --name=<your_test_name>
```
This utility:
1. Resolves templates from `framework/templates/` (or from `app/templates/` if you override them).
2. Generates the respective files under `app/features/` & `app/step_definition/` (for Cucumber) or `app/tests/` (for Playwright).
3. Automatically applies Agentic AI enhancements to the templates if `ai.generation` is enabled in the active environment config.


### 7. Inspecting Page Elements & Selectors
To help write locators and understand a page's DOM structure, use the generic Selector Inspector:
```bash
npm run inspect:selectors -- --url=<url_to_inspect> --click=<optional_button_selector>
```

Options:
- `--url`: Target page URL (defaults to the environment's `ui.baseUrl` from config if not passed).
- `--click`: A CSS selector to click (e.g. search button) before analyzing the page.
- `--timeout`: Maximum operation timeout in milliseconds (default: 5000).

Example:
```bash
npm run inspect:selectors -- --url=https://angular.dev --click=button.adev-nav-button
```
This launches a headless browser, navigates to the URL, clicks the search icon, and outputs a formatted list of form controls, buttons, and dialogs.

---

## 🧠 Agentic AI Capabilities & App-Level Configuration

The framework features an **Agentic AI manager** (`framework/ai/AgenticAiManager.js`) that adds advanced self-healing and failure analysis capabilities. These capabilities are fully configurable at the application level via environment YAML files under `app/config/`.

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
You can override these configurations dynamically in your CI/CD pipelines or execution terminal via environment variables:
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
   - Upon test failure, the hook under `app/step_definition/hooks.js` triggers AI failure analysis to examine error context, stack trace, and DOM state, saving the report locally and attaching insights to Cucumber reports.

2. **AI-Enhanced Test Case Generation (Generation)**:
   - When generating new test cases with the CLI scaffolder (`npm run generate:testcase`), if `ai.generation` is enabled, the template generation automatically calls the AI Agentic service to enhance generated files (feature/spec/steps) with contextual edge-cases and assertions.

---

## ⚙️ Key Architectural Components

### 1. Config Manager (`framework/config/ConfigManager.js`)
Loads configuration parameters from `app/config/<env>.yaml`. It determines the base URL, execution settings (headless mode, screenshots, video capturing, tracing options), AI configs, and database connection credentials.

### 2. Browser Manager & Angular Sync (`framework/browser/`)
- **BrowserManager**: Configures browser context options (viewports, video capturing, tracing files) and implements the **Self-Healing Locator Strategy**. When a selector fails, it checks the fallbacks list sequentially and updates `test_logs/self_healing_anomalies.json` once resolved.
- **AngularHelper**: Leverages Angular `Zone.js` stable indicators (`window.getAllAngularTestabilities()`) to pause steps until asynchronous UI operations complete.

### 3. ETL Engine (`framework/etl/EtlValidator.js`)
Reconciles target files with source files by verifying:
- Total record counts.
- Cell-by-cell mismatches using unique keys (primary keys).
- Aggregate value matches (such as verifying that a column's `SUM`, `AVG`, `MIN`, `MAX` matches expectations).

### 4. Unified Database Client (`framework/db/DbClient.js`)
Exposes a simple query interface. In local or dummy environments, it triggers **Mock Failback Mode** to return simulated test datasets, ensuring test suites can execute successfully without database server dependencies.

### 5. Generic Test Asset Generator (`framework/data/TestAssetGenerator.js`)
Reads Excel workbook sheets, rows, and CSV file structures from a unified configuration file at `app/config/test-assets.json` and dynamically generates them on test suite initialization.

### 6. Generic Test Case Scaffolder (`framework/cli/TestCaseGenerator.js`)
Reads templates from the framework or application override paths to dynamically generate feature files, step definition stubs, or Playwright POM specs. If AI generation is enabled in the environment config, it automatically intercepts the filled templates and queries the `AgenticAiManager` for advanced generation and AI enhancement.

### 7. Agentic AI Manager (`framework/ai/AgenticAiManager.js`)
Coordinates self-healing element locators, processes test runs failure logs, runs test impact prediction for modified source code, and enhances generated test boilerplate templates. Respects app-level environment config states for overall enablement, execution capabilities, and test template generation.

