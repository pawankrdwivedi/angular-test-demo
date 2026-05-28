import { Given, When, Then } from '@cucumber/cucumber';
import CommonPage from '../../page_objects/CommonPage.js';

Given('user loads test data for generic-cucumber-demo {string}', function (testCaseId, dataTable) {
  const callback = typeof dataTable === 'function' ? dataTable : null;
  const realDataTable = dataTable && typeof dataTable.hashes === 'function' ? dataTable : null;
  this.loadExceltest_data('UI_test_data', testCaseId, realDataTable);
  if (callback) callback();
});

When('user navigates to Angular documentation page for generic-cucumber-demo', async function () {
  this.angularPage = new CommonPage(this.page);
  await this.angularPage.open();
});

When('user searches for query from test data for generic-cucumber-demo', async function () {
  const query = this.test_data.searchQuery || 'Component';
  await this.angularPage.triggerSearch(query);
});

Then('search result dialog for generic-cucumber-demo should be visible', async function () {
  const isVisible = await this.angularPage.isSearchResultBoxVisible();
  this.softAssert.assertTrue(isVisible, 'Verify search results dropdown is visible');
});
