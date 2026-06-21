# Application-Specific Configuration Guide

This framework now supports loading environment configurations and test cases specific to different applications. This allows you to maintain multiple applications with their own:
- Environment configurations (YAML files)
- Test cases (Feature files)
- Test data and step definitions

## Quick Start

### 1. Set the Application in .env

Edit the `.env` file in the project root:

```env
APPLICATION=myapp
ENVIRONMENT=qa
```

### 2. Create Application-Specific Directories

Create directories for your application's configurations and tests:

```
app/
├── config/
│   ├── default/           # Optional: default configs (used when fallback is needed)
│   ├── myapp/            # Application-specific configs
│   │   ├── dev.yaml
│   │   ├── qa.yaml
│   │   ├── uat.yaml
│   │   └── prod.yaml
│   ├── dev.yaml          # Default dev config (fallback)
│   ├── qa.yaml           # Default qa config (fallback)
│   ├── uat.yaml          # Default uat config (fallback)
│   └── prod.yaml         # Default prod config (fallback)
└── features/
    ├── default/          # Optional: default features
    ├── myapp/           # Application-specific features
    │   ├── login.feature
    │   ├── dashboard.feature
    │   └── reports.feature
    └── generic/         # Shared features (optional)
        └── common.feature
```

## Usage Scenarios

### Scenario 1: Single Default Application

If you only have one application and don't want to use the application-specific structure, simply:
- Keep `APPLICATION=default` in `.env`
- Use the existing config and features directories as-is
- No changes needed to your structure

### Scenario 2: Multiple Applications

If you manage multiple applications:

**Step 1: Create application directories**
```bash
# Create config directories
mkdir -p app/config/app-customer
mkdir -p app/config/app-admin

# Create features directories
mkdir -p app/features/app-customer
mkdir -p app/features/app-admin
```

**Step 2: Move or create configs for each app**
```
app/config/
├── app-customer/
│   ├── dev.yaml
│   ├── qa.yaml
│   └── prod.yaml
└── app-admin/
    ├── dev.yaml
    ├── qa.yaml
    └── prod.yaml
```

**Step 3: Move or create features for each app**
```
app/features/
├── app-customer/
│   ├── customer-login.feature
│   ├── customer-dashboard.feature
│   └── order-management.feature
└── app-admin/
    ├── admin-login.feature
    ├── user-management.feature
    └── reports.feature
```

### Scenario 3: Shared Test Data and Steps

Some test data and step definitions might be shared across applications. You can:
- Keep shared step definitions in `app/step-definitions/`
- Keep shared test data in `app/test-data/`
- Use tags in feature files to mark app-specific scenarios

## How to Run Tests

### Run for Default Application
```bash
npm test
# or
npm run test:cucumber
```

This will run all features in `app/features/**/*.feature`

### Run for Specific Application

**Using .env**
```bash
# Edit .env and set APPLICATION=myapp, then run:
npm test
```

**Using Command Line (--app flag)**
```bash
npm test -- --app=myapp
```

**Combined with environment flag**
```bash
npm test -- --app=myapp --env=qa
```

### Run Specific Features with Application Context

```bash
# Run only customer login feature for myapp application
npm test -- --app=myapp app/features/myapp/login.feature

# Run specific tags for an application
npm test -- --app=admin-app --tags @smoke
```

## Configuration Loading Priority

The framework determines which configuration to load using this priority order:

### For Application:
1. `--app=xxx` command line argument (highest priority)
2. `APPLICATION` environment variable
3. `APPLICATION` variable in `.env` file
4. Default: `default` (uses root-level config/features)

### For Environment:
1. `--env=xxx` command line argument
2. `TEST_ENV` environment variable
3. `ENVIRONMENT` variable in `.env` file
4. Default: `qa`

### Configuration File Loading:
1. First, tries to load `app/config/{application}/{environment}.yaml`
2. If not found, falls back to `app/config/{environment}.yaml`
3. Logs a warning if app-specific config not found
4. Throws error if neither exists

### Features Loading:
1. If application is not `default`, uses `app/features/{application}/**/*.feature`
2. If application is `default`, uses `app/features/**/*.feature`

## Examples

### Example 1: Customer Application, QA Environment
```bash
# Set in .env
APPLICATION=customer-app
ENVIRONMENT=qa

# Or use command line
npm test -- --app=customer-app --env=qa

# Will load: app/config/customer-app/qa.yaml
# Will run: app/features/customer-app/**/*.feature
```

### Example 2: Admin Application, Production
```bash
npm test -- --app=admin-app --env=prod

# Will load: app/config/admin-app/prod.yaml
# Will run: app/features/admin-app/**/*.feature
```

### Example 3: Default Application, Development
```bash
npm test -- --app=default --env=dev

# Will load: app/config/dev.yaml
# Will run: app/features/**/*.feature
```

## Accessing Application Name in Code

In your step definitions, page objects, or other code:

```javascript
import ConfigManager from './framework/config/config-manager.js';

const config = new ConfigManager();
const application = config.getApplication();
const environment = config.getEnvironment();

logger.info(`Running tests for ${application} in ${environment}`);
```

## Best Practices

1. **Keep common logic shared**: If features are very similar, consider using tags instead of duplicating files
2. **Organize by feature, not by application**: If creating many applications, consider organizing features by business capability
3. **Use meaningful names**: Use descriptive application names like `customer-portal`, `admin-dashboard`, not `app1`, `app2`
4. **Document your applications**: Maintain a list of available applications in your README
5. **Use .env for defaults**: Set the most commonly used application in `.env` to reduce command line typing
6. **Fallback strategy**: Consider keeping shared configs in the default location for fallback when app-specific ones aren't found

## Troubleshooting

### Issue: "Configuration file not found"
- Check that the config file exists at `app/config/{application}/{environment}.yaml`
- Verify that you haven't made a typo in the application name
- Check the fallback location `app/config/{environment}.yaml`

### Issue: No test features found
- Verify that features exist at `app/features/{application}/**/*.feature`
- Check that the application name matches the directory name
- Run with verbose logging to see which path is being searched

### Issue: Wrong config loaded
- Check the log output: "Loading configuration for application: X"
- Verify the priority order (command line > env var > .env file)
- Remember that config loading falls back to default location if app-specific not found

## Configuration File Structure Example

Create application-specific YAML files at `app/config/{application}/{environment}.yaml`:

```yaml
# app/config/myapp/qa.yaml
ui:
  baseUrl: https://qa-myapp.example.com
  timeout: 30000

api:
  baseUrl: https://api-qa.example.com
  timeout: 10000

database:
  host: qa-db.example.com
  port: 5432
  name: myapp_qa
  user: qa_user
  password: ${DB_PASSWORD}

execution:
  browser: chromium
  headless: false
  parallel: 2
  timeout: 30000

ai:
  enabled: true
  execution: true
  generation: true
```

## See Also
- [README.md](README.md) - Main project documentation
- [CONFIGURATION_MIGRATION.md](CONFIGURATION_MIGRATION.md) - Configuration management details
- [ConfigManager.js](framework/config/config-manager.js) - Configuration manager source code
