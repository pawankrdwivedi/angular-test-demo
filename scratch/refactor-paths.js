import fs from 'fs';
import path from 'path';

const REPLACEMENTS = [
  // 1. Core framework files (PascalCase to kebab-case)
  { from: 'api/api-client.js', to: 'api/api-client.js' },
  { from: 'assertions/custom-assertions.js', to: 'assertions/custom-assertions.js' },
  { from: 'browser/angular-helper.js', to: 'browser/angular-helper.js' },
  { from: 'browser/browser-manager.js', to: 'browser/browser-manager.js' },
  { from: 'config/config-manager.js', to: 'config/config-manager.js' },
  { from: 'data/excel-reader.js', to: 'data/excel-reader.js' },
  { from: 'data/test-asset-generator.js', to: 'data/test-asset-generator.js' },
  { from: 'db/db-client.js', to: 'db/db-client.js' },
  { from: 'etl/etl-validator.js', to: 'etl/etl-validator.js' },
  { from: 'logger/logger.js', to: 'logger/logger.js' },
  { from: 'mock/component-test-helper.js', to: 'mock/component-test-helper.js' },
  { from: 'mock/network-record-playback-manager.js', to: 'mock/network-record-playback-manager.js' },
  { from: 'pages/base-page.js', to: 'pages/base-page.js' },
  { from: 'reporting/allure-reporter.js', to: 'reporting/allure-reporter.js' },
  { from: 'utils/path-resolver.js', to: 'utils/path-resolver.js' },
  { from: 'utils/string-utils.js', to: 'utils/string-utils.js' },

  { from: '/api-client.js', to: '/api-client.js' },
  { from: '/custom-assertions.js', to: '/custom-assertions.js' },
  { from: '/angular-helper.js', to: '/angular-helper.js' },
  { from: '/browser-manager.js', to: '/browser-manager.js' },
  { from: '/config-manager.js', to: '/config-manager.js' },
  { from: '/excel-reader.js', to: '/excel-reader.js' },
  { from: '/test-asset-generator.js', to: '/test-asset-generator.js' },
  { from: '/db-client.js', to: '/db-client.js' },
  { from: '/etl-validator.js', to: '/etl-validator.js' },
  { from: '/logger.js', to: '/logger.js' },
  { from: '/component-test-helper.js', to: '/component-test-helper.js' },
  { from: '/network-record-playback-manager.js', to: '/network-record-playback-manager.js' },
  { from: '/base-page.js', to: '/base-page.js' },
  { from: '/allure-reporter.js', to: '/allure-reporter.js' },
  { from: '/path-resolver.js', to: '/path-resolver.js' },
  { from: '/string-utils.js', to: '/string-utils.js' },

  // 2. Folder paths in angular-test-demo
  { from: 'pages/angular-demo-page.js', to: 'pages/angular-demo-page.js' },
  { from: 'pages/common-page.js', to: 'pages/common-page.js' },
  { from: 'pages', to: 'pages' },
  { from: 'step-definitions', to: 'step-definitions' },
  { from: 'test-data', to: 'test-data' },
  
  // 3. File names in angular-test-demo
  { from: 'network-mocks.json', to: 'network-mocks.json' },
  { from: 'source-etl.csv', to: 'source-etl.csv' },
  { from: 'target-etl.csv', to: 'target-etl.csv' },
  { from: 'hybrid-demo.spec.js', to: 'hybrid-demo.spec.js' },
  { from: 'angular-demo-page.js', to: 'angular-demo-page.js' },
  { from: 'common-page.js', to: 'common-page.js' },

  // 4. Variables and functions (to camelCase)
  { from: 'this.testData', to: 'this.testData' },
  { from: 'loadExcelTestData', to: 'loadExcelTestData' }
];

function processDirectory(dirPath) {
  const items = fs.readdirSync(dirPath);
  for (const item of items) {
    if (item === 'node_modules' || item === '.git' || item === 'dist' || item === 'test_results' || item === 'html_results') {
      continue;
    }
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else {
      const ext = path.extname(fullPath).toLowerCase();
      if (['.js', '.json', '.yaml', '.yml', '.feature', '.md'].includes(ext)) {
        let content = fs.readFileSync(fullPath, 'utf8');
        let changed = false;
        
        for (const replacement of REPLACEMENTS) {
          if (content.includes(replacement.from)) {
            content = content.split(replacement.from).join(replacement.to);
            changed = true;
          }
        }
        
        if (changed) {
          fs.writeFileSync(fullPath, content, 'utf8');
          console.log(`Updated references in: ${fullPath}`);
        }
      }
    }
  }
}

console.log('Starting search and replace refactoring...');
processDirectory('c:\\Github\\qe-framework-core');
processDirectory('c:\\Github\\angular-test-demo');
console.log('Finished refactoring.');
