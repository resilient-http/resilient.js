module.exports = ResilientError

var MESSAGES = {
  1000: 'All requests failed. No servers available',
  1001: 'Cannot update discovery servers. Empty or invalid response body',
  1002: 'Missing discovery servers. Cannot resolve the server',
  1003: 'Cannot resolve servers. Missing data',
  1004: 'Discovery server response is invalid or empty',
  1005: 'Missing servers during retry process',
  1006: 'Internal unexpected error',
  1007: 'Middleware error'
}

function ResilientError (status, error) {
  if (error instanceof Error) {
    Error.call(this)
    this.error = error
    if (error.code) this.code = error.code
    if (error.stack) this.stack = error.stack
  } else if (error) {
    this.request = error
  }
  this.status = status
  this.message = MESSAGES[this.status]

  if (status === 1007 && error) {
    this.message += ': ' + (error.message || error)
  }
}

ResilientError.prototype = Object.create(Error.prototype)

ResilientError.MESSAGES = MESSAGES
