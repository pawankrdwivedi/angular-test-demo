import { Given, When, Then } from '@cucumber/cucumber';

Given('user loads ETL test data {string}', function (testCaseId, dataTable) {
  const callback = typeof dataTable === 'function' ? dataTable : null;
  const realDataTable = dataTable && typeof dataTable.hashes === 'function' ? dataTable : null;
  // Load data from Excel sheet 'ETL_test_data'
  this.loadExcelTestData('ETL_test_data', testCaseId, realDataTable);
  if (callback) callback();
});

When('user reconciles source CSV file with target CSV file', function () {
  const sourcePath = this.testData.sourceFile;
  const targetPath = this.testData.targetFile;
  const pk = this.testData.primaryKey || 'id';

  this.logger.info(`Reconciling files. Source: ${sourcePath}, Target: ${targetPath}, Key: ${pk}`);
  
  // Parse and compare
  this.reconciliationReport = this.etl.compareCsvFiles(sourcePath, targetPath, pk);
});

Then('row counts should match', function () {
  this.softAssert.assertTrue(
    this.reconciliationReport.isCountMatching,
    `Row count match: Source counts (${this.reconciliationReport.sourceCount}) vs Target counts (${this.reconciliationReport.targetCount})`
  );
});

Then('columns and values should reconcile perfectly', function () {
  const missingTargetCount = this.reconciliationReport.missingInTarget.length;
  const missingSourceCount = this.reconciliationReport.missingInSource.length;
  const mismatchesCount = this.reconciliationReport.mismatchedRows.length;

  this.softAssert.assertEquals(
    missingTargetCount, 
    0, 
    'Validate zero records missing in Target database'
  );
  
  this.softAssert.assertEquals(
    missingSourceCount, 
    0, 
    'Validate zero records missing in Source database'
  );

  this.softAssert.assertEquals(
    mismatchesCount, 
    0, 
    'Validate zero columns/values mismatches between Source and Target datasets'
  );
});

Then('aggregate field values should match expected calculation', function () {
  const sourcePath = this.testData.sourceFile;
  const fieldName = this.testData.aggregateField || 'balance';
  const aggType = this.testData.aggregateType || 'SUM';
  const expectedValue = parseFloat(this.testData.expectedAggregateValue || '0');

  // Load source data rows
  const sourceData = this.etl.readCsv(sourcePath);
  
  // Calculate aggregate
  const actualValue = this.etl.validateAggregate(sourceData, fieldName, aggType);
  
  this.softAssert.assertEquals(
    actualValue.toFixed(2), 
    expectedValue.toFixed(2), 
    `Verify aggregate ${aggType}(${fieldName}) matches the expected value`
  );
});
