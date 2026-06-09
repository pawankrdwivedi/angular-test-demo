Feature: Angular Documentation UI Search

  @ui
  Scenario: 4. Verify execution when no data exists anywhere
    Given user loads UI test data "TC_NON_EXISTENT_ID"
    When user navigates to Angular documentation page
    And user searches for query from test data
    Then search result dialog should be visible
