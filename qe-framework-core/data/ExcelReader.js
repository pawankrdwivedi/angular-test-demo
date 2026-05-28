import xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';
import logger from '../logger/Logger.js';

class ExcelReader {
  /**
   * Reads a sheet from an Excel file and returns it as an array of JSON objects.
   */
  readSheet(filePath, sheetName) {
    const resolvedPath = path.isAbsolute(filePath) 
      ? filePath 
      : path.join(process.cwd(), filePath);

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Excel file not found at: ${resolvedPath}`);
    }

    logger.debug(`Reading Excel file: ${resolvedPath}, Sheet: ${sheetName}`);
    try {
      const workbook = xlsx.readFile(resolvedPath);
      const matchedSheetName = workbook.SheetNames.find(
        name => name.toLowerCase().replace(/_/g, '') === sheetName.toLowerCase().replace(/_/g, '')
      );
      if (!matchedSheetName) {
        throw new Error(`Sheet "${sheetName}" not found in workbook. Available: ${workbook.SheetNames.join(', ')}`);
      }

      const worksheet = workbook.Sheets[matchedSheetName];
      const data = xlsx.utils.sheet_to_json(worksheet, { defval: '' }); // use empty string for empty cells
      return data;
    } catch (error) {
      logger.error(`Failed to read Excel sheet: ${error.message}`);
      throw error;
    }
  }

  /**
   * Filters the Excel data by a specific TestCaseID.
   */
  getRowByTestCaseId(filePath, sheetName, testCaseId) {
    const rows = this.readSheet(filePath, sheetName);
    
    // Find the row where TestCaseID matches (case-insensitive)
    const matchingRow = rows.find(
      (row) => String(row.TestCaseID || row.testCaseId || row.testcaseid || '').trim().toLowerCase() === String(testCaseId).trim().toLowerCase()
    );

    if (!matchingRow) {
      logger.warn(`No row found matching TestCaseID: "${testCaseId}" in sheet: "${sheetName}"`);
      return null;
    }

    logger.debug(`Found test data for TestCaseID "${testCaseId}": ${JSON.stringify(matchingRow)}`);
    return matchingRow;
  }

  /**
   * Resolves environment-specific values if keys have suffixes like _dev, _qa, etc.
   * e.g., if env is 'qa' and we look for 'baseUrl', it will use 'baseUrl_qa' if present.
   */
  resolveEnvData(data, env) {
    if (!data) return null;
    const resolved = {};
    const suffix = `_${env.toLowerCase()}`;

    // First, copy all generic values
    for (const [key, value] of Object.entries(data)) {
      if (!key.includes('_')) {
        resolved[key] = value;
      }
    }

    // Next, overlay environment-specific values
    for (const [key, value] of Object.entries(data)) {
      if (key.endsWith(suffix)) {
        const baseKey = key.slice(0, -suffix.length);
        resolved[baseKey] = value;
      }
    }

    return resolved;
  }
}

export default new ExcelReader();
export { ExcelReader };
