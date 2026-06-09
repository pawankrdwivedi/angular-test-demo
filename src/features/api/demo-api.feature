
Feature: Customer validation

  @api
  Scenario Outline: Validate customer details
    Given user loads test data "<TestCaseID>"
    When user submits customer API
    Then response status should be 200
    And customer should exist in database

    Examples:
      | TestCaseID |
      | TC001      |
      | TC002      |
