var Resolver = require('./resolver')

module.exports = Request

function Request(options, resilient) {
  this.status = 0
  this.options = options
  this.resilient = resilient
}

Request.prototype.emit = function (event) {

}

Request.prototype.retry = function () {

}

Request.prototype.resolve = function () {

}

Request.prototype.reject = function () {

}

Request.prototype.send = function (options, cb) {
  this.callback = cb
  return Resolver(this)
}
