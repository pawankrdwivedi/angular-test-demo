import { chromium } from 'playwright';
import configManager from '../config/ConfigManager.js';
import logger from '../logger/Logger.js';

// Parse command line arguments
const args = process.argv.slice(2);
let url = null;
let clickSelector = null;
let timeoutVal = configManager.getExecutionConfig().timeout;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg.startsWith('--url=')) {
    url = arg.split('=')[1];
  } else if (arg === '--url' && i + 1 < args.length) {
    url = args[i + 1];
    i++;
  } else if (arg.startsWith('--click=')) {
    clickSelector = arg.split('=')[1];
  } else if (arg === '--click' && i + 1 < args.length) {
    clickSelector = args[i + 1];
    i++;
  } else if (arg.startsWith('--timeout=')) {
    timeoutVal = parseInt(arg.split('=')[1], 10);
  } else if (arg === '--timeout' && i + 1 < args.length) {
    timeoutVal = parseInt(args[i + 1], 10);
    i++;
  }
}

// Fallback to configured base URL if not provided
if (!url) {
  try {
    const uiConfig = configManager.getUiConfig();
    url = uiConfig.baseUrl;
    logger.info(`No URL provided. Falling back to configured baseUrl: ${url}`);
  } catch (err) {
    url = 'https://angular.dev';
    logger.warn(`Could not load configuration. Defaulting target URL to: ${url}`);
  }
}

(async () => {
  logger.info(`Initializing Playwright chromium browser...`);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    logger.info(`Navigating to: ${url}`);
    await page.goto(url, { timeout: timeoutVal });
    await page.waitForLoadState('domcontentloaded');

    if (clickSelector) {
      logger.info(`Clicking target element: "${clickSelector}"`);
      await page.click(clickSelector, { timeout: timeoutVal });
      
      // Wait for transitions/animations to finish using configured timeout.
      logger.info(`Waiting for UI transitions to stabilize using configured timeout...`);
      await page.waitForTimeout(timeoutVal);
    }

    logger.info(`Analyzing DOM structure for potential interactive elements...`);
    const domSummary = await page.evaluate(() => {
      const allElements = Array.from(document.querySelectorAll('*'));
      
      // Filter potential dialogs/modals
      const dialogs = allElements
        .filter(el => {
          const cls = el.className && typeof el.className === 'string' ? el.className.toLowerCase() : '';
          const id = el.id && typeof el.id === 'string' ? el.id.toLowerCase() : '';
          const role = el.getAttribute('role') || '';
          const tagName = el.tagName.toLowerCase();
          
          return tagName === 'dialog' || 
                 role.includes('dialog') || 
                 role.includes('modal') || 
                 cls.includes('dialog') || 
                 cls.includes('modal') || 
                 cls.includes('search') || 
                 id.includes('dialog') || 
                 id.includes('modal') || 
                 id.includes('search');
        })
        .map(el => ({
          tagName: el.tagName,
          className: el.className,
          id: el.id,
          role: el.getAttribute('role') || '',
          htmlSnippet: el.outerHTML.substring(0, 150)
        }));

      // Find inputs
      const inputs = Array.from(document.querySelectorAll('input, select, textarea')).map(el => ({
        tagName: el.tagName.toLowerCase(),
        type: el.getAttribute('type') || '',
        className: el.className,
        id: el.id,
        placeholder: el.getAttribute('placeholder') || '',
        name: el.getAttribute('name') || '',
        htmlSnippet: el.outerHTML.substring(0, 150)
      }));

      // Find buttons
      const buttons = Array.from(document.querySelectorAll('button, a[role="button"], input[type="button"], input[type="submit"]')).map(el => ({
        tagName: el.tagName.toLowerCase(),
        text: el.innerText.trim().substring(0, 50),
        className: el.className,
        id: el.id,
        role: el.getAttribute('role') || '',
        htmlSnippet: el.outerHTML.substring(0, 150)
      }));

      return { dialogs, inputs, buttons };
    });

    console.log('\n======================================================');
    console.log(`🔎 SELECTOR INSPECTOR RESULTS FOR: ${url}`);
    console.log('======================================================');

    console.log(`\n📂 Potential Dialogs/Modals/Containers (${domSummary.dialogs.length} found):`);
    domSummary.dialogs.slice(0, 10).forEach((d, idx) => {
      console.log(`  [${idx + 1}] <${d.tagName}> id="${d.id}" class="${d.className}" role="${d.role}"`);
      console.log(`      Snippet: ${d.htmlSnippet}...`);
    });
    if (domSummary.dialogs.length > 10) console.log(`  ... and ${domSummary.dialogs.length - 10} more.`);

    console.log(`\n📝 Form Inputs/Controls (${domSummary.inputs.length} found):`);
    domSummary.inputs.forEach((i, idx) => {
      console.log(`  [${idx + 1}] <${i.tagName}> type="${i.type}" name="${i.name}" id="${i.id}" placeholder="${i.placeholder}"`);
      console.log(`      Snippet: ${i.htmlSnippet}...`);
    });

    console.log(`\n🖱️ Interactive Buttons/Clickables (${domSummary.buttons.length} found):`);
    domSummary.buttons.slice(0, 15).forEach((b, idx) => {
      console.log(`  [${idx + 1}] <${b.tagName}> text="${b.text}" id="${b.id}" class="${b.className}"`);
      console.log(`      Snippet: ${b.htmlSnippet}...`);
    });
    if (domSummary.buttons.length > 15) console.log(`  ... and ${domSummary.buttons.length - 15} more.`);
    console.log('\n======================================================\n');

  } catch (error) {
    logger.error(`Selector inspection failed: ${error.message}`);
  } finally {
    logger.info(`Closing browser context.`);
    await browser.close();
  }
})();
