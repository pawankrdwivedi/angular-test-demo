import xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';
import logger from '../logger/Logger.js';

class TestAssetGenerator {
  /**
   * Generates all Excel and CSV assets defined in a configuration JSON file.
   * @param {string} configPath Path to the test-assets config file.
   */
  generateAssets(configPath) {
    const resolvedConfigPath = path.isAbsolute(configPath)
      ? configPath
      : path.join(process.cwd(), configPath);

    if (!fs.existsSync(resolvedConfigPath)) {
      logger.warn(`Test assets config not found at: ${resolvedConfigPath}. Skipping asset generation.`);
      return;
    }

    logger.info(`Generating test assets from configuration: ${resolvedConfigPath}`);
    try {
      const configContent = fs.readFileSync(resolvedConfigPath, 'utf8');
      const config = JSON.parse(configContent);

      const basePath = fs.existsSync(path.join(process.cwd(), 'app')) ? 'app' : '';
      const envDir = process.env.DIR_TEST_DATA;

      // 1. Process Excel Generation
      if (config.excel && Array.isArray(config.excel)) {
        for (const excelConfig of config.excel) {
          const { fileName, sheets } = excelConfig;
          const envExcel = process.env.FILE_TEST_DATA_EXCEL;
          
          let resolvedFilePath;
          if (envDir && envExcel) {
            resolvedFilePath = path.isAbsolute(envExcel) ? envExcel : path.join(process.cwd(), basePath, envDir, envExcel);
          } else {
            resolvedFilePath = path.isAbsolute(fileName) ? fileName : path.join(process.cwd(), fileName);
          }
          
          const fileDir = path.dirname(resolvedFilePath);

          // Ensure parent directory exists
          if (!fs.existsSync(fileDir)) {
            fs.mkdirSync(fileDir, { recursive: true });
          }

          logger.info(`Generating Excel: ${resolvedFilePath}`);
          const workbook = xlsx.utils.book_new();

          for (const [sheetName, sheetData] of Object.entries(sheets)) {
            logger.debug(`Adding Sheet: "${sheetName}" with ${sheetData.length} records`);
            
            // Dynamically override paths in sheet rows for ETL validation
            if (sheetName === 'ETL_TestData') {
              const envSource = process.env.FILE_SOURCE_ETL_CSV;
              const envTarget = process.env.FILE_TARGET_ETL_CSV;
              for (const row of sheetData) {
                if (row.sourceFile && envDir && envSource) {
                  row.sourceFile = path.join(basePath, envDir, envSource).replace(/\\/g, '/');
                }
                if (row.targetFile && envDir && envTarget) {
                  row.targetFile = path.join(basePath, envDir, envTarget).replace(/\\/g, '/');
                }
              }
            }

            const worksheet = xlsx.utils.json_to_sheet(sheetData);
            xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);
          }

          xlsx.writeFile(workbook, resolvedFilePath);
          logger.info(`Successfully written Excel file to: ${resolvedFilePath}`);
        }
      }

      // 2. Process CSV Generation
      if (config.csv && Array.isArray(config.csv)) {
        for (const csvConfig of config.csv) {
          const { fileName, content } = csvConfig;
          const isSource = fileName.includes('source');
          const envCsvName = isSource ? process.env.FILE_SOURCE_ETL_CSV : process.env.FILE_TARGET_ETL_CSV;

          let resolvedFilePath;
          if (envDir && envCsvName) {
            resolvedFilePath = path.isAbsolute(envCsvName) ? envCsvName : path.join(process.cwd(), basePath, envDir, envCsvName);
          } else {
            resolvedFilePath = path.isAbsolute(fileName) ? fileName : path.join(process.cwd(), fileName);
          }
          
          const fileDir = path.dirname(resolvedFilePath);

          // Ensure parent directory exists
          if (!fs.existsSync(fileDir)) {
            fs.mkdirSync(fileDir, { recursive: true });
          }

          logger.info(`Generating CSV: ${resolvedFilePath}`);
          fs.writeFileSync(resolvedFilePath, content.trim() + '\n');
          logger.info(`Successfully written CSV file to: ${resolvedFilePath}`);
        }
      }

    } catch (error) {
      logger.error(`Failed to generate test assets: ${error.message}`);
      throw error;
    }
  }
}

export default new TestAssetGenerator();
export { TestAssetGenerator };
