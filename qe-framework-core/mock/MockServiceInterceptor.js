import mockDataManager from './MockDataManager.js';
import logger from '../logger/Logger.js';

/**
 * MockServiceInterceptor - Intercepts page requests and serves mock data
 * Allows component testing without backend availability
 */
class MockServiceInterceptor {
  constructor() {
    this.interceptedRoutes = new Map();
    this.routeMatchers = [];
  }

  /**
   * Setup route interception on a Playwright page
   * @param {Page} page - Playwright page object
   */
  async setupInterception(page) {
    if (!mockDataManager.isActive()) {
      logger.debug('Mock data manager not active, skipping interception setup');
      return;
    }

    logger.info('Setting up mock service interception');

    // Intercept API routes
    await page.route('**/api/**', async (route, request) => {
      await this.handleApiRequest(route, request);
    });

    // Intercept GraphQL routes
    await page.route('**/graphql/**', async (route, request) => {
      await this.handleGraphQLRequest(route, request);
    });
  }

  /**
   * Register a route to be intercepted
   * @param {string} urlPattern - URL pattern (supports wildcards)
   * @param {Object} responseData - Mock response data
   * @param {Object} options - Options (method, statusCode, delay)
   */
  registerRoute(urlPattern, responseData, options = {}) {
    const route = {
      pattern: urlPattern,
      data: responseData,
      statusCode: options.statusCode || 200,
      delay: options.delay || 0,
      method: options.method || 'GET',
      headers: options.headers || { 'Content-Type': 'application/json' },
      matchCount: 0,
    };

    this.interceptedRoutes.set(urlPattern, route);
    logger.debug(`Registered mock route: ${urlPattern}`);
  }

  /**
   * Register a route with a matcher function
   * @param {Function} matcherFn - Function that returns true if route should be matched
   * @param {Function|Object} responseFn - Function or object that returns mock data
   * @param {Object} options - Options (method, statusCode, delay)
   */
  registerMatcher(matcherFn, responseFn, options = {}) {
    this.routeMatchers.push({
      matcher: matcherFn,
      response: responseFn,
      statusCode: options.statusCode || 200,
      delay: options.delay || 0,
      headers: options.headers || { 'Content-Type': 'application/json' },
      matchCount: 0,
    });
    logger.debug('Registered custom route matcher');
  }

  /**
   * Handle API request interception
   */
  async handleApiRequest(route, request) {
    const url = request.url();
    const method = request.method();
    const postData = request.postData();

    logger.debug(`Intercepting ${method} ${url}`);

    try {
      // Check if there's a stored mock response
      const storedResponse = mockDataManager.getMockResponse(url);
      if (storedResponse && storedResponse.method === method) {
        return await this.respondWithMock(route, storedResponse);
      }

      // Check registered routes
      const route_config = this.findMatchingRoute(url, method);
      if (route_config) {
        return await this.respondWithMock(route, route_config);
      }

      // Check custom matchers
      for (const matcher of this.routeMatchers) {
        if (matcher.matcher(url, method, postData)) {
          matcher.matchCount++;
          const responseData =
            typeof matcher.response === 'function' ? matcher.response({ url, method, postData }) : matcher.response;

          if (matcher.delay > 0) {
            await this.delay(matcher.delay);
          }

          await route.abort();
          return await route.respond({
            status: matcher.statusCode,
            headers: matcher.headers,
            contentType: 'application/json',
            body: JSON.stringify(responseData),
          });
        }
      }

      // No mock found, continue with actual request
      logger.warn(`No mock found for ${method} ${url}, continuing with actual request`);
      await route.continue();
    } catch (error) {
      logger.error(`Error in API interception: ${error.message}`);
      await route.abort();
    }
  }

  /**
   * Handle GraphQL request interception
   */
  async handleGraphQLRequest(route, request) {
    const url = request.url();
    const postData = request.postData();

    logger.debug(`Intercepting GraphQL ${url}`);

    try {
      let requestBody = {};
      if (postData) {
        requestBody = JSON.parse(postData);
      }

      // Check for query/mutation matchers
      for (const matcher of this.routeMatchers) {
        if (matcher.matcher(url, 'POST', requestBody)) {
          matcher.matchCount++;
          const responseData =
            typeof matcher.response === 'function' ? matcher.response({ url, body: requestBody }) : matcher.response;

          if (matcher.delay > 0) {
            await this.delay(matcher.delay);
          }

          return await route.respond({
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(responseData),
          });
        }
      }

      await route.continue();
    } catch (error) {
      logger.error(`Error in GraphQL interception: ${error.message}`);
      await route.abort();
    }
  }

  /**
   * Respond with mock data
   */
  async respondWithMock(route, routeConfig) {
    if (routeConfig.delay > 0) {
      await this.delay(routeConfig.delay);
    }

    routeConfig.matchCount = (routeConfig.matchCount || 0) + 1;

    await route.respond({
      status: routeConfig.statusCode,
      headers: routeConfig.headers,
      contentType: 'application/json',
      body: JSON.stringify(routeConfig.data),
    });
  }

  /**
   * Find matching route by pattern
   */
  findMatchingRoute(url, method) {
    for (const [pattern, route] of this.interceptedRoutes) {
      if (this.matchesPattern(url, pattern) && route.method === method) {
        return route;
      }
    }
    return null;
  }

  /**
   * Match URL against pattern (supports * wildcards)
   */
  matchesPattern(url, pattern) {
    const regexPattern = pattern.replace(/\*/g, '.*').replace(/\//g, '\\/');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(url);
  }

  /**
   * Delay execution (simulate network latency)
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clear all intercepted routes
   */
  clearRoutes() {
    this.interceptedRoutes.clear();
    this.routeMatchers = [];
    logger.info('Cleared all intercepted routes');
  }

  /**
   * Get interception statistics
   */
  getStats() {
    const stats = {
      registeredRoutes: this.interceptedRoutes.size,
      customMatchers: this.routeMatchers.length,
      routes: [],
      matchers: [],
    };

    for (const [pattern, route] of this.interceptedRoutes) {
      stats.routes.push({
        pattern,
        method: route.method,
        statusCode: route.statusCode,
        matchCount: route.matchCount,
      });
    }

    for (const matcher of this.routeMatchers) {
      stats.matchers.push({
        matchCount: matcher.matchCount,
      });
    }

    return stats;
  }
}

export default new MockServiceInterceptor();
