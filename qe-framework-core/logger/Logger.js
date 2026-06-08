import winston from 'winston';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { getAppRoot, resolveFromAppRoot } from '../utils/PathResolver.js';

const appRoot = getAppRoot();

// Detect APP name from existing env files before loading dotenv
try {
  // If APP already provided via environment, keep it
  if (!process.env.APP) {
    const candidateEnvPaths = [
      path.join(process.cwd(), '.env'),
      path.join(process.cwd(), 'app', '.env'),
      path.join(process.cwd(), 'app.env'),
      path.join(process.cwd(), 'app', 'app.env'),
    ];
    for (const p of candidateEnvPaths) {
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, 'utf8');
        const match = content.match(/^APP\s*=\s*(.+)$/m);
        if (match) {
          process.env.APP = match[1].trim();
          break;
        }
      }
    }
  }

  // Build search paths for dotenv based on detected APP or legacy locations
  const appFolder = process.env.APP || 'app';
  const searchPaths = [
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), `${appFolder}`, '.env'),
    path.join(process.cwd(), `${appFolder}.env`),
    path.join(process.cwd(), `${appFolder}`, `${appFolder}.env`),
    path.join(appRoot, '.env'),
    path.join(appRoot, `${appFolder}.env`),
  ];
  for (const envPath of searchPaths) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
    }
  }
} catch (e) {
  // Ignore
}

// Helper to load APP name from .env file
function getAppName() {
  // Prefer explicit env var first
  if (process.env.APP) {
    return process.env.APP;
  }

  try {
    const envPath = path.join(appRoot, '.env');
    const appEnvPath = path.join(process.cwd(), 'app', '.env');
    let content = '';
    if (fs.existsSync(envPath)) {
      content = fs.readFileSync(envPath, 'utf8');
    } else if (fs.existsSync(appEnvPath)) {
      content = fs.readFileSync(appEnvPath, 'utf8');
    }
    const match = content.match(/^APP\s*=\s*(.+)$/m);
    if (match) {
      return match[1].trim();
    }
  } catch (e) {
    // Ignore error
  }

  return 'risk-desktop';
}

const appName = getAppName();

// If LOG_FILE is set to 'LOG_FILE' or 'false' (case-insensitive) we disable file logging
const _logFileEnv = String(process.env.LOG_FILE || '').trim().toLowerCase();
const disableFileLogging = _logFileEnv === 'log_file' || _logFileEnv === 'false';

// Dynamic prefix format for Winston
const prefixFormat = winston.format((info) => {
  const stack = new Error().stack || '';
  const isFramework = stack.includes('qe-framework-core') || stack.includes('framework/') || stack.includes('framework\\');
  
  if (isFramework) {
    info.message = `[qe-framework-core] ${info.message}`;
  } else {
    info.message = `[${appName}] ${info.message}`;
  }
  return info;
});

// Intercept global console commands
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

console.log = function(...args) {
  const stack = new Error().stack || '';
  const isFramework = stack.includes('qe-framework-core') || stack.includes('framework/') || stack.includes('framework\\');
  const prefix = isFramework ? '[qe-framework-core]' : `[${appName}]`;
  if (args[0] && typeof args[0] === 'string') {
    args[0] = `${prefix} ${args[0]}`;
  } else {
    args.unshift(prefix);
  }
  originalLog.apply(console, args);
};

console.error = function(...args) {
  const stack = new Error().stack || '';
  const isFramework = stack.includes('qe-framework-core') || stack.includes('framework/') || stack.includes('framework\\');
  const prefix = isFramework ? '[qe-framework-core]' : `[${appName}]`;
  if (args[0] && typeof args[0] === 'string') {
    args[0] = `${prefix} ${args[0]}`;
  } else {
    args.unshift(prefix);
  }
  originalError.apply(console, args);
};

console.warn = function(...args) {
  const stack = new Error().stack || '';
  const isFramework = stack.includes('qe-framework-core') || stack.includes('framework/') || stack.includes('framework\\');
  const prefix = isFramework ? '[qe-framework-core]' : `[${appName}]`;
  if (args[0] && typeof args[0] === 'string') {
    args[0] = `${prefix} ${args[0]}`;
  } else {
    args.unshift(prefix);
  }
  originalWarn.apply(console, args);
};

// Prepare logs directory only when file logging is enabled
let logDirectory;
if (!disableFileLogging) {
  logDirectory = resolveFromAppRoot(process.env.DIR_TEST_LOGS || 'test_logs');
  if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory, { recursive: true });
  }
}

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
  trace: 5,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
  trace: 'gray',
};

// Add colors to winston
winston.addColors(colors);

// Custom format
const format = winston.format.combine(
  prefixFormat(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `[${info.timestamp}] [${info.level}]: ${info.message}`
  )
);

// Format for files (without color codes)
const fileFormat = winston.format.combine(
  prefixFormat(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.printf(
    (info) => `[${info.timestamp}] [${info.level.toUpperCase()}]: ${info.message}`
  )
);

// Create the logger instance
const transports = [
  new winston.transports.Console({ format }),
];

if (!disableFileLogging) {
  transports.push(
    new winston.transports.File({
      filename: path.join(logDirectory, 'error.log'),
      level: 'error',
      format: fileFormat,
    })
  );
  transports.push(
    new winston.transports.File({
      filename: path.join(logDirectory, 'execution.log'),
      format: fileFormat,
    })
  );
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'trace',
  levels,
  transports,
});

export default logger;
