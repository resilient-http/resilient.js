Feature: Servers discovering

  Scenario: Server fallback until retrieve the server list
    Given the following discovery options values:
      | Key     | Value |
      | timeout | 100   |
      | cache   | true  |
    And the following list of discovery servers:
      | URI                    | Status | Method | Delay | Body |
      | http://timeout         | 503    | GET    | 150   | none |
      | http://localhost:8882  | 503    | GET    | 50    | none |
      | http://valid           | 200    | GET    | 50    | ["http://server"] |
    And the following the service servers stubs:
      | URI           | Status | Method | Path  | Body              |
      | http://server | 200    | GET    | /user | {"name": "Chuck"} |
    And new client is configured
    When define a GET request to "/user"
    And performs the request
    Then response status code should be 200
    And the request has no errors
    And response data should have a "name" field with data "Chuck"

  Scenario: Servers fallback until a find valid one
    Given the following discovery options values:
      | Key     | Value |
      | timeout | 100   |
      | cache   | true  |
    And the following list of discovery servers:
      | URI                    | Status | Method | Delay | Body |
      | http://timeout         | 503    | GET    | 150   | none |
      | http://localhost:8882  | 503    | GET    | 50    | none |
      | http://valid           | 200    | GET    | 50    | ["http://server"] |
    And the following the service servers stubs:
      | URI           | Status | Method | Delay | Body              |
      | http://server | 200    | GET    | 100   | {"name": "Chuck"} |
    And new client is configured
    When define a GET request to "/user"
    And performs the request
    Then response status code should be 200
    And the request has no errors
    And response data should have a "name" field with data "Chuck"

  Scenario: Multiple timeouts errors and service server errors
    Given the following discovery options values:
      | Key     | Value |
      | timeout | 50    |
      | cache   | true  |
    And the following list of discovery servers:
      | URI                      | Status | Method | Delay | Body |
      | http://unavailable       | 503    | GET    | 50    | none |
      | http://timeout/1         | 503    | GET    | 150   | none |
      | http://timeout/2         | 503    | GET    | 50    | none |
      | http://timeout/3         | 503    | GET    | 50    | none |
      | http://timeout/4         | 503    | GET    | 50    | none |
      | http://timeout/5         | 503    | GET    | 50    | none |
      | http://timeout/6         | 503    | GET    | 50    | none |
      | http://valid             | 200    | GET    | 50    | ["http://unavailable", "http://error", "http://exceeds", "http://server"] |
    And the following service options values:
      | Key     | Value |
      | timeout | 50    |
      | cache   | true  |
    And the following the service servers stubs:
      | URI                | Status | Method | Delay | Body              |
      | http://unavailable | 503    | GET    | 10    | {"invalid": true} |
      | http://error       | 505    | GET    | 10    | {"invalid": true} |
      | http://exceeds     | 500    | GET    | 100   | {"invalid": true} |
      | http://server      | 200    | GET    | 50    | {"name": "Chuck"} |
    And new client is configured
    When define a GET request to "/user"
    And performs the request
    Then response status code should be 200
    And the request has no errors
    And response data should have a "name" field with data "Chuck"

  Scenario: Cannot resolve the request due to all service servers are unavailable or timeout expiration
    Given the following discovery options values:
      | Key     | Value |
      | timeout | 50    |
      | cache   | true  |
    And the following list of discovery servers:
      | URI                      | Status | Method | Delay | Body |
      | http://unavailable       | 503    | GET    | 50    | none |
      | http://timeout/1         | 503    | GET    | 150   | none |
      | http://timeout/2         | 503    | GET    | 50    | none |
      | http://timeout/3         | 503    | GET    | 50    | none |
      | http://timeout/4         | 503    | GET    | 50    | none |
      | http://timeout/5         | 503    | GET    | 50    | none |
      | http://timeout/6         | 503    | GET    | 50    | none |
      | http://valid             | 200    | GET    | 50    | ["http://unavailable", "http://error", "http://exceeds", "http://server"] |
    And the following service options values:
      | Key     | Value |
      | timeout | 50    |
      | cache   | true  |
    And the following the service servers stubs:
      | URI                | Status | Method | Delay | Body              |
      | http://unavailable | 503    | GET    | 10    | {"invalid": true} |
      | http://error       | 505    | GET    | 10    | {"invalid": true} |
      | http://exceeds     | 500    | GET    | 100   | {"invalid": true} |
      | http://unavailable | 503    | GET    | 10    | {"invalid": true} |
      | http://exceeds     | 500    | GET    | 100   | {"invalid": true} |
      | http://error       | 505    | GET    | 10    | {"invalid": true} |
    And new client is configured
    When define a GET request to "/user"
    And performs the request
    Then the request has failed
    And error status code should be 1000

  Scenario: Unavailable discovery servers with retry support
    Given the following discovery options values:
      | Key     | Value |
      | timeout | 100   |
      | cache   | true  |
      | retry   | 3     |
    And the following list of discovery servers:
      | URI                      | Status | Method | Delay | Body |
      | http://unavailable/1     | 503    | GET    | 50    | none |
      | http://timeout/1         | 503    | GET    | 150   | none |
      | http://unavailable/2     | 503    | GET    | 50    | none |
      | http://timeout/3         | 503    | GET    | 150   | none |
      | http://error/3           | 500    | GET    | 50    | none |
      | http://timeout/5         | 503    | GET    | 150   | none |
      | http://unavailable/3     | 503    | GET    | 50    | none |
      | http://timeout/5         | 503    | GET    | 150   | none |
      | http://error/3           | 500    | GET    | 50    | none |
    And new client is configured
    When define a GET request to "/user"
    And performs the request
    Then the request has failed
    And error status code should be 1000

  Scenario: Cannot resolve due to missing discovery servers configuration
    Given the following discovery options values:
      | Key     | Value |
      | timeout | 100   |
      | cache   | true  |
      | retry   | 3     |
    And new client is configured
    When define a GET request to "/user"
    And performs the request
    Then the request has failed
    And error status code should be 1002
