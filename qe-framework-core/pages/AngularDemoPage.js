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
      'button[aria-label*="Search" i]',
      'button.adev-nav-button',
      '[role="button"][aria-label*="Search" i]',
      '.DocSearch-Button',
      '.docs-search-button',
      'button.search-button', 
      'button:has-text("Search")',
      'button.docsearch-btn',
    ];

    this.searchInput = '#broken-search-input-id';
    this.searchInputFallbacks = [
      'input[placeholder="Search docs"]',
      'input[placeholder*="Search" i]',
      'input.docs-text-field',
      'input[aria-label*="Search" i]',
      'input[type="search"]',
      'input.search-input',
      'input.docsearch-input',
      'input.DocSearch-Input',
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
    await this.waitForAngular();
  }

  async isSearchResultBoxVisible() {
    return await this.isElementVisible('.DocSearch-Dropdown', [
      '.docsearch-Dropdown',
      '.search-results', 
      '.DocSearch-Modal',
      '.DocSearch-Container',
      'div.docsearch-modal',
      '.docs-search-results',
      '.docs-search-container',
      '[role="listbox"]'
    ]);
  }
}

export default AngularDemoPage;
export { AngularDemoPage };
