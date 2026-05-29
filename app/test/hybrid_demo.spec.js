import { test, expect } from '@playwright/test';
import CommonPage from '../page_objects/CommonPage.js';
import { excelReader, configManager, ApiClient, dbClient, logger, networkRecordPlaybackManager } from 'qe-framework-core';
import path from 'path';
import fs from 'fs';

test.describe('Hybrid POM & Data-Driven Tests', () => {
  let api;

  test.beforeAll(async () => {
    logger.info('--- Initializing database connection pool for Playwright Tests ---');
    await dbClient.connect();
    api = new ApiClient();
  });

  test.afterAll(async () => {
    logger.info('--- Disconnecting database connection pool for Playwright Tests ---');
    await dbClient.disconnect();
  });

  test.beforeEach(async ({ page }, testInfo) => {
    await networkRecordPlaybackManager.init(page, testInfo.title);
  });

  test.afterEach(async () => {
    networkRecordPlaybackManager.saveRecordedMocks();
  });

  // Data-driven hybrid tests matching Excel records
  const testCases = ['TC001', 'TC002'];

  for (const testCaseId of testCases) {
    test(`Execute hybrid testcase - ${testCaseId}`, async ({ page }) => {
      logger.info(`Starting hybrid test execution for TestCaseID: ${testCaseId}`);

      // 1. Load Excel Test Data dynamically based on current environment
      const env = configManager.getEnvironment();
      const basePath = fs.existsSync(path.join(process.cwd(), 'app')) ? 'app' : '';
      const testDataDir = process.env.DIR_TEST_DATA || 'test_data';
      const excelFileName = process.env.FILE_TEST_DATA_EXCEL || 'test-data.xlsx';
      const excelFilePath = path.join(process.cwd(), basePath, testDataDir, excelFileName);

      const uiExcelRow = excelReader.getRowByTestCaseId(excelFilePath, 'UI_test_data', testCaseId);
      const apiExcelRow = excelReader.getRowByTestCaseId(excelFilePath, 'API_test_data', testCaseId);

      expect(uiExcelRow).not.toBeNull();
      expect(apiExcelRow).not.toBeNull();

      const uiTestData = excelReader.resolveEnvData(uiExcelRow, env);
      const apiTestData = excelReader.resolveEnvData(apiExcelRow, env);

      logger.info(`Loaded UI test data for ${testCaseId}: ${JSON.stringify(uiTestData)}`);
      logger.info(`Loaded API test data for ${testCaseId}: ${JSON.stringify(apiTestData)}`);

      // 2. UI Test using Page Object Model (POM)
      const angularPage = new CommonPage(page);
      await angularPage.open();

      const query = uiTestData.searchQuery || 'Component';
      await angularPage.triggerSearch(query);

      const isVisible = await angularPage.isSearchResultBoxVisible();
      expect(isVisible).toBe(true);

      // 3. API Test using ApiClient (Verifying customer endpoint resolved from Excel test data)
      const endpoint = apiTestData.endpoint || '/posts/1';
      const method = apiTestData.method || 'GET';
      logger.info(`Verifying API layer for ${testCaseId}: ${method} ${endpoint}`);

      let response;
      if (method.toUpperCase() === 'GET') {
        response = await api.request().get(endpoint).send();
      } else {
        response = await api.request().post(endpoint).withBody({
          title: 'Hybrid Test Post',
          body: 'Playwright automation request',
          userId: 1
        }).send();
      }

      expect(response.status).toBe(apiTestData.expectedStatus || 200);

      // 4. Database Validation using DbClient (Verifying customer presence in DB)
      const customerId = apiTestData.customer_id || testCaseId;
      logger.info(`Verifying Database layer for ${testCaseId}: checking customer_id = ${customerId}`);

      const queryStr = 'SELECT * FROM customer WHERE customer_id = ?';
      const dbRows = await dbClient.executeQuery(queryStr, [customerId]);

      expect(dbRows.length).toBeGreaterThan(0);
      logger.info(`Database validation PASSED: Found customer record named "${dbRows[0].name}"`);
    });
  }
});
