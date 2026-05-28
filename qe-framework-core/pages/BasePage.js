import browserManager from '../browser/BrowserManager.js';
import angularHelper from '../browser/AngularHelper.js';
import logger from '../logger/Logger.js';

class BasePage {
  constructor(page) {
    this.page = page;
  }

  async navigateTo(pathOrUrl) {
    logger.info(`Navigating to URL/Path: ${pathOrUrl}`);
    await this.page.goto(pathOrUrl);
    await this.waitForAngular();
  }

  async click(selector, fallbacks = [], timeout = 5000) {
    logger.debug(`Clicking element: "${selector}"`);
    const element = await browserManager.findElementWithSelfHealing(this.page, selector, fallbacks, timeout);
    await element.click();
    await this.waitForAngular();
  }

  async fill(selector, text, fallbacks = [], timeout = 5000) {
    logger.debug(`Filling text in element: "${selector}"`);
    const element = await browserManager.findElementWithSelfHealing(this.page, selector, fallbacks, timeout);
    await element.fill(text);
    await this.waitForAngular();
  }

  async getText(selector, fallbacks = [], timeout = 5000) {
    const element = await browserManager.findElementWithSelfHealing(this.page, selector, fallbacks, timeout);
    return await element.innerText();
  }

  async isElementVisible(selector, fallbacks = [], timeout = 3000) {
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
