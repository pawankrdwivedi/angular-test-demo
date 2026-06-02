import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import logger from '../logger/Logger.js';
import dotenv from 'dotenv';

class ConfigManager {
  constructor() {
    this.config = null;
    this.envVars = this.loadEnvFile();
    this.env = this.determineEnvironment();
    this.application = this.determineApplication();
    this.loadConfig();
  }

  loadEnvFile() {
    try {
      const searchPaths = [
        path.join(process.cwd(), '.env'),
        path.join(process.cwd(), 'app', '.env'),
        path.join(process.cwd(), 'app.env'),
        path.join(process.cwd(), 'app', 'app.env')
      ];
      
      let parsed = {};
      let loadedAny = false;
      
      for (const envPath of searchPaths) {
        if (fs.existsSync(envPath)) {
          const result = dotenv.config({ path: envPath });
          logger.info(`Loaded environment file: ${envPath}`);
          parsed = { ...parsed, ...(result.parsed || {}) };
          loadedAny = true;
        }
      }
      
      if (!loadedAny) {
        logger.warn('No environment configuration file found (.env or app.env), using system environment variables');
      }
      
      return parsed;
    } catch (error) {
      logger.warn(`Failed to load environment files: ${error.message}`);
      return {};
    }
  }

  determineEnvironment() {
    // 1. Check process.env.TEST_ENV (highest priority)
    if (process.env.TEST_ENV) {
      logger.info(`Environment determined from TEST_ENV: ${process.env.TEST_ENV}`);
      return process.env.TEST_ENV.toLowerCase();
    }

    // 2. Check process.argv for --env=xxx or --env xxx
    const argv = process.argv;
    for (let i = 0; i < argv.length; i++) {
      if (argv[i].startsWith('--env=')) {
        const env = argv[i].split('=')[1].toLowerCase();
        logger.info(`Environment determined from command line args: ${env}`);
        return env;
      }
      if (argv[i] === '--env' && i + 1 < argv.length) {
        const env = argv[i + 1].toLowerCase();
        logger.info(`Environment determined from command line args: ${env}`);
        return env;
      }
    }

    // 3. Check ENVIRONMENT/ENV variable from .env file
    const envFromFile = this.envVars.ENVIRONMENT || this.envVars.ENV;
    if (envFromFile) {
      logger.info(`Environment determined from .env file: ${envFromFile}`);
      return envFromFile.toLowerCase();
    }

    // 4. Default to qa
    logger.info('No environment specified, defaulting to qa');
    return 'sit-01';
  }

  determineApplication() {
    // 1. Check process.env.APPLICATION (highest priority)
    if (process.env.APPLICATION) {
      logger.info(`Application determined from APPLICATION env var: ${process.env.APPLICATION}`);
      return process.env.APPLICATION.toLowerCase();
    }

    // 2. Check process.argv for --app=xxx or --app xxx
    const argv = process.argv;
    for (let i = 0; i < argv.length; i++) {
      if (argv[i].startsWith('--app=')) {
        const app = argv[i].split('=')[1].toLowerCase();
        logger.info(`Application determined from command line args: ${app}`);
        return app;
      }
      if (argv[i] === '--app' && i + 1 < argv.length) {
        const app = argv[i + 1].toLowerCase();
        logger.info(`Application determined from command line args: ${app}`);
        return app;
      }
    }

    // 3. Check APPLICATION/APP variable from .env file
    const applicationFromFile = this.envVars.APPLICATION || this.envVars.APP;
    if (applicationFromFile) {
      logger.info(`Application determined from .env file: ${applicationFromFile}`);
      return applicationFromFile.toLowerCase();
    }

    // 4. Default to 'default' (uses root level config files)
    logger.info('No application specified, defaulting to "default"');
    return 'default';
  }

  loadConfig() {
    try {
      const configFileName = `${this.env}.yaml`;
      let configFilePath;
      let configSource = 'default';

      const configDirName = process.env.DIR_CONFIG || 'config';
      const baseConfigPath = fs.existsSync(path.join(process.cwd(), 'app', configDirName))
        ? path.join(process.cwd(), 'app', configDirName)
        : path.join(process.cwd(), configDirName);

      // First, try application-specific config if not using default application
      if (this.application !== 'default') {
        const appConfigPath = path.join(baseConfigPath, this.application, configFileName);
        if (fs.existsSync(appConfigPath)) {
          configFilePath = appConfigPath;
          configSource = this.application;
        } else {
          logger.warn(`Application-specific config not found at ${appConfigPath}, falling back to default config`);
          configFilePath = path.join(baseConfigPath, configFileName);
        }
      } else {
        // Use default config path for 'default' application
        configFilePath = path.join(baseConfigPath, configFileName);
      }

      if (!fs.existsSync(configFilePath)) {
        throw new Error(`Configuration file not found at: ${configFilePath}`);
      }

      logger.info(`Loading configuration for application: ${this.application}, environment: ${this.env.toUpperCase()}, source: ${configSource}`);
      const fileContents = fs.readFileSync(configFilePath, 'utf8');
      this.config = yaml.load(fileContents);
      this.normalizeConfigShape();
      
      // Apply .env defaults for execution settings
      this.applyEnvDefaults();
      
      // Override with system environment variables if any exist
      this.overrideWithEnvVariables();
    } catch (error) {
      logger.error(`Failed to load configuration: ${error.message}`);
      throw error;
    }
  }

