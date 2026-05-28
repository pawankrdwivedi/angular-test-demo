import BasePage from './BasePage.js';
import logger from '../logger/Logger.js';
import configManager from '../config/ConfigManager.js';

class AngularDemoPage extends BasePage {
  constructor(page) {
    super(page);
    const uiConfig = configManager.getUiConfig();
    this.searchUrl = uiConfig.baseUrl || 'https://angular.dev';
    
    // Locators
    // Primary is intentionally broken to trigger self-healing
    this.searchButton = '#broken-search-button-id';
    this.searchButtonFallbacks = [
      'button.search-button', 
      'button:has-text("Search")',
      'aria-label="Search"', 
      'button.docsearch-btn',
      'button.adev-nav-button'
    ];

    this.searchInput = '#broken-search-input-id';
    this.searchInputFallbacks = [
      'input[type="search"]',
      'input.search-input',
      'input.docsearch-input',
      'input[placeholder="Search"]',
      'input.docs-text-field',
      'input[placeholder="Search docs"]'
    ];
  }

  async open() {
    await this.navigateTo(this.searchUrl);
    await this.page.waitForLoadState('networkidle');
  }

  async triggerSearch(query) {
    logger.info(`Performing Angular Docs search for: "${query}"`);
    
    // Click Search Button (using self-healing locators)
    await this.click(this.searchButton, this.searchButtonFallbacks);
    
    // Enter search text
    await this.fill(this.searchInput, query, this.searchInputFallbacks);
    
    // Wait for stability
    await this.page.waitForTimeout(1000); 
  }

  async isSearchResultBoxVisible() {
    return await this.isElementVisible('.docsearch-Dropdown', [
      '.search-results', 
      'div.docsearch-modal',
      '.docs-search-results',
      '.docs-search-container'
    ]);
  }
}

export default AngularDemoPage;
export { AngularDemoPage };
