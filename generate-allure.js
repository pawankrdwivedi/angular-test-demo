import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

import { allureReporter } from 'qe-framework-core';

const resultsDir = 'test_results';
const historySource = path.join(process.cwd(), resultsDir, 'reports/allure-report/history');
const historyDest = path.join(process.cwd(), resultsDir, 'allure-results/history');

if (fs.existsSync(historySource)) {
  console.log('[Allure] Copying history folder for trend analysis...');
  fs.mkdirSync(historyDest, { recursive: true });
  try {
    const files = fs.readdirSync(historySource);
    for (const file of files) {
      fs.copyFileSync(path.join(historySource, file), path.join(historyDest, file));
    }
    console.log('[Allure] History successfully merged.');
  } catch (err) {
    console.warn('[Allure] Warning: Could not merge history:', err.message);
  }
} else {
  console.log('[Allure] No previous history found. Generating fresh trend data.');
}

try {
  console.log('[Allure] Generating new report...');
  execSync(`npx allure generate ${resultsDir}/allure-results --clean -o ${resultsDir}/reports/allure-report`, { stdio: 'inherit' });
} catch (err) {
  console.error('[Allure] Failed to generate report:', err.message);
  process.exit(1);
}

try {
  console.log('[Allure] Converting generated report to PDF and Static HTML...');
  await allureReporter.exportToPdf(resultsDir);
} catch (err) {
  console.error('[Allure] PDF conversion failed:', err.message);
  process.exit(1);
}
