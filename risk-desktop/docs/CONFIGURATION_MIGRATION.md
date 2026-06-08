# Configuration Migration Guide

## Overview
Common configuration values have been moved from environment-specific YAML files to a `.env` file at the project root. This allows for centralized management of shared settings across all environments while keeping environment-specific overrides in individual YAML files.

## Environment Selection

The system uses a priority-based approach to determine which environment configuration to load:

**Priority Order (highest to lowest):**
1. `TEST_ENV` system environment variable
2. `--env` command-line argument
3. `ENVIRONMENT` variable from `.env` file
4. Default fallback: `qa`

Example of priority in action:
```bash
# Uses dev (from command line, overrides .env ENVIRONMENT=qa)
npm test -- --env dev

# Uses uat (from system env var, overrides .env and command line)
TEST_ENV=uat npm test

# Uses qa (from .env file)
npm test
```

## Changes Made

### 1. Created `.env` File
**Location:** `d:\Github_public\qa-javascript-framework\.env`

This file contains common default values used across all environments:

```
# Environment Selection
# Priority: TEST_ENV > --env argument > ENVIRONMENT variable > default (qa)
ENVIRONMENT=qa

# Browser Configuration
BROWSER=chromium
HEADLESS=false
SLOW_MO=0

# Execution Settings
PARALLEL=2
TIMEOUT=30000
VIEWPORT_WIDTH=1280
VIEWPORT_HEIGHT=720

# Screenshot and Video Recording
SCREENSHOT=only-on-failure
VIDEO=retain-on-failure
TRACE=retain-on-failure

# AI Features
AI_ENABLED=true
AI_EXECUTION=true
AI_GENERATION=true
```

### 2. Updated ConfigManager (`framework/config/ConfigManager.js`)

**Changes:**
- Added `dotenv` import to load `.env` file
- Added `loadEnvFile()` method to read and parse `.env` file
- Added `applyEnvDefaults()` method to merge `.env` defaults with YAML configuration
- YAML values override `.env` defaults when specified in environment config files
- System environment variables override both `.env` and YAML values

**Load Order (Priority):**
1. System Environment Variables (highest priority)
2. Environment-specific YAML values
3. `.env` file defaults (lowest priority)

### 3. Cleaned Up YAML Configuration Files

All YAML files have been updated to remove duplicate common values. Each file now contains only environment-specific overrides:

#### `app/config/qa.yaml`
- Removed: execution settings (uses .env defaults)
- Removed: ai settings (uses .env defaults)
- Kept: database, ui, api configuration

#### `app/config/dev.yaml`
- Kept overrides for: `headless: true`, `parallel: 1`
- Kept overrides for: `screenshot: on`, `video: on`, `trace: on`
- Kept: ai configuration (all true)
- Removed: common values (browser, timeout)

#### `app/config/prod.yaml`
- Kept overrides for: `headless: true`, `parallel: 4`
- Kept: ai configuration (all false)
- Removed: common values

#### `app/config/uat.yaml`
- Kept overrides for: `headless: true`, `parallel: 4`
- Kept: ai configuration (all false)
- Removed: common values

### 4. Updated Hooks (`app/step_definition/hooks.js`)

**Change:** Updated to use timeout from configuration instead of hardcoded value

```javascript
import configManager from '../../framework/config/ConfigManager.js';

const timeoutMs = configManager.getExecutionConfig().timeout || 30000;
setDefaultTimeout(timeoutMs);
```

### 5. Updated AngularDemoPage (`framework/pages/AngularDemoPage.js`)

**Change:** Now uses baseUrl from YAML configuration instead of hardcoded URL

```javascript
import configManager from '../config/ConfigManager.js';

class AngularDemoPage extends BasePage {
  constructor(page) {
    super(page);
    const uiConfig = configManager.getUiConfig();
    this.searchUrl = uiConfig.baseUrl || 'https://angular.dev';
    // ...
  }
}
```

## Usage Examples

### Setting Environment via .env File

Simply update the `ENVIRONMENT` variable in `.env`:

