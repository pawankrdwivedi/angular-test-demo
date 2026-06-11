import { Given, When, Then } from '@cucumber/cucumber';
import CommonPage from '../page_objects/CommonPage.js';



When('user navigates to Angular documentation page', async function () {
  this.angularPage = new CommonPage(this.page);
  await this.angularPage.open();
});

When('user searches for query from test data', async function () {
  const query = this.test_data?.searchQuery || 'Component';
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
