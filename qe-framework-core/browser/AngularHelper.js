import logger from '../logger/Logger.js';

class AngularHelper {
  /**
   * Wait for Angular stability (all testabilities stable).
   * Useful for Angular application synchronization to prevent flaky tests.
   */
  async waitForAngularStability(page, timeoutMs = 10000) {
    logger.debug('Waiting for Angular application stability...');
    try {
      await page.waitForFunction(
        () => {
          // Check if Angular is loaded
          if (!window.getAllAngularTestabilities) {
            // Might not be an Angular app or Angular is running in production mode without testabilities enabled
            return true;
          }
          const testabilities = window.getAllAngularTestabilities();
          return testabilities.every((testability) => testability.isStable());
        },
        null,
        { timeout: timeoutMs }
      );
      logger.debug('Angular application is stable.');
    } catch (error) {
      logger.warn(`Timeout waiting for Angular stability (${timeoutMs}ms). Proceeding anyway...`);
    }
  }

  /**
   * Custom locator that finds an element by Angular binding (ng-reflect-* or binding values)
   */
  async findByAngularBinding(page, bindingName) {
    return page.locator(`[ng-reflect-name="${bindingName}"],[name="${bindingName}"],[ng-model="${bindingName}"]`);
  }

  /**
   * Wait for angular-routing navigation or animation completions
   */
  async waitForAngularNavigation(page, urlPattern, timeoutMs = 15000) {
    logger.debug(`Waiting for Angular navigation to: ${urlPattern}`);
    await Promise.all([
      page.waitForURL(urlPattern, { timeout: timeoutMs }),
      this.waitForAngularStability(page, timeoutMs),
    ]);
  }
}

export default new AngularHelper();