```bash
# In .env file
ENVIRONMENT=dev     # Will load dev.yaml

ENVIRONMENT=prod    # Will load prod.yaml

ENVIRONMENT=qa      # Will load qa.yaml
```

Then run tests normally:
```bash
npm test
```

### Running Tests with Different Environments (Command Line Override)

Command-line arguments override the `.env` ENVIRONMENT setting:

```bash
# Override .env setting (ENVIRONMENT=qa) with dev
npm test -- --env dev

# Override .env setting with prod
npm test -- --env prod

# Override .env setting with uat
npm test -- --env uat
```

### Running Tests with System Environment Variable (Highest Priority)

System environment variables override both `.env` and command-line arguments:

```bash
# Override both .env and command line args
TEST_ENV=qa npm test

TEST_ENV=dev npm test -- --env prod   # dev wins (TEST_ENV has highest priority)

# In Windows (PowerShell)
$env:TEST_ENV="uat"; npm test
```

### Changing Environment in .env for CI/CD Pipelines

In Docker or CI/CD environments, you can inject the `.env` file at runtime:

```dockerfile
# Dockerfile example
COPY .env.prod .env
RUN npm test

# Or use environment variable injection
ENV ENVIRONMENT=prod
```

## AI Features Control via .env

The AI features are now fully controlled by the `AI_ENABLED`, `AI_EXECUTION`, and `AI_GENERATION` variables in the `.env` file:

### AI Configuration Variables

```env
# AI Features
# AI_ENABLED: Master switch for all AI features (must be true for any AI feature to work)
AI_ENABLED=true

# AI_EXECUTION: Enables Agentic AI for runtime capabilities
#   - Locator self-healing
#   - Failure analysis
#   - Test impact prediction
AI_EXECUTION=true

# AI_GENERATION: Enables Agentic AI for test generation and enhancement
#   - Test case generation
#   - Dynamic assertion generation
#   - Code suggestions
AI_GENERATION=true
```

### AI Feature Dependency Hierarchy

```
AI_ENABLED (Master switch)
├── AI_EXECUTION (Runtime AI capabilities)
│   ├── Locator self-healing (if AI_EXECUTION=true)
│   ├── Failure analysis (if AI_EXECUTION=true)
│   └── Test impact prediction (if AI_EXECUTION=true)
│
└── AI_GENERATION (Test generation capabilities)
    ├── Test case generation (if AI_GENERATION=true)
    ├── Dynamic assertions (if AI_GENERATION=true)
    └── Code suggestions (if AI_GENERATION=true)
```

### Enabling/Disabling AI Features

#### Enable All AI Features (Default QA Environment)
```env
AI_ENABLED=true
AI_EXECUTION=true
AI_GENERATION=true
```

#### Disable All AI Features (Production Environment)
```env
AI_ENABLED=false
AI_EXECUTION=false
AI_GENERATION=false
```

#### Execution Only (Runtime Fixes, No Generation)
```env
AI_ENABLED=true
AI_EXECUTION=true
AI_GENERATION=false
```

### Example .env Configurations by Environment

**QA Environment (.env for QA testing with full AI support)**
```env
ENVIRONMENT=qa
AI_ENABLED=true
AI_EXECUTION=true
AI_GENERATION=true
```

**Dev Environment (.env for developer testing)**
```env
ENVIRONMENT=dev
AI_ENABLED=true
AI_EXECUTION=true
AI_GENERATION=true
HEADLESS=false
```

**Production Environment (.env for production-like testing)**
```env
ENVIRONMENT=prod
AI_ENABLED=false
AI_EXECUTION=false
AI_GENERATION=false
HEADLESS=true
PARALLEL=4
```

### Framework Integration

The AI features are integrated in the following components:

#### 1. **BrowserManager** (`framework/browser/BrowserManager.js`)
- Checks `agenticAiManager.isExecutionEnabled` before attempting locator self-healing
- Falls back to manual fallback selectors if AI is disabled
- Logs when AI healing is skipped

#### 2. **AgenticAiManager** (`framework/ai/AgenticAiManager.js`)
- Uses `configManager.getAiConfig()` to read AI settings
- `isAiEnabled`: Master control for all AI features
- `isExecutionEnabled`: Controls runtime AI capabilities (locator healing, failure analysis)
- `isGenerationEnabled`: Controls test generation capabilities

