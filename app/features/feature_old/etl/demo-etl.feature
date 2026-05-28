Feature: ETL Data Validation and Reconciliation

  @etl
  Scenario Outline: Validate customer data warehouse records
    Given user loads ETL test data "<TestCaseID>"
    When user reconciles source CSV file with target CSV file
    Then row counts should match
    And columns and values should reconcile perfectly
    And aggregate field values should match expected calculation

    Examples:
      | TestCaseID |
      | TC001      |
