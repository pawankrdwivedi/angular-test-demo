import networkRecordPlaybackManager from './NetworkRecordPlaybackManager.js';
import logger from '../logger/Logger.js';

/**
 * ComponentTestHelper - Utilities for component-level UI testing via Network Record & Playback.
 * Allows running tests on real integrated environments, capturing network interactions, and 
 * playing them back for offline/independent UI development and testing.
 */
class ComponentTestHelper {
  /**
   * Initialize network interception (Record or Playback) on the page.
   * @param {Page} page - Playwright page object.
   * @param {string} scenarioName - Active BDD scenario or test spec name.
   */
  async initializeMockMode(page, scenarioName = 'global') {
    logger.info(`Initializing component test network mode for: ${scenarioName}`);
    await networkRecordPlaybackManager.init(page, scenarioName);
  }

  /**
   * Stop mock mode and persist any captured network interactions.
   */
  stopMockMode() {
    networkRecordPlaybackManager.saveRecordedMocks();
    logger.info('Component test network mode stopped and recorded mocks saved.');
  }
}

export default new ComponentTestHelper();
export { ComponentTestHelper };
