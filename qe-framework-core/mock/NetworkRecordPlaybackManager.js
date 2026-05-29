import fs from 'fs';
import path from 'path';
import logger from '../logger/Logger.js';
import { resolveFromAppRoot } from '../utils/PathResolver.js';

class NetworkRecordPlaybackManager {
  constructor() {
    this.recordedMocks = [];
    this.mockFilePath = null;
    this.isRecording = false;
    this.isPlayback = false;
    this.activeScenario = 'global';
  }

  /**
   * Initializes network interception on the page based on environment configuration.
   * @param {Page} page - Playwright page object.
   * @param {string} scenarioName - Active BDD scenario or test spec name.
   */
  async init(page, scenarioName = 'global') {
    const recordEnv = process.env.MOCK_RECORD || 'false';
    const playbackEnv = process.env.MOCK_PLAYBACK || 'false';
    
    this.isRecording = recordEnv === 'true';
    this.isPlayback = playbackEnv === 'true';
    this.activeScenario = scenarioName.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    const dataDir = process.env.DIR_TEST_DATA || 'test_data';
    this.mockFilePath = resolveFromAppRoot(dataDir, 'network_mocks.json');

    if (this.isRecording) {
      logger.info(`Network Recorder ACTIVE for scenario: ${this.activeScenario}`);
      this.recordedMocks = [];
      this.setupRecorder(page);
    } else if (this.isPlayback) {
      logger.info(`Network Playback ACTIVE for scenario: ${this.activeScenario}`);
      await this.setupPlayback(page);
    }
  }

  /**
   * Intercepts and records outgoing API requests and incoming responses.
   */
  setupRecorder(page) {
    page.on('response', async (response) => {
      try {
        const request = response.request();
        const resourceType = request.resourceType();

        // Only record API requests (fetch, xhr)
        if (resourceType !== 'fetch' && resourceType !== 'xhr') {
          return;
        }

        const url = request.url();
        const method = request.method();
        const headers = await request.allHeaders();
        const postData = request.postData() || '';

        const status = response.status();
        const responseHeaders = await response.allHeaders();

        // Safely extract response text / JSON payload
        let responseBody = '';
        try {
          responseBody = await response.text();
        } catch (e) {
          // If response body is not readable/binary, skip
          return;
        }

        // Avoid recording extremely large static resources that might be marked as fetch
        if (responseBody.length > 500000) {
          logger.debug(`Skipping recording of large response payload: ${url} (${responseBody.length} bytes)`);
          return;
        }

        const mockEntry = {
          url,
          method,
          requestHeaders: headers,
          requestData: postData,
          response: {
            status,
            headers: responseHeaders,
            body: responseBody
          },
          timestamp: new Date().toISOString()
        };

        this.recordedMocks.push(mockEntry);
        logger.debug(`[Recorder] Captured: ${method} ${url}`);
      } catch (err) {
        logger.warn(`[Recorder] Failed to capture response: ${err.message}`);
      }
    });
  }

  /**
   * Intercepts outgoing requests and fulfills them with recorded data if matched.
   */
  async setupPlayback(page) {
    const mocks = this.loadMocks();
    
    // Intercept all network traffic
    await page.route('**/*', async (route, request) => {
      const url = request.url();
      const method = request.method();
      const resourceType = request.resourceType();
      const postData = request.postData() || '';

      // Only handle BDD/UI API calls
      if (resourceType !== 'fetch' && resourceType !== 'xhr') {
        return route.continue();
      }

      logger.debug(`[Playback] Checking mock for: ${method} ${url}`);

      // Try matching inside the active scenario, then fallback to global/other scenarios
      const matchedMock = this.findMatchingMock(mocks, url, method, postData);

      if (matchedMock) {
        logger.info(`[Playback] Mock FOUND & Applied: ${method} ${url}`);
        
        // Fulfill the route with the recorded mock response
        return route.fulfill({
          status: matchedMock.response.status,
          headers: matchedMock.response.headers,
          body: matchedMock.response.body
        });
      }

      logger.warn(`[Playback] No mock found for: ${method} ${url}. Continuing live call.`);
      return route.continue();
    });
  }

  /**
   * Matches request against recorded mock database.
   */
  findMatchingMock(mocks, url, method, postData) {
    const cleanUrl = (u) => {
      try {
        const parsed = new URL(u);
        return parsed.pathname + parsed.search;
      } catch (e) {
        return u;
      }
    };

    const targetPath = cleanUrl(url);

    // List of keys to check: specific scenario first, then fallbacks
    const keysToCheck = [this.activeScenario, 'global', ...Object.keys(mocks)];

    for (const key of keysToCheck) {
      const scenarioMocks = mocks[key];
      if (!scenarioMocks || !Array.isArray(scenarioMocks)) continue;

      // Find direct matches
      const match = scenarioMocks.find((m) => {
        if (m.method !== method) return false;
        
        const mPath = cleanUrl(m.url);
        if (mPath !== targetPath) return false;

        // For POST/PUT payloads, check structural match
        if (postData && m.requestData) {
          try {
            const p1 = JSON.parse(postData);
            const p2 = JSON.parse(m.requestData);
            return JSON.stringify(p1) === JSON.stringify(p2);
          } catch (e) {
            return postData === m.requestData;
          }
        }
        return true;
      });

      if (match) return match;
    }

    return null;
  }

  /**
   * Loads all scenario network mocks from file.
   */
  loadMocks() {
    try {
      if (fs.existsSync(this.mockFilePath)) {
        const data = fs.readFileSync(this.mockFilePath, 'utf8');
        return JSON.parse(data);
      }
    } catch (err) {
      logger.error(`[Playback] Failed to load network mocks: ${err.message}`);
    }
    return {};
  }

  /**
   * Saves recorded mock responses to database.
   */
  saveRecordedMocks() {
    if (!this.isRecording || this.recordedMocks.length === 0) {
      return;
    }

    logger.info(`Saving ${this.recordedMocks.length} captured API mocks for scenario: ${this.activeScenario}`);

    try {
      // Ensure the directory exists
      const dir = path.dirname(this.mockFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Merge with existing mocks to prevent overwriting other test cases
      let allMocks = {};
      if (fs.existsSync(this.mockFilePath)) {
        try {
          const existingData = fs.readFileSync(this.mockFilePath, 'utf8');
          allMocks = JSON.parse(existingData);
        } catch (e) {
          logger.warn(`Failed to parse existing mock file, creating fresh: ${e.message}`);
        }
      }

      // Group by the active scenario
      allMocks[this.activeScenario] = this.recordedMocks;

      fs.writeFileSync(this.mockFilePath, JSON.stringify(allMocks, null, 2));
      logger.info(`Successfully stored captured mocks to: ${this.mockFilePath}`);
    } catch (err) {
      logger.error(`[Recorder] Failed to store recorded mocks: ${err.message}`);
    }
  }
}

export default new NetworkRecordPlaybackManager();
