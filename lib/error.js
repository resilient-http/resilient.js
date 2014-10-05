module.exports = ResilientError

var MESSAGES = {
  1000: 'All requests failed. No servers available',
  1001: 'Cannot update discovery servers. Empty or invalid response body',
  1002: 'Missing discovery servers. Cannot resolve the server',
  1003: 'The server list is empty',
  1004: 'Discovery server response is invalid or empty',
  1005: 'Missing discovery servers during retry process'
}

function ResilientError(status, error) {
  if (error instanceof Error) {
    Error.call(this, error)
    this.error = error
    this.code = error.code
  } else if (error) {
    this.request = error
  }
  this.status = status || 1000
  this.message = MESSAGES[this.status]
}

ResilientError.prototype = Object.create(Error.prototype)

ResilientError.MESSAGES = MESSAGES
