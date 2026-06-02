/**
 * Mock Data Framework - Main Export
 * Provides unified access to network recording and playback utilities.
 */

export { default as componentTestHelper } from './ComponentTestHelper.js';
export { default as networkRecordPlaybackManager } from './NetworkRecordPlaybackManager.js';

export { ComponentTestHelper } from './ComponentTestHelper.js';

export const MockFramework = {
  // Initialize mock network mode for a page (Record or Playback)
  async initMockMode(page, scenarioName) {
    const { componentTestHelper } = await import('./ComponentTestHelper.js');
    return componentTestHelper.initializeMockMode(page, scenarioName);
  },

  // Stop mock mode and save recorded data
  async stopMocking() {
    const { componentTestHelper } = await import('./ComponentTestHelper.js');
    componentTestHelper.stopMockMode();
  }
};

export default MockFramework;
