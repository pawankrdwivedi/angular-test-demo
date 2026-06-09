Feature: Component Testing with Mock Data

  Background:
    Given user launches application
    When user initializes mock data mode

  @component @mock
  Scenario: Generate mock user data
    When user generates mock data of type "user"
    Then mock data should have been generated
    And mock data should contain field "email"
    And mock data should contain field "firstName"
    And mock data should contain field "lastName"

  @component @mock
  Scenario: Generate multiple mock customers
    When user generates 5 mock items of type "customer"
    Then mock data list should contain 5 items
    And print mock statistics

  @component @mock
  Scenario: Setup e-commerce mock scenario
    When user sets up mock scenario "ecommerce"
    Then mock mode should be active
    And print mock statistics

  @component @mock
  Scenario: Register mock endpoint with user generator
    When user registers mock endpoint "/api/users" with generator "user"
    Then mock mode should be active

  @component @mock
  Scenario: Register multiple mock endpoints
    When user registers mock endpoints
      | endpoint        | generator | statusCode |
      | /api/users      | user      | 200        |
      | /api/customers  | customer  | 200        |
      | /api/products   | product   | 200        |
    Then mock mode should be active

  @component @mock
  Scenario: Mock error responses
    When user generates mock error response with code "NOT_FOUND"
    Then error response should have code "NOT_FOUND"

  @component @mock
  Scenario: List all available mock templates
    When user lists available mock templates
    Then at least 1 mock templates should be available
    And print mock statistics

  @component @mock @ui
  Scenario: Load page with mock data
    When user initializes mock data mode with template "dashboard"
    And user navigates to Angular documentation page
    Then user should see dashboard content

  @component @mock
  Scenario: Verify component with mock data
    When user initializes mock data mode with template "ecommerce"
    And user navigates to products page
    Then component ".product-list" should be visible
    And component ".product-item" should have 10 items
