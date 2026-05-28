Feature: Angular Documentation UI Search

  @ui
  Scenario Outline: Search documentation on Angular website
    Given user loads UI test data "<TestCaseID>"
    When user navigates to Angular documentation page
    And user searches for query from test data
    Then search result dialog should be visible

    Examples:
      | TestCaseID |
      | TC001      |