  normalizeConfigShape() {
    if (!this.config || typeof this.config !== 'object') {
      this.config = {};
    }

    if (!this.config.ui) {
      this.config.ui = {};
    }
    if (!this.config.api) {
      this.config.api = {};
    }
    if (!this.config.database) {
      this.config.database = {};
    }

    this.config.ui.baseUrl = this.config.ui.baseUrl || this.config.uiUrl;
    this.config.api.baseUrl = this.config.api.baseUrl || this.config.apiUrl;
    this.config.database.host = this.config.database.host || this.config.dbHost;
    this.config.database.port = this.config.database.port || this.config.dbPort;
    this.config.database.user = this.config.database.user || this.config.dbUser;
    this.config.database.password = this.config.database.password || this.config.dbPassword;
    this.config.database.name = this.config.database.name || this.config.dbName;
    this.config.database.type = this.config.database.type || this.config.dbType;
  }

  applyEnvDefaults() {
    // Apply .env file defaults to execution config if not already set in YAML
    if (!this.config.execution) {
      this.config.execution = {};
    }

    const getEnvValue = (key) => process.env[key] ?? this.envVars[key];
    const parseEnvInt = (key, fallback, { min = Number.NEGATIVE_INFINITY } = {}) => {
      const rawValue = getEnvValue(key);
      const parsed = parseInt(rawValue ?? fallback, 10);
      return Number.isNaN(parsed) || parsed < min ? fallback : parsed;
    };

    // Set defaults from .env if not specified in YAML
    this.config.execution.browser = this.config.execution.browser || getEnvValue('BROWSER') || 'chromium';
    this.config.execution.headless = this.config.execution.headless !== undefined ? this.config.execution.headless : (getEnvValue('HEADLESS') === 'true');
    this.config.execution.slowMo = this.config.execution.slowMo !== undefined ? this.config.execution.slowMo : parseInt(getEnvValue('SLOW_MO') || '0');
    this.config.execution.parallel = parseEnvInt('PARALLEL', this.config.execution.parallel || 2, { min: 1 });
    this.config.execution.timeout = parseEnvInt('TIMEOUT', this.config.execution.timeout, { min: 1 });
    this.config.execution.viewportWidth = this.config.execution.viewportWidth || parseInt(getEnvValue('VIEWPORT_WIDTH') || '1280');
    this.config.execution.viewportHeight = this.config.execution.viewportHeight || parseInt(getEnvValue('VIEWPORT_HEIGHT') || '720');
    this.config.execution.screenshot = this.config.execution.screenshot || getEnvValue('SCREENSHOT') || 'only-on-failure';
    this.config.execution.video = this.config.execution.video || getEnvValue('VIDEO') || 'retain-on-failure';
    this.config.execution.trace = this.config.execution.trace || getEnvValue('TRACE') || 'retain-on-failure';

    // Apply .env defaults to AI config if not already set in YAML
    if (!this.config.ai) {
      this.config.ai = {};
    }
  
    this.config.ai.enabled = this.config.ai.enabled !== undefined ? this.config.ai.enabled : (getEnvValue('AI_ENABLED') === 'true');
    this.config.ai.execution = this.config.ai.execution !== undefined ? this.config.ai.execution : (getEnvValue('AI_EXECUTION') === 'true');
    this.config.ai.generation = this.config.ai.generation !== undefined ? this.config.ai.generation : (getEnvValue('AI_GENERATION') === 'true');
  }

  overrideWithEnvVariables() {
    // Allows overriding db password or endpoints via env variables for CI/CD pipelines
    if (process.env.BASE_URL) this.config.ui.baseUrl = process.env.BASE_URL;
    if (process.env.API_URL) this.config.api.baseUrl = process.env.API_URL;
    if (process.env.DB_PASSWORD) this.config.database.password = process.env.DB_PASSWORD;
    if (process.env.DB_HOST) this.config.database.host = process.env.DB_HOST;
    if (process.env.PARALLEL) {
      const parallel = parseInt(process.env.PARALLEL, 10);
      if (!Number.isNaN(parallel) && parallel > 0) this.config.execution.parallel = parallel;
    }
    if (process.env.TIMEOUT) {
      const timeout = parseInt(process.env.TIMEOUT, 10);
      if (!Number.isNaN(timeout) && timeout > 0) this.config.execution.timeout = timeout;
    }

    // AI overrides
    if (process.env.AI_ENABLED !== undefined) {
      if (!this.config.ai) this.config.ai = {};
      this.config.ai.enabled = process.env.AI_ENABLED === 'true';
    }
    if (process.env.AI_EXECUTION !== undefined) {
      if (!this.config.ai) this.config.ai = {};
      this.config.ai.execution = process.env.AI_EXECUTION === 'true';
    }
    if (process.env.AI_GENERATION !== undefined) {
      if (!this.config.ai) this.config.ai = {};
      this.config.ai.generation = process.env.AI_GENERATION === 'true';
    }
  }

  get(key) {
    if (!this.config) {
      this.loadConfig();
    }
    return this.config[key];
  }

  getEnvironment() {
    return this.env;
  }

  getApplication() {
    return this.application;
  }

  getUiConfig() {
    return this.get('ui');
  }

  getApiConfig() {
    return this.get('api');
  }

  getDatabaseConfig() {
    return this.get('database');
  }

  getExecutionConfig() {
    return this.get('execution');
  }

  getAiConfig() {
    return this.get('ai');
  }
}

// Export singleton instance
const configManagerInstance = new ConfigManager();
export default configManagerInstance;
export { ConfigManager };
