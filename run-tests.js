import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import xlsx from 'xlsx';

const currentDir = process.cwd();

// Load basic .env first so we can check if APP is defined
try {
  const localEnvPath = path.join(currentDir, '.env');
  if (fs.existsSync(localEnvPath)) {
    dotenv.config({ path: localEnvPath });
  }
} catch (e) {
  // Ignore
}

const appFolderName = process.env.APP || path.basename(currentDir);
if (path.basename(currentDir) !== appFolderName || !fs.existsSync(path.join(currentDir, 'package.json'))) {
  console.error(`\n❌ Error: Test execution is only allowed from inside the "${appFolderName}" folder.`);
  console.error(`Please change your directory to the "${appFolderName}" folder and run the command again.\n`);
  process.exit(1);
}

// Load other environment variables related to the app
try {
  const searchPaths = [
    path.join(process.cwd(), appFolderName, '.env'),
    path.join(process.cwd(), `${appFolderName}.env`),
    path.join(process.cwd(), appFolderName, `${appFolderName}.env`)
  ];
  for (const envPath of searchPaths) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
    }
  }
} catch (e) {
  // Ignore
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
let env = process.env.ENV || 'sit-01'; // default environment
let application = process.env.APP || undefined; // no default application
const cleanArgs = [];

let onlyCucumber = false;
let onlyPlaywright = false;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg.startsWith('--env=')) {
    env = arg.split('=')[1];
  } else if (arg === '--env' && i + 1 < args.length) {
    env = args[i + 1];
    i++; // skip next element
  } else if (arg.startsWith('--app=')) {
    application = arg.split('=')[1];
  } else if (arg === '--app' && i + 1 < args.length) {
    application = args[i + 1];
    i++; // skip next element
  } else if (arg === '--cucumber') {
    onlyCucumber = true;
  } else if (arg === '--playwright') {
    onlyPlaywright = true;
  } else {
    cleanArgs.push(arg);
  }
}

// Set environment variable for ConfigManager
// Set environment variable for ConfigManager
if (env) process.env.TEST_ENV = env;
if (application) process.env.APPLICATION = application;
console.log(`[Runner] Targeting Environment: ${env ? env.toUpperCase() : 'NONE'}`);
console.log(`[Runner] Targeting Application: ${application ? application.toUpperCase() : 'NONE'}`);

// Clean previous Allure results to avoid combined reports from previous executions
const resultsDir = 'test_results';
const logsDir = 'test_logs';

const allureResultsPath = path.join(process.cwd(), resultsDir, 'allure-results');
if (fs.existsSync(allureResultsPath)) {
  try {
    fs.rmSync(allureResultsPath, { recursive: true, force: true });
    console.log('[Runner] Cleared previous Allure results.');
  } catch (err) {
    console.warn(`[Runner] Warning: Could not clear previous Allure results: ${err.message}`);
  }
}

const isLoggerEnabled = String(process.env.LOGGER || '').trim().toLowerCase() === 'true';

// Clean previous logs
const logsPath = path.join(process.cwd(), logsDir);
if (isLoggerEnabled && fs.existsSync(logsPath)) {
  try {
    const files = fs.readdirSync(logsPath);
    for (const file of files) {
      fs.rmSync(path.join(logsPath, file), { recursive: true, force: true });
    }
    console.log('[Runner] Cleared previous logs.');
  } catch (err) {
    console.warn(`[Runner] Warning: Could not clear previous logs: ${err.message}`);
  }
}

// Ensure required reports directories exist
const dirs = [
  path.join(resultsDir, 'reports/screenshots'),
  path.join(resultsDir, 'reports/videos'),
  path.join(resultsDir, 'reports/traces'),
  path.join(resultsDir, 'allure-results')
];

