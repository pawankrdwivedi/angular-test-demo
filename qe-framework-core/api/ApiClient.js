import { request } from 'playwright';
import logger from '../logger/Logger.js';
import configManager from '../config/ConfigManager.js';

class ApiClient {
  constructor(customBaseUrl = null) {
    const apiConfig = configManager.getApiConfig();
    this.baseUrl = customBaseUrl || apiConfig.baseUrl;
    this.headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    this.token = null;
  }

  // Header management
  setHeader(key, value) {
    this.headers[key] = value;
    return this;
  }

  setBearerToken(token) {
    this.token = token;
    this.headers['Authorization'] = `Bearer ${token}`;
    return this;
  }

  // Request Builder Pattern
  request() {
    return new RequestBuilder(this);
  }

  async execute(config) {
    const url = `${this.baseUrl}${config.url}`;
    logger.debug(`API Request: ${config.method.toUpperCase()} ${url}`);
    if (config.data) {
      logger.trace(`API Request Payload: ${JSON.stringify(config.data, null, 2)}`);
    }

    // Initialize Playwright's APIRequestContext
    const requestContext = await request.newContext({
      extraHTTPHeaders: { ...this.headers, ...config.headers },
    });

    try {
      // Execute the request via Playwright
      const response = await requestContext.fetch(url, {
        method: config.method.toUpperCase(),
        params: config.params,
        data: config.data,
        failOnStatusCode: false, // Ensure it doesn't throw on error status codes
      });

      const statusCode = response.status();
      const statusText = response.statusText();
      const headers = response.headers();
      
      // Parse body safely
      let data = null;
      const contentType = headers['content-type'] || '';
      const text = await response.text();
      if (contentType.includes('application/json') && text) {
        try {
          data = JSON.parse(text);
        } catch (e) {
          data = text;
        }
      } else {
        data = text;
      }

      logger.debug(`API Response: ${statusCode} ${statusText}`);
      logger.trace(`API Response Payload: ${JSON.stringify(data, null, 2)}`);

      // Return a clean, backward-compatible Axios-like response format
      return {
        status: statusCode,
        statusText: statusText,
        headers: headers,
        data: data,
        ok: response.ok(),
      };
    } catch (error) {
      logger.error(`API Request Failed: ${error.message}`);
      throw error;
    } finally {
      // Ensure we dispose of the context to free resources
      await requestContext.dispose();
    }
  }

  // Schema Validation (No-op or lightweight structural assertion to replace AJV)
  validateSchema(data, schema) {
    logger.warn('Schema validation using AJV has been deprecated. Performing basic structural verification.');
    if (!data) {
      return { valid: false, errors: 'No data provided for validation' };
    }
    // Perform simple property existence check if required properties are specified
    if (schema && schema.required && Array.isArray(schema.required)) {
      const missing = schema.required.filter(prop => data[prop] === undefined);
      if (missing.length > 0) {
        const errors = `Missing required properties: ${missing.join(', ')}`;
        logger.error(`Schema validation failed: ${errors}`);
        return { valid: false, errors };
      }
    }
    logger.info('Schema validation passed basic structural checks.');
    return { valid: true };
  }
}

// Request Builder Class
class RequestBuilder {
  constructor(client) {
    this.client = client;
    this.config = {
      method: 'get',
      url: '',
      headers: {},
      params: {},
      data: null,
    };
  }

  get(url) {
    this.config.method = 'get';
    this.config.url = url;
    return this;
  }

  post(url) {
    this.config.method = 'post';
    this.config.url = url;
    return this;
  }

  put(url) {
    this.config.method = 'put';
    this.config.url = url;
    return this;
  }

  patch(url) {
    this.config.method = 'patch';
    this.config.url = url;
    return this;
  }

  delete(url) {
    this.config.method = 'delete';
    this.config.url = url;
    return this;
  }

  withHeaders(headers) {
    this.config.headers = { ...this.config.headers, ...headers };
    return this;
  }

  withParams(params) {
    this.config.params = { ...this.config.params, ...params };
    return this;
  }

  withBody(body) {
    this.config.data = body;
    return this;
  }

  async send() {
    return await this.client.execute(this.config);
  }
}

export default ApiClient;
export { ApiClient, RequestBuilder };
