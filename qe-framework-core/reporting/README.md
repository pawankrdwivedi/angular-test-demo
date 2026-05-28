# Allure Reporting Quick Start

Get Allure reporting with environment values, screenshots, and video recording attachments in 5 minutes.

## Installation

The framework already has Allure configured. Just use the `AllureReporter` module.

## Basic Integration (5 minutes)

### Step 1: Import the Reporter

In your `app/step_definition/hooks.js`:

```javascript
import allureReporter from '../../framework/reporting/AllureReporter.js';
```

### Step 2: Initialize in BeforeAll

```javascript
import { BeforeAll } from '@cucumber/cucumber';

BeforeAll(async function () {
  allureReporter.initializeReporting();
  // ... rest of setup
});
```

### Step 3: Add Parameters in Before Hook

```javascript
import { Before } from '@cucumber/cucumber';

Before(async function (scenario) {
  allureReporter.addParameters(this, {
    'Scenario': scenario.pickle.name,
    'Environment': configManager.getEnvironment().toUpperCase(),
    'Application': configManager.getApplication()
  });
  // ... rest of setup
});
```

### Step 4: Attach Artifacts in After Hook

```javascript
import { After, Status } from '@cucumber/cucumber';

After(async function (scenario) {
  const failed = scenario.result?.status === Status.FAILED;
  
  if (failed) {
    // Screenshot
    allureReporter.attachScreenshot(this, 'Failure Screenshot');
    
    // Video
    if (this.page) {
      const video = this.page.video();
      if (video) {
        const videoPath = await video.path();
        await allureReporter.attachVideo(this, videoPath, 'Test Video');
      }
    }
  }
  
  // Create summary
  allureReporter.createTestSummary(this, {
    testName: scenario.pickle.name,
    status: failed ? 'FAILED' : 'PASSED'
  });
  
  // ... rest of cleanup
});
```

### Step 5: Generate and View Report

```bash
npm run allure:generate
npm run allure:open
```

## Common Attachments

### Screenshot
```javascript
allureReporter.attachScreenshot(this, 'Page State');
```

### Video
```javascript
const videoPath = await this.page.video().path();
await allureReporter.attachVideo(this, videoPath, 'Recording');
```

### API Response
```javascript
allureReporter.attachJson(this, response, 'API Response');
```

### HTML Report
```javascript
allureReporter.attachHtml(this, htmlContent, 'Custom Report');
```

### Text/Logs
```javascript
allureReporter.attachText(this, logContent, 'Test Logs');
```

### CSV Data
```javascript
allureReporter.attachCsv(this, csvData, 'Test Data');
```

## What Gets Reported

The reporter automatically includes:

✅ Application name  
✅ Environment (DEV/QA/UAT/PROD)  
✅ Browser type  
✅ Test execution date/time  
✅ Node.js version  
✅ OS platform  
✅ UI and API URLs  
✅ Execution configuration  
✅ AI feature status  

Plus any attachments you add:
- Screenshots
- Videos
- Trace files
- JSON/HTML/CSV files
- Text logs
- Test summaries

## File Structure

```
framework/reporting/
├── AllureReporter.js              # Main reporter class
├── index.js                       # Exports
├── HOOKS_INTEGRATION_EXAMPLE.js   # Example integration
└── README.md                      # This file
```

## Full Example

See [HOOKS_INTEGRATION_EXAMPLE.js](HOOKS_INTEGRATION_EXAMPLE.js) for a complete integration example.

See [ALLURE_REPORTING_GUIDE.md](../ALLURE_REPORTING_GUIDE.md) for detailed API documentation.

## Troubleshooting

**Attachments not showing?**
- Ensure `this.attach()` method is available (Cucumber world object)
- Check logs for any errors

**Environment properties missing?**
- Run: `npm run allure:generate`
- Check `test_results/allure-results/environment.properties` exists

**No report generated?**
- Run: `npm test` to execute tests first
- Then: `npm run allure:generate && npm run allure:open`

## See Also

- [ALLURE_REPORTING_GUIDE.md](../ALLURE_REPORTING_GUIDE.md) - Complete API reference
- [../README.md](../README.md) - Main documentation
