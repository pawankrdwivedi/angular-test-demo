import assert from 'assert';
import logger from '../logger/Logger.js';

class SoftAssert {
  constructor() {
    this.failures = [];
  }

  /**
   * Evaluates a condition and stores the error if it is false.
   */
  assertTrue(condition, message) {
    try {
      assert.ok(condition, message);
      logger.info(`Assertion PASSED: ${message}`);
    } catch (error) {
      logger.error(`Soft Assertion FAILED: ${message}`);
      this.failures.push(error.message);
    }
  }

  /**
   * Evaluates quality of two items and stores error if mismatch.
   */
  assertEquals(actual, expected, message) {
    try {
      assert.strictEqual(actual, expected, message);
      logger.info(`Assertion PASSED: ${message} (Actual: "${actual}", Expected: "${expected}")`);
    } catch (error) {
      const detailedMessage = `${message} - Expected: "${expected}", Actual: "${actual}"`;
      logger.error(`Soft Assertion FAILED: ${detailedMessage}`);
      this.failures.push(detailedMessage);
    }
  }

  /**
   * Asserts if actual value contains expected substring
   */
  assertContains(actual, substring, message) {
    try {
      assert.ok(
        String(actual).includes(substring),
        `${message} - Expected "${actual}" to contain "${substring}"`
      );
      logger.info(`Assertion PASSED: ${message} ("${actual}" contains "${substring}")`);
    } catch (error) {
      logger.error(`Soft Assertion FAILED: ${error.message}`);
      this.failures.push(error.message);
    }
  }

  /**
   * Evaluates database result count matches expected.
   */
  assertRowCount(rows, expectedCount, message) {
    this.assertEquals(rows.length, expectedCount, message);
  }

  /**
   * Checks if all soft assertions passed, throws error if there are failures.
   */
  assertAll() {
    if (this.failures.length > 0) {
      const failureMessage = `Soft Assertion Failures Count: ${this.failures.length}\n` + 
        this.failures.map((err, idx) => `  ${idx + 1}. ${err}`).join('\n');
      
      logger.error(failureMessage);
      this.failures = []; // reset for next steps/runs
      throw new Error(failureMessage);
    }
    logger.info('All assertions verified successfully.');
  }
}

export default SoftAssert;
export { SoftAssert };
