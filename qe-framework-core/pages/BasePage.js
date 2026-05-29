import browserManager from '../browser/BrowserManager.js';
import angularHelper from '../browser/AngularHelper.js';
import logger from '../logger/Logger.js';
import configManager from '../config/ConfigManager.js';

class BasePage {
  constructor(page) {
    this.page = page;
  }

  async navigateTo(pathOrUrl) {
    logger.info(`Navigating to URL/Path: ${pathOrUrl}`);
    await this.page.goto(pathOrUrl);
    await this.waitForAngular();
  }

  getDefaultTimeout() {
    return configManager.getExecutionConfig().timeout;
  }

  async click(selector, fallbacks = [], timeout = this.getDefaultTimeout()) {
    logger.debug(`Clicking element: "${selector}"`);
    const element = await browserManager.findElementWithSelfHealing(this.page, selector, fallbacks, timeout);
    await element.click();
    await this.waitForAngular();
  }

  async fill(selector, text, fallbacks = [], timeout = this.getDefaultTimeout()) {
    logger.debug(`Filling text in element: "${selector}"`);
    const element = await browserManager.findElementWithSelfHealing(this.page, selector, fallbacks, timeout);
    await element.fill(text);
    await this.waitForAngular();
  }

  async getText(selector, fallbacks = [], timeout = this.getDefaultTimeout()) {
    const element = await browserManager.findElementWithSelfHealing(this.page, selector, fallbacks, timeout);
    return await element.innerText();
  }

  async isElementVisible(selector, fallbacks = [], timeout = this.getDefaultTimeout()) {
    try {
      const element = await browserManager.findElementWithSelfHealing(this.page, selector, fallbacks, timeout);
      return await element.isVisible();
    } catch (e) {
      return false;
    }
  }

  // Synchronization wrapper for Angular pages
  async waitForAngular() {
    await angularHelper.waitForAngularStability(this.page);
  }

  async getPageTitle() {
    return await this.page.title();
  }
}

export default BasePage;
export { BasePage };
