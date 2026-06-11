Feature: Component Testing with Mock Data

  @component @mock
  Scenario: Verify component with network playback mock
    When user initializes network playback mode for scenario "ecommerce"
    And user navigates to Angular documentation page
    Then component ".docs-search-results" should be visible