#### 3. **Hooks** (`app/step_definition/hooks.js`)
- Logs AI configuration at test startup
- Calls `agenticAiManager.analyzeFailure()` when scenarios fail (if execution enabled)
- Respects AI disabled state during failure handling

### Testing AI Feature Control

#### Test with AI Disabled
```bash
# Update .env
ENVIRONMENT=prod  # or any environment with AI_ENABLED=false

# Run tests
npm test

# You'll see in logs:
# "Agentic AI Healing is disabled. Skipping AI-based selector recovery."
# "Agentic AI: Execution capability is disabled."
```

#### Test with AI Execution Only
```bash
# Update .env
AI_ENABLED=true
AI_EXECUTION=true
AI_GENERATION=false

# Run tests - locator healing will work but test generation won't
npm test
```

#### Test with Full AI
```bash
# Update .env
AI_ENABLED=true
AI_EXECUTION=true
AI_GENERATION=true

# Run tests - all AI features enabled
npm test
```

#### Override via System Environment Variables
```bash
# Disable AI execution but keep generation enabled
AI_EXECUTION=false npm test

# Disable all AI
AI_ENABLED=false npm test

# Override environment-specific AI settings
TEST_ENV=prod AI_EXECUTION=true npm test
```

### Log Output Examples

**When AI Execution is ENABLED:**
```
INFO: AI Configuration: Enabled=true, Execution=true, Generation=true
INFO: Agentic AI: Commencing locator self-healing for: ".broken-selector"
INFO: Agentic AI Healing SUCCESS! Healed selector: ".valid-selector"
```

**When AI Execution is DISABLED:**
```
INFO: AI Configuration: Enabled=true, Execution=false, Generation=false
DEBUG: Agentic AI Healing is disabled. Skipping AI-based selector recovery.
DEBUG: All locator strategies and self-healing failed for primary selector
```

### Priority of AI Configuration

The AI settings follow the same priority order as other configurations:

1. **System Environment Variables** (highest priority)
   ```bash
   AI_ENABLED=false npm test
   ```

2. **Command-line Arguments** (not directly supported for AI, but for environment selection)
   ```bash
   npm test -- --env prod  # Uses prod.yaml AI settings
   ```

3. **Environment-specific YAML** (optional override)
   ```yaml
   # app/config/qa.yaml
   ai:
     enabled: true
     execution: true
     generation: true
   ```

4. **.env File** (default)
   ```
   AI_ENABLED=true
   ```

### Monitoring AI Feature Usage

All AI feature invocations are logged with the prefix `Agentic AI:`. Filter logs to monitor AI usage:

```bash
# View only AI-related logs
grep "Agentic AI" test_logs/*.log

# Count AI healing attempts
grep "locator self-healing" test_logs/*.log | wc -l

# Check failure analysis
grep "Failure Analysis" test_logs/*.log
```


## Benefits

1. **DRY Principle:** Eliminates duplicate common values across multiple YAML files
2. **Maintainability:** Update common values in one place (`.env`) instead of four YAML files
3. **Flexibility:** Easy to override any value via:
   - Environment-specific YAML files
   - System environment variables
   - CI/CD pipeline variables
4. **Cleaner YAML Files:** Each YAML file now only contains what's unique to that environment
5. **Better CI/CD Integration:** Perfect for Docker and cloud deployments where `.env` can be injected at runtime

## Migration Checklist

- [x] Created `.env` file with common values
- [x] Updated `ConfigManager.js` to load and apply .env defaults
- [x] Cleaned up all YAML files (qa.yaml, dev.yaml, prod.yaml, uat.yaml)
- [x] Updated `hooks.js` to use timeout from config
- [x] Updated `AngularDemoPage.js` to use baseUrl from config
- [x] Maintained backward compatibility with existing code
- [x] Environment variable override functionality preserved

## Backward Compatibility

- All existing tests will continue to work without any changes
- The priority system ensures that more specific values override defaults
- System environment variables still work as expected
- No breaking changes to the ConfigManager API
