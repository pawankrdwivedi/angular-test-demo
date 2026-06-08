import { Given, When, Then } from '@cucumber/cucumber';
import CommonPage from '../page_objects/CommonPage.js';

Given('user loads UI test data {string}', function (testCaseId, dataTable) {
  const callback = typeof dataTable === 'function' ? dataTable : null;
  const realDataTable = dataTable && typeof dataTable.hashes === 'function' ? dataTable : null;
  // Load data from Excel sheet 'UI_test_data'
  this.loadExceltest_data('UI_test_data', testCaseId, realDataTable);
  if (callback) callback();
});

When('user navigates to Angular documentation page', async function () {
  this.angularPage = new CommonPage(this.page);
  await this.angularPage.open();
});

When('user searches for query from test data', async function () {
  const query = this.test_data.searchQuery || 'Component';
  await this.angularPage.triggerSearch(query);
});

Then('search result dialog should be visible', async function () {
  const isVisible = await this.angularPage.isSearchResultBoxVisible();
  
  // Assert results container visibility
  this.softAssert.assertTrue(
    isVisible, 
    'Verify search dropdown modal appears on documentation site'
  );
});
