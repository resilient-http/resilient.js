var _ = require('./utils')
var Resolver = require('./resolver')

module.exports = Request

function Request(resilient, cb) {
  this.status = 0
  this.options = options
  this.service = options.get('service')
  this.discovery = options.get('discovery')
  this.callback = _.once(cb)
}

Request.prototype.options = function () {
  return this.service.servers
}

Request.prototype.servers = function () {
  return this.service.servers()
}

Request.prototype.discoveryServers = function () {
  return this.discovery.servers()
}

Request.prototype.resolve = function (res) {
  this.callback(null, res)
}

Request.prototype.reject = function (err) {
  this.callback(err)
}

Request.prototype.send = function (options) {
  Resolver(options)
}
