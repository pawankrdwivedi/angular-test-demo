import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import agenticAiManager from '../ai/AgenticAiManager.js';

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


// Parse command line arguments
const args = process.argv.slice(2);
let type = null;
let name = null;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg.startsWith('--type=')) {
    type = arg.split('=')[1].toLowerCase();
  } else if (arg === '--type' && i + 1 < args.length) {
    type = args[i + 1].toLowerCase();
    i++;
  } else if (arg.startsWith('--name=')) {
    name = arg.split('=')[1];
  } else if (arg === '--name' && i + 1 < args.length) {
    name = args[i + 1];
    i++;
  }
}

if (!type || !name) {
  console.log('\n❌ Error: Missing required arguments.');
  console.log('Usage: npm run generate:testcase -- --type=<cucumber|playwright> --name=<testcase_name>\n');
  process.exit(1);
}

// Sanitize name
const sanitizedName = name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();

/**
 * Resolves template content, checking first for user overrides in app/templates
 * and falling back to framework/templates.
 */
function getTemplateContent(templateName) {
  const customTemplatePath = path.join(process.cwd(), 'app', 'templates', templateName);
  const defaultTemplatePath = path.join(process.cwd(), 'qe-framework-core', 'templates', templateName);

  if (fs.existsSync(customTemplatePath)) {
    console.log(`[Generator] Using custom user template: app/templates/${templateName}`);
    return fs.readFileSync(customTemplatePath, 'utf8');
  }

  if (fs.existsSync(defaultTemplatePath)) {
    console.log(`[Generator] Using default template: qe-framework-core/templates/${templateName}`);
    return fs.readFileSync(defaultTemplatePath, 'utf8');
  }

  console.log(`\n❌ Error: Template file "${templateName}" not found in default or custom paths.\n`);
  process.exit(1);
}

/**
 * Replaces template placeholders.
 */
function fillTemplate(content, testName, testSanitizedName) {
  return content
    .replace(/\{\{name\}\}/g, testName)
    .replace(/\{\{sanitizedName\}\}/g, testSanitizedName);
}

if (type === 'cucumber') {
  const featuresDir = process.env.DIR_FEATURES || 'features';
  const stepDefinitionsDir = process.env.DIR_STEP_DEFINITIONS || 'step_definition';

  const basePath = fs.existsSync(path.join(process.cwd(), 'app')) ? 'app' : '';
  const featureDir = path.join(process.cwd(), basePath, featuresDir);
  const stepDir = path.join(process.cwd(), basePath, featuresDir, stepDefinitionsDir);

  // Ensure directories exist
  fs.mkdirSync(featureDir, { recursive: true });
  fs.mkdirSync(stepDir, { recursive: true });

  const featurePath = path.join(featureDir, `${sanitizedName}.feature`);
  const stepPath = path.join(stepDir, `${sanitizedName}_steps.js`);

  if (fs.existsSync(featurePath) || fs.existsSync(stepPath)) {
    console.log(`\n❌ Error: Cucumber files for "${sanitizedName}" already exist.\n`);
    process.exit(1);
  }

  // Load and fill templates
  const featureRaw = getTemplateContent('cucumber.feature.template');
  const stepRaw = getTemplateContent('cucumber-steps.js.template');

  const featureFilled = fillTemplate(featureRaw, name, sanitizedName);
  const stepFilled = fillTemplate(stepRaw, name, sanitizedName);

  // Apply Agentic AI generation if active
  const featureFinal = await agenticAiManager.generateTestCase('cucumber-feature', name, featureFilled);
  const stepFinal = await agenticAiManager.generateTestCase('cucumber-steps', name, stepFilled);

  fs.writeFileSync(featurePath, featureFinal);
  fs.writeFileSync(stepPath, stepFinal);

  console.log(`\n🎉 Success! Generated Cucumber test files:`);
  console.log(`   - Feature: ${basePath ? basePath + '/' : ''}${featuresDir}/${sanitizedName}.feature`);
  console.log(`   - Step Defs: ${basePath ? basePath + '/' : ''}${featuresDir}/${stepDefinitionsDir}/${sanitizedName}_steps.js\n`);

} else if (type === 'playwright') {
  const basePath = fs.existsSync(path.join(process.cwd(), 'app')) ? 'app' : '';
  const testDir = path.join(process.cwd(), basePath, process.env.DIR_TEST || 'test');

  // Ensure directory exists
  fs.mkdirSync(testDir, { recursive: true });

  const specPath = path.join(testDir, `${sanitizedName}.spec.js`);

  if (fs.existsSync(specPath)) {
    console.log(`\n❌ Error: Playwright spec file for "${sanitizedName}" already exist.\n`);
    process.exit(1);
  }

  // Load and fill templates
  const specRaw = getTemplateContent('playwright.spec.js.template');
  const specFilled = fillTemplate(specRaw, name, sanitizedName);

  // Apply Agentic AI generation if active
  const specFinal = await agenticAiManager.generateTestCase('playwright-spec', name, specFilled);

  fs.writeFileSync(specPath, specFinal);

  console.log(`\n🎉 Success! Generated Playwright hybrid POM test file:`);
  console.log(`   - Spec: ${basePath ? basePath + '/' : ''}${process.env.DIR_TEST || 'test'}/${sanitizedName}.spec.js\n`);

} else {
  console.log(`\n❌ Error: Invalid type "${type}". Supported types are "cucumber" and "playwright".\n`);
  process.exit(1);
}
