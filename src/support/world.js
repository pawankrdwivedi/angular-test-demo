import { setWorldConstructor, World } from '@cucumber/cucumber';
import { configManager, logger, ApiClient, etlValidator, dbClient, SoftAssert, excelReader } from 'qe-framework-core';
import path from 'path';
import fs from 'fs';


class CustomWorld extends World {
  constructor(options) {
    super(options);
    
    // Core Utilities binding
    this.config = configManager;
    this.logger = logger;
    this.etl = etlValidator;
    this.db = dbClient;
    this.excel = excelReader;
    
    // Per-scenario instance bindings
    this.api = new ApiClient();
    this.softAssert = new SoftAssert();
    
    // Playwright Browser References (set during Before hooks)
    this.browser = null;
    this.context = null;
    this.page = null;
    
    // Placeholder for Excel/Scenario Test Data
    this.testData = {};
    
    // Scenario details
    this.scenarioName = '';
  }

  /**
   * Helper to extract Cucumber scenario outline Examples data from current AST.
   */
  extractExamplesData() {
    if (!this.scenario) return null;
    const { gherkinDocument, pickle } = this.scenario;
    if (!gherkinDocument || !gherkinDocument.feature || !pickle) return null;

    const astNodeIds = pickle.astNodeIds || [];
    for (const child of gherkinDocument.feature.children || []) {
      if (!child.scenario) continue;
      const sc = child.scenario;

      for (const examples of sc.examples || []) {
        const headerCols = (examples.tableHeader?.cells || []).map(cell => cell.value);
        for (const row of examples.tableBody || []) {
          if (astNodeIds.includes(row.id)) {
            const rowData = {};
            headerCols.forEach((colName, index) => {
              rowData[colName] = row.cells[index]?.value;
            });
            return rowData;
          }
        }
      }
    }
    return null;
  }

  /**
   * Helper to load external Excel test data based on TestCaseID.
   * Maps Excel row fields dynamically onto this.testData.
   */
  loadExcelTestData(sheetName, testCaseId, dataTable = null) {
    // 1. Extract and merge Examples data from feature file scenario outline (if any)
    const examplesData = this.extractExamplesData();
    if (examplesData) {
      this.testData = {
        ...this.testData,
        ...examplesData,
      };
    }

    // 2. Extract and merge DataTable data from current step (if any)
    if (dataTable && typeof dataTable.hashes === 'function') {
      const hashes = dataTable.hashes();
      if (hashes && hashes.length > 0) {
        this.testData = {
          ...this.testData,
          ...hashes[0],
        };
      }
    }

    // 3. Determine if actual test data has been defined in the feature file.
    // We ignore the TestCaseID/testCaseId key when checking if actual data values are defined.
    const hasFeatureFileData = Object.keys(this.testData).some(
      (key) => key.toLowerCase() !== 'testcaseid'
    );

    if (hasFeatureFileData) {
      this.logger.info('Test data is defined in the feature file. Skipping Excel data fetch.');
      this.logger.debug(`Scenario test-data populated: ${JSON.stringify(this.testData)}`);
      return;
    }

    // 4. Fall back to Excel lookup if no feature file data exists and testCaseId is provided
    if (testCaseId) {
      const basePath = fs.existsSync(path.join(process.cwd(), 'app')) ? 'app' : '';
      const testDataDir = 'src/test-data';
      const excelFileName = 'test-data.xlsx';
      const filePath = path.join(process.cwd(), basePath, testDataDir, excelFileName);
      this.logger.info(`Loading test data from Sheet: "${sheetName}" for TestCaseID: "${testCaseId}"`);

      try {
        const excelRow = this.excel.getRowByTestCaseId(filePath, sheetName, testCaseId);
        if (excelRow) {
          // Resolve environment specific overrides
          const resolvedRow = this.excel.resolveEnvData(excelRow, this.config.getEnvironment());
          this.testData = {
            ...this.testData,
            ...resolvedRow,
          };
          this.logger.debug(`Scenario test-data populated from Excel: ${JSON.stringify(this.testData)}`);
          return;
        }
      } catch (err) {
        this.logger.warn(`Excel fetch failed for TestCaseID: "${testCaseId}" in Sheet: "${sheetName}": ${err.message}`);
      }
    }

    // 5. If data is not defined in feature file and not in Excel sheet, log a warning and proceed
    this.logger.warn(`Test data not found in Excel sheet: "${sheetName}" for TestCaseID: "${testCaseId}", and no data was defined in the feature file. Proceeding with steps as test data might not be required.`);
  }
}

setWorldConstructor(CustomWorld);
export default CustomWorld;
export { CustomWorld };
