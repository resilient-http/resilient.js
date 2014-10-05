Feature: Servers discovery

  Background:
    Given the following discovery options values:
      | Key     | Value |
      | timeout | 100   |
      | cache   | true  |

  Scenario: Servers fallback until a find valid one
    Given the following list of discovery servers:
      | URI                    | Status | Method | Path | Delay | Body |
      | http://timeout         | 503    | GET    | /    | 150   | none |
      | http://localhost:8882  | 503    | GET    | /    | 50    | none |
      | http://valid           | 200    | GET    | /    | 50    | ["http://server"] |
    And the configure the stub enpoints:
      | URI           | Status | Method | Path  | Delay | Body              |
      | http://server | 200    | GET    | /user | Delay | {"name": "Chuck"} |
    And new client is configured
    When define a GET request to "/user"
    And performs the request
    Then response status code should be 200
    And response data should have a "name" field with data "Chuck"

  Scenario: Cannot find any server
    Given the following list of discovery servers:
      | URI                    | Status | Method | Path | Delay | Body |
      | http://timeout         | 503    | GET    | /    | 150   | none |
      | http://localhost:8882  | 503    | GET    | /    | 50    | none |
      | http://valid           | 200    | GET    | /    | 50    | ["http://server"] |
    And the configure the stub enpoints:
      | URI           | Status | Method | Path  | Delay | Body              |
      | http://server | 200    | GET    | /user | Delay | {"name": "Chuck"} |
    And new client is configured
    When define a GET request to "/user"
    And performs the request
    Then response status code should be 200
    And response data should have a "name" field with data "Chuck"
