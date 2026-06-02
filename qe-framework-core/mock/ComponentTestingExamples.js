import { componentTestHelper } from './index.js';
import logger from '../logger/Logger.js';

/**
 * Component Testing Examples - Network Record & Playback
 * 
 * This file demonstrates how to perform component and UI testing by:
 * 1. Recording live API responses on a fully fledged integrated E2E environment.
 * 2. Playing them back when offline or during frontend-only development.
 */

/**
 * EXAMPLE: Recording Network Traffic on Integrated Env
 * Set MOCK_RECORD=true in your environment to enable recording.
 */
export async function recordNetworkTrafficExample(page) {
  logger.info('--- Starting Component Test Network Recording Session ---');
  
  // 1. Initialize recording for the specific scenario
  // This will intercept all outgoing API requests and log their responses
  await componentTestHelper.initializeMockMode(page, 'product_details_flow');
  
  // 2. Perform E2E actions on the fully integrated frontend/backend
  await page.goto('/products');
  await page.click('.product-item-first');
  await page.waitForSelector('.product-details-container');
  
  // 3. Stop and persist recorded responses to `test_data/network_mocks.json` on tear-down
  await componentTestHelper.stopMockMode();
  
  logger.info('--- Network Recording Completed and Saved Successfully ---');
}

/**
 * EXAMPLE: Playback Offline with No Backend Connection
 * Set MOCK_PLAYBACK=true in your environment to play back previously recorded responses.
 */
export async function playbackNetworkMocksExample(page) {
  logger.info('--- Starting Component Test Playback Session ---');
  
  // 1. Initialize playback for the scenario
  // Playwright will immediately serve matching recorded responses from the JSON file
  await componentTestHelper.initializeMockMode(page, 'product_details_flow');
  
  // 2. Navigate and verify the UI state (no active backend required)
  await page.goto('/products');
  
  const title = await page.locator('.product-title').innerText();
  logger.info(`Playback verification: Found product title - "${title}"`);
  
  // 3. Stop intercept mode on tear-down
  await componentTestHelper.stopMockMode();
  
  logger.info('--- Playback Session Finished ---');
}
