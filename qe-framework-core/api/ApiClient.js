import axios from 'axios';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import logger from '../logger/Logger.js';
import configManager from '../config/ConfigManager.js';

const ajv = new Ajv({ allErrors: true, verbose: true });
addFormats(ajv);

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
    const requestConfig = {
      ...config,
      url,
      headers: { ...this.headers, ...config.headers },
      validateStatus: () => true, // Don't throw errors on 4xx/5xx to allow status assertion in steps
    };

    logger.debug(`API Request: ${requestConfig.method.toUpperCase()} ${requestConfig.url}`);
    if (requestConfig.data) {
      logger.trace(`API Request Payload: ${JSON.stringify(requestConfig.data, null, 2)}`);
    }

    try {
      const response = await axios(requestConfig);
      logger.debug(`API Response: ${response.status} ${response.statusText}`);
      logger.trace(`API Response Payload: ${JSON.stringify(response.data, null, 2)}`);
      return response;
    } catch (error) {
      logger.error(`API Request Failed: ${error.message}`);
      throw error;
    }
  }

  // JSON Schema Validation
  validateSchema(data, schema) {
    const validate = ajv.compile(schema);
    const valid = validate(data);
    if (!valid) {
      const errors = validate.errors.map(err => `${err.instancePath} ${err.message}`).join(', ');
      logger.error(`Schema validation failed: ${errors}`);
      return { valid: false, errors };
    }
    logger.info('Schema validation passed successfully.');
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
