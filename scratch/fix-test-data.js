import fs from 'fs';
import path from 'path';

const REPLACEMENTS = [
  { from: 'this.testData', to: 'this.testData' },
  { from: 'loadExcelTestData', to: 'loadExcelTestData' },
  { from: 'UI_test_data', to: 'UI_test_data' },
  { from: 'API_test_data', to: 'API_test_data' },
  { from: 'ETL_test_data', to: 'ETL_test_data' }
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
          console.log(`Updated: ${fullPath}`);
        }
      }
    }
  }
}

processDirectory('c:\\Github\\angular-test-demo');
processDirectory('c:\\Github\\qe-framework-core');
