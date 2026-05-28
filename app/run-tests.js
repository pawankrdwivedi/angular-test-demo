import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const currentDir = process.cwd();
if (path.basename(currentDir) !== 'app' || !fs.existsSync(path.join(currentDir, 'package.json'))) {
  console.error('\n❌ Error: Test execution is only allowed from inside the "app" folder.');
  console.error('Please change your directory to the "app" folder and run the command again.\n');
  process.exit(1);
}

// Load environment variables first
try {
  const searchPaths = [
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), 'app', '.env'),
    path.join(process.cwd(), 'app.env'),
    path.join(process.cwd(), 'app', 'app.env')
  ];
  for (const envPath of searchPaths) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
    }
  }
} catch (e) {
  // Ignore
}

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Run the test assets generator to guarantee data files are in place
console.log('--- Setting up Test Assets (Excel & CSV) ---');
try {
  const configDir = process.env.DIR_CONFIG || 'config';
  const { testAssetGenerator } = await import('qe-framework-core');
  testAssetGenerator.generateAssets(path.join(configDir, 'test-assets.json'));
} catch (err) {
  console.error('Failed to generate test assets, proceeding anyway:', err.message);
}
console.log('--- Test Assets Configured Successfully ---\n');

// 2. Parse command line arguments
const args = process.argv.slice(2);
let env = 'sit-01'; // default environment
let application = 'sample-application'; // default application
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

// 3. Set environment variable for ConfigManager
process.env.TEST_ENV = env;
process.env.APPLICATION = application;
console.log(`[Runner] Targeting Environment: ${env.toUpperCase()}`);
console.log(`[Runner] Targeting Application: ${application.toUpperCase()}`);

// Clean previous Allure results to avoid combined reports from previous executions
const resultsDir = process.env.DIR_TEST_RESULTS || 'test_results';
const logsDir = process.env.DIR_TEST_LOGS || 'test_logs';

const allureResultsPath = path.join(process.cwd(), resultsDir, 'allure-results');
if (fs.existsSync(allureResultsPath)) {
  try {
    fs.rmSync(allureResultsPath, { recursive: true, force: true });
    console.log('[Runner] Cleared previous Allure results.');
  } catch (err) {
    console.warn(`[Runner] Warning: Could not clear previous Allure results: ${err.message}`);
  }
}

// Clean previous logs
const logsPath = path.join(process.cwd(), logsDir);
if (fs.existsSync(logsPath)) {
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
  path.join(resultsDir, 'allure-results'),
  logsDir
];
dirs.forEach(dir => {
  const fullPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// Detect which runners to invoke based on cleanArgs
const hasCucumberArgs = cleanArgs.some(arg =>
  arg.endsWith('.feature') ||
  arg.includes('src/features') ||
  arg.startsWith('@') ||
  arg === '--tags' ||
  arg === '-t'
);

const hasPlaywrightArgs = cleanArgs.some(arg =>
  arg.endsWith('.spec.js') ||
  arg.includes('src/tests') ||
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
  // If neither or both are explicitly specified, run both
  runCucumber = true;
  runPlaywright = true;
}

// Filter and separate argument lists
const cucumberArgs = [];
for (let i = 0; i < cleanArgs.length; i++) {
  const arg = cleanArgs[i];
  if (
    !arg.endsWith('.spec.js') &&
    !arg.includes('src/tests') &&
    arg !== '--project'
  ) {
    if (arg.startsWith('@')) {
      // If a tag is passed directly without --tags or -t preceding it, prepend --tags
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
  !arg.includes('src/features') &&
  !arg.startsWith('@') &&
  arg !== '--tags' &&
  arg !== '-t'
);

// 4. Construct Cucumber CLI command
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
  // Fall back to node module resolution or assume it is available globally / via npx path
  return 'cucumber-js';
}
const cucumberBin = findCucumberBin();

// We conditionally inject the default features path only if no specific features path is specified.
const defaultArgs = [];
const featuresDir = process.env.DIR_FEATURES || 'features';
const stepDefinitionsDir = process.env.DIR_STEP_DEFINITIONS || 'step_definition';
const supportDir = process.env.DIR_SUPPORT || 'support';

if (!cucumberArgs.some(arg => arg.endsWith('.feature') || arg.includes(featuresDir))) {
    defaultArgs.push(`${featuresDir}/feature/**/*.feature`);
} else {
    // Use all features for default application
    defaultArgs.push(`${featuresDir}/**/*.feature`);
}

// We rely on cucumber.yaml for all other default profiles and configurations.
// We pass finalArgs directly to the spawned process, and dynamically inject DIR values to override cucumber.yaml
const finalArgs = [...defaultArgs, ...cucumberArgs];

// Dynamic override of step definition, support paths and Allure/HTML results folder
if (!finalArgs.includes('--import')) {
  const stepDefsPath = stepDefinitionsDir.startsWith('features') || stepDefinitionsDir.startsWith('feature')
    ? stepDefinitionsDir
    : `features/${stepDefinitionsDir}`;
  const supportPath = supportDir.startsWith('features') || supportDir.startsWith('feature')
    ? supportDir
    : `features/${supportDir}`;

  finalArgs.push(
    '--import', `${stepDefsPath}/**/*.js`,
    '--import', `${supportPath}/**/*.js`
  );
}
if (!finalArgs.includes('--format')) {
  finalArgs.push(
    '--format', `html:${resultsDir}/reports/cucumber-report.html`
  );
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

// 5. Execution Flow Coordination
async function main() {
  let cucumberCode = 0;
  let playwrightCode = 0;

  if (runCucumber) {
    cucumberCode = await runCucumberTests();
  }

  // Only run Playwright if Cucumber passed (matching the chained '&&' behavior)
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
