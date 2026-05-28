import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import excelReader from '../data/ExcelReader.js';
import logger from '../logger/Logger.js';

class EtlValidator {
  /**
   * Compares two datasets (arrays of objects) and returns a detailed reconciliation report.
   */
  compareDatasets(sourceData, targetData, primaryKey) {
    logger.info(`Reconciling datasets. Source rows: ${sourceData.length}, Target rows: ${targetData.length}. Key: ${primaryKey}`);

    const report = {
      sourceCount: sourceData.length,
      targetCount: targetData.length,
      isCountMatching: sourceData.length === targetData.length,
      missingInTarget: [],
      missingInSource: [],
      mismatchedRows: [],
      isValid: true,
    };

    const sourceMap = new Map(sourceData.map(row => [String(row[primaryKey] || '').trim(), row]));
    const targetMap = new Map(targetData.map(row => [String(row[primaryKey] || '').trim(), row]));

    // 1. Check for missing in target & differences
    for (const [key, sourceRow] of sourceMap.entries()) {
      if (!targetMap.has(key)) {
        report.missingInTarget.push(sourceRow);
        report.isValid = false;
        continue;
      }

      const targetRow = targetMap.get(key);
      const differences = {};
      let hasDiff = false;

      // Compare column by column
      for (const col of Object.keys(sourceRow)) {
        const sourceVal = String(sourceRow[col] || '').trim();
        const targetVal = String(targetRow[col] || '').trim();

        if (sourceVal !== targetVal) {
          differences[col] = { source: sourceRow[col], target: targetRow[col] };
          hasDiff = true;
        }
      }

      if (hasDiff) {
        report.mismatchedRows.push({
          primaryKey: key,
          differences,
        });
        report.isValid = false;
      }
    }

    // 2. Check for missing in source
    for (const [key, targetRow] of targetMap.entries()) {
      if (!sourceMap.has(key)) {
        report.missingInSource.push(targetRow);
        report.isValid = false;
      }
    }

    if (!report.isValid) {
      logger.warn(`ETL Reconciliation failed: CountMatch=${report.isCountMatching}, MissingTarget=${report.missingInTarget.length}, MissingSource=${report.missingInSource.length}, MismatchedRows=${report.mismatchedRows.length}`);
    } else {
      logger.info('ETL Reconciliation completed successfully. No mismatches found.');
    }

    return report;
  }

  /**
   * Reads and parses a CSV file.
   */
  readCsv(filePath) {
    const resolvedPath = path.isAbsolute(filePath) 
      ? filePath 
      : path.join(process.cwd(), filePath);

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`CSV file not found at: ${resolvedPath}`);
    }

    logger.debug(`Reading CSV file: ${resolvedPath}`);
    const fileContent = fs.readFileSync(resolvedPath, 'utf8');
    return parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
  }

  /**
   * Reads and parses an Excel sheet.
   */
  readExcel(filePath, sheetName) {
    return excelReader.readSheet(filePath, sheetName);
  }

  /**
   * Compares two CSV files directly.
   */
  compareCsvFiles(sourcePath, targetPath, primaryKey) {
    const sourceData = this.readCsv(sourcePath);
    const targetData = this.readCsv(targetPath);
    return this.compareDatasets(sourceData, targetData, primaryKey);
  }

  /**
   * Validates if row count matches.
   */
  validateRowCounts(sourceData, targetData) {
    const sourceCount = sourceData.length;
    const targetCount = targetData.length;
    const matches = sourceCount === targetCount;
    logger.info(`Row count validation: Source=${sourceCount}, Target=${targetCount}, Match=${matches}`);
    return { sourceCount, targetCount, matches };
  }

  /**
   * Performs aggregate validations (SUM, AVG, MIN, MAX) on a specific field.
   */
  validateAggregate(dataset, fieldName, type) {
    const values = dataset
      .map(row => parseFloat(row[fieldName]))
      .filter(val => !isNaN(val));

    if (values.length === 0) {
      logger.warn(`No numeric values found in column: ${fieldName} for aggregate computation.`);
      return 0;
    }

    let result = 0;
    switch (type.toUpperCase()) {
      case 'SUM':
        result = values.reduce((sum, val) => sum + val, 0);
        break;
      case 'AVG':
      case 'AVERAGE':
        result = values.reduce((sum, val) => sum + val, 0) / values.length;
        break;
      case 'MIN':
        result = Math.min(...values);
        break;
      case 'MAX':
        result = Math.max(...values);
        break;
      default:
        throw new Error(`Unsupported aggregate validation type: ${type}`);
    }

    logger.debug(`Calculated aggregate ${type.toUpperCase()}(${fieldName}) = ${result}`);
    return result;
  }
}

export default new EtlValidator();
export { EtlValidator };
