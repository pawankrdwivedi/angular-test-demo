Feature: Angular Documentation UI Search

  @ui
  Scenario: Execute generated Cucumber test case
    When user navigates to Angular documentation page
    And user searches for query from test data
    Then search result dialog should be visible