if (isLoggerEnabled) {
  dirs.push(logsDir);
}
dirs.forEach(dir => {
  const fullPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// Directory variables
const featuresDir = 'src/features';
const stepDefinitionsDir = 'src/step-definitions';
const supportDir = 'src/support';
const normalizePath = value => value.replace(/\\/g, '/').replace(/\/+$/, '');
const normalizedFeaturesDir = normalizePath(featuresDir);

// Detect which runners to invoke based on cleanArgs
const hasCucumberArgs = cleanArgs.some(arg =>
  arg.endsWith('.feature') ||
  normalizePath(arg).includes(`${normalizedFeaturesDir}/`) ||
  arg.startsWith('@') ||
  arg === '--tags' ||
  arg === '-t'
);

const hasPlaywrightArgs = cleanArgs.some(arg =>
  arg.endsWith('.spec.js') ||
  arg.includes('test/') ||
  arg.includes('test\\') ||
  arg === '--grep' ||
  arg === '-g' ||
  arg === '--project'
);

let runCucumber = false;
let runPlaywright = false;

if (onlyCucumber) {
  runCucumber = true;
  runPlaywright = false;
} else if (onlyPlaywright) {
  runCucumber = false;
  runPlaywright = true;
} else if (hasCucumberArgs && !hasPlaywrightArgs) {
  runCucumber = true;
  runPlaywright = false;
} else if (hasPlaywrightArgs && !hasCucumberArgs) {
  runCucumber = false;
  runPlaywright = true;
} else {
  runCucumber = true;
  runPlaywright = true;
}

// Filter and separate argument lists
const cucumberArgs = [];
for (let i = 0; i < cleanArgs.length; i++) {
  const arg = cleanArgs[i];
  if (
    !arg.endsWith('.spec.js') &&
    !arg.includes('test/') &&
    !arg.includes('test\\') &&
    arg !== '--project'
  ) {
    if (arg.startsWith('@')) {
      const prev = cucumberArgs[cucumberArgs.length - 1];
      if (prev !== '--tags' && prev !== '-t') {
        cucumberArgs.push('--tags');
      }
    }
    cucumberArgs.push(arg);
  }
}

const playwrightArgs = cleanArgs.filter(arg =>
  !arg.endsWith('.feature') &&
  !normalizePath(arg).includes(`${normalizedFeaturesDir}/`) &&
  !arg.startsWith('@') &&
  arg !== '--tags' &&
  arg !== '-t'
);

function findCucumberBin() {
  let dir = process.cwd();
  while (dir) {
    const binPath = path.join(dir, 'node_modules', '@cucumber', 'cucumber', 'bin', 'cucumber-js');
    if (fs.existsSync(binPath)) {
      return binPath;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return 'cucumber-js';
}
const cucumberBin = findCucumberBin();

const defaultArgs = [];
const defaultFeatureGlob = `${normalizedFeaturesDir}/**/*.feature`;
const generatedFeaturesDir = path.join(resultsDir, 'generated-features');

function findMatchingSheetName(workbook, sheetName) {
  return workbook.SheetNames.find(
    name => name.toLowerCase().replace(/_/g, '') === sheetName.toLowerCase().replace(/_/g, '')
  );
}

function getSheetNameForFeature(featureContent) {
  if (/user loads UI test data/i.test(featureContent)) return 'UI_test_data';
  if (/user loads API test data|customer test data/i.test(featureContent)) return 'API_test_data';
  if (/user loads ETL test data|ETL test data/i.test(featureContent)) return 'ETL_test_data';
  return null;
}

function formatExamplesTable(rows) {
  const headers = Object.keys(rows[0] || {});
  const tableRows = [headers, ...rows.map(row => headers.map(header => row[header]))];
  const widths = headers.map((_, index) =>
    Math.max(...tableRows.map(row => String(row[index] ?? '').length))
  );

  return tableRows
    .map(row => `      | ${row.map((value, index) => String(value ?? '').padEnd(widths[index])).join(' | ')} |`)
    .join('\n');
}

function expandFeatureExamplesFromExcel(featurePath, workbook) {
  const featureContent = fs.readFileSync(featurePath, 'utf8');
  const sheetName = getSheetNameForFeature(featureContent);
  if (!sheetName) return featureContent;

  const matchedSheetName = findMatchingSheetName(workbook, sheetName);
  if (!matchedSheetName) return featureContent;

  const rows = xlsx.utils.sheet_to_json(workbook.Sheets[matchedSheetName], { defval: '' });
  if (rows.length === 0) return featureContent;

  return featureContent.replace(
    /(^[ \t]*Examples:\s*\r?\n)([ \t]*\|[^\r\n]*TestCaseID[^\r\n]*\|\s*\r?\n)((?:[ \t]*\|[^\r\n]*\|\s*(?:\r?\n|$))+)/gim,
    (match, examplesLine, headerLine, bodyBlock) => {
      const testCaseIds = bodyBlock
        .trim()
        .split(/\r?\n/)
        .map(line => line.split('|').map(cell => cell.trim()).filter(Boolean)[0])
        .filter(Boolean);

      const selectedRows = testCaseIds.length === 1
        ? rows
        : rows.filter(row =>
            testCaseIds.some(id =>
              String(row.TestCaseID || row.testCaseId || row.testcaseid || '').trim().toLowerCase() === String(id).toLowerCase()
            )
          );

      if (selectedRows.length === 0) return match;
      return `${examplesLine}${formatExamplesTable(selectedRows)}\n`;
    }
  );
}

function collectFeatureFiles(rootDir) {
  const files = [];
  if (!fs.existsSync(rootDir)) return files;

  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const entryPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFeatureFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith('.feature')) {
      files.push(entryPath);
    }
  }

  return files;
}

function prepareGeneratedFeatures() {
  const testDataDir = 'src/test-data';
  const excelFileName = 'test-data.xlsx';
  const excelPath = path.join(process.cwd(), testDataDir, excelFileName);
  const sourceFeaturesPath = path.join(process.cwd(), featuresDir);

  if (!fs.existsSync(excelPath) || !fs.existsSync(sourceFeaturesPath)) {
    return featuresDir;
  }

  if (fs.existsSync(generatedFeaturesDir)) {
    fs.rmSync(generatedFeaturesDir, { recursive: true, force: true });
  }
  fs.mkdirSync(generatedFeaturesDir, { recursive: true });

  const workbook = xlsx.readFile(excelPath);
  const featureFiles = collectFeatureFiles(sourceFeaturesPath);

  for (const featureFile of featureFiles) {
    const relativePath = path.relative(sourceFeaturesPath, featureFile);
    const targetPath = path.join(generatedFeaturesDir, relativePath);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, expandFeatureExamplesFromExcel(featureFile, workbook), 'utf8');
  }

  console.log(`[Runner] Generated data-driven feature files in: ${generatedFeaturesDir}`);
  return path.relative(process.cwd(), generatedFeaturesDir).replace(/\\/g, '/');
}

const executionFeaturesDir = runCucumber ? prepareGeneratedFeatures() : featuresDir;
const normalizedExecutionFeaturesDir = normalizePath(executionFeaturesDir);
const executionFeatureGlob = `${normalizedExecutionFeaturesDir}/**/*.feature`;

if (!cucumberArgs.some(arg => arg.endsWith('.feature') || normalizePath(arg).startsWith(`${normalizedFeaturesDir}/`))) {
    defaultArgs.push(executionFeatureGlob);
}

const finalArgs = [...defaultArgs, ...cucumberArgs];

if (!finalArgs.includes('--import')) {
  finalArgs.push(
    '--import', `${stepDefinitionsDir}/**/*.js`,
    '--import', `${supportDir}/**/*.js`
  );
}
if (!finalArgs.includes('--format')) {
  finalArgs.push(
    '--format', `html:${resultsDir}/reports/cucumber-report.html`
  );
}

const retryCount = process.env.RETRY ? parseInt(process.env.RETRY, 10) : 0;
if (retryCount > 0 && !finalArgs.includes('--retry')) {
  finalArgs.push('--retry', retryCount.toString());
}

function runCucumberTests() {
  return new Promise((resolve) => {
    console.log(`\n[Runner] --- Spawning Cucumber BDD Tests ---`);
    console.log(`[Runner] Spawning Cucumber CLI: npx cucumber-js ${finalArgs.join(' ')}`);
    const cucumberProcess = spawn('node', [cucumberBin, ...finalArgs], {
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        FORCE_COLOR: '1'
      }
    });

    cucumberProcess.on('close', (code) => {
      console.log(`[Runner] Cucumber execution finished with exit code ${code}\n`);
      resolve(code);
    });
  });
}

function runPlaywrightTests() {
  return new Promise((resolve) => {
    console.log(`\n[Runner] --- Spawning Playwright POM Tests ---`);
    console.log(`[Runner] Spawning Playwright CLI: npx playwright test ${playwrightArgs.join(' ')}`);
    const playwrightProcess = spawn('npx', ['playwright', 'test', ...playwrightArgs], {
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        FORCE_COLOR: '1'
      }
    });

    playwrightProcess.on('close', (code) => {
      console.log(`[Runner] Playwright execution finished with exit code ${code}\n`);
      resolve(code);
    });
  });
}

async function main() {
  let cucumberCode = 0;
  let playwrightCode = 0;

  if (runCucumber) {
    cucumberCode = await runCucumberTests();
  }

  if (runPlaywright && cucumberCode === 0) {
    playwrightCode = await runPlaywrightTests();
  }

  const finalCode = cucumberCode !== 0 ? cucumberCode : playwrightCode;
  console.log(`[Runner] Global test run completed with final exit code: ${finalCode}`);
  process.exit(finalCode);
}

main().catch(err => {
  console.error('[Runner] Unexpected error during execution:', err);
  process.exit(1);
});
