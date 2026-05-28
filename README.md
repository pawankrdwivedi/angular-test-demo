# QA Test Automation Framework & Application

This workspace contains two major components:
1. **`qe-framework-core`**: The core framework library containing reusable components like browser management, api client, etl engines, DB wrappers, mock managers, and agentic AI helpers.
2. **`app`**: The application folder containing automated regression tests, page objects, features, and step definitions using Playwright and Cucumber BDD.

---

## 🚀 How to Generate the Framework Package

The framework is packaged as a distributable npm tarball (`qe-framework-core-1.0.0.tgz`). This ensures that the original source code is not exposed to consumer applications, only the bundled output.

1. Navigate to the framework directory:
   ```bash
   cd qe-framework-core
   ```
2. Install packaging dependencies (e.g. `esbuild`):
   ```bash
   npm install
   ```
3. Build and package the core framework:
   ```bash
   npm run pack
   ```
   This generates the tarball file `qe-framework-core-1.0.0.tgz` in the folder.

---

## 📦 Using the Package in the App Folder

1. Move or copy the generated package `qe-framework-core-1.0.0.tgz` to the `app` directory.
2. Navigate to the `app` directory:
   ```bash
   cd app
   ```
3. Install the package using npm:
   ```bash
   npm install qe-framework-core-1.0.0.tgz
   ```
   This extracts the package and references it under the local file dependency in `app/package.json`:
   ```json
   "dependencies": {
     "qe-framework-core": "file:qe-framework-core-1.0.0.tgz"
   }
   ```
4. Now, any file inside `app` can import components cleanly without relative path traversals:
   ```javascript
   import { excelReader, configManager, ApiClient, dbClient, logger } from 'qe-framework-core';
   ```

---

## 🧪 Executing the Test Cases

All automated regression and hybrid tests are run from the `app` directory.

1. Navigate to the `app` directory:
   ```bash
   cd app
   ```
2. Run the BDD and Playwright hybrid tests:
   ```bash
   npm run test
   ```
3. To run Playwright UI runner:
   ```bash
   npm run test:playwright:ui
   ```
