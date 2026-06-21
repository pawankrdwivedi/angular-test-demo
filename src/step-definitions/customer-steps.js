import { Given, When, Then } from '@cucumber/cucumber';

Given('user loads test data {string}', function (testCaseId, dataTable) {
  const callback = typeof dataTable === 'function' ? dataTable : null;
  const realDataTable = dataTable && typeof dataTable.hashes === 'function' ? dataTable : null;
  // Load data from Excel sheet 'API_test_data'
  this.loadExcelTestData('API_test_data', testCaseId, realDataTable);
  if (callback) callback();
});

When('user submits customer API', async function () {
  const endpoint = this.testData.endpoint || '/posts/1';
  const method = this.testData.method || 'GET';
  
  this.logger.info(`Submitting Customer API: ${method} ${endpoint}`);
  
  // Call the API endpoint using the loaded test data
  if (method.toUpperCase() === 'GET') {
    this.response = await this.api.request().get(endpoint).send();
  } else {
    this.response = await this.api.request().post(endpoint).withBody({
      title: 'Customer Data Post',
      body: 'Automated request',
      userId: 1
    }).send();
  }
});

Then('response status should be {int}', function (expectedStatus) {
  const actualStatus = this.response.status;
  this.softAssert.assertEquals(
    actualStatus, 
    expectedStatus, 
    `Verify API Response status code matches expected`
  );
});

Then('customer should exist in database', async function () {
  const customerId = this.testData.customer_id || 'TC001';
  this.logger.info(`Validating customer in database: ${customerId}`);
  
  // Database Query execution
  const query = 'SELECT * FROM customer WHERE customer_id = ?';
  const rows = await this.db.executeQuery(query, [customerId]);
  
  // Assert using soft assert
  this.softAssert.assertTrue(
    rows.length > 0, 
    `Database check: Customer record with ID "${customerId}" should exist`
  );
  
  if (rows.length > 0) {
    this.logger.info(`Database validation PASSED: Found customer record named "${rows[0].name}"`);
  }
});
