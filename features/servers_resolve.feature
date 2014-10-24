Feature: Servers resolve

  Scenario: Server fallback until find a valid server
    Given the following service options values:
      | Key     | Value |
      | timeout | 50    |
      | cache   | true  |
    And the following list of service servers:
      | URI               | Status | Method | Delay | Body |
      | http://timeout    | 503    | GET    | 100   | none |
      | http://localhost  | 503    | GET    | 10    | none |
      | http://localhost  | 503    | GET    | 10    | none |
      | http://valid      | 200    | GET    | 10    | {"name": "Chuck"} |
    And new client is configured
    When define a GET request to "/user"
    And performs the request
    Then response status code should be 200
    And the request has no errors
    And response data should have a "name" field with data "Chuck"

  Scenario: Large scenario of server fallback until find a valid server
    Given the following service options values:
      | Key     | Value |
      | timeout | 50    |
      | cache   | true  |
    And the following list of service servers:
      | URI               | Status | Method | Delay | Body |
      | http://timeout    | 503    | GET    | 100   | none |
      | http://localhost  | 503    | GET    | 10    | none |
      | http://localhost  | 503    | GET    | 10    | none |
      | http://timeout    | 503    | GET    | 100   | none |
      | http://error      | 500    | GET    | 10    | none |
      | http://localhost  | 503    | GET    | 10    | none |
      | http://timeout    | 503    | GET    | 100   | none |
      | http://localhost  | 503    | GET    | 10    | none |
      | http://error      | 500    | GET    | 10    | none |
      | http://valid      | 200    | GET    | 10    | {"name": "Chuck"} |
    And new client is configured
    When define a GET request to "/user"
    And performs the request
    Then response status code should be 200
    And the request has no errors
    And response data should have a "name" field with data "Chuck"

  Scenario: Cannot resolve the request due to missing valid server
    Given the following service options values:
      | Key     | Value |
      | timeout | 50    |
      | cache   | true  |
    And the following list of service servers:
      | URI               | Status | Method | Delay | Body |
      | http://localhost  | 503    | GET    | 10    | none |
      | http://timeout    | 503    | GET    | 100   | none |
      | http://error      | 500    | GET    | 10    | none |
    And new client is configured
    When define a GET request to "/user"
    And performs the request
    Then the request has failed
    And error status code should be 1000

  Scenario: Cannot resolve the request due to missing configured servers
    Given the following service options values:
      | Key     | Value |
      | timeout | 50    |
      | cache   | true  |
    And new client is configured
    When define a GET request to "/user"
    And performs the request
    Then the request has failed
    And error status code should be 1002
