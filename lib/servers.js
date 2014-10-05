var _ = require('./utils')
var Server = require('./server')
var uriRegex = /^http[s]?\:\/\/(.+)/i

module.exports = Servers

function Servers(servers, options) {
  this.servers = []
  this.updated = 0
  this.options = options
  if (_.isArr(servers)) this.set(servers)
}

Servers.prototype.bestAvailable = function (operation) {
  var i, l, servers = this.servers
  var server = servers[0]
  for (i = 1, l = servers.length; i < l; i += 1) {
    if (servers[i].getBalance(operation) < server.getBalance(operation)) {
      server = servers[i]
    }
  }
  return server
}

Servers.prototype.sort = function (operation) {
  return this.servers.slice(0).sort(function (x, y) {
    return x.getBalance(operation) - y.getBalance(operation)
  })
}

Servers.prototype.find = function (url) {
  var i, l, server = null
  for (i = 0, l = this.servers.length; i < l; i += 1) {
    if (this.servers[i].url === url) {
      server = this.servers[i]
      break
    }
  }
  return server
}

Servers.prototype.set = function (servers) {
  this.updated = _.now()
  this.servers = servers
    .filter(isValidURI)
    .map(mapServer(this))
}

Servers.prototype.lastUpdate = function () {
  return _.now() - this.updated
}

Servers.prototype.empty = function () {
  return this.servers.length === 0
}

Servers.prototype.exists = function () {
  return this.servers.length > 0
}

function isValidURI(uri) {
  if (_.isObj(uri)) uri = uri.url || uri.uri
  return typeof uri === 'string' && uriRegex.test(uri)
}

function mapServer(self) {
  return function (data) {
    var server
    if (data instanceof Server) {
      server = data
    } else {
      server = self.find(_.isObj(data) ? data.url : data)
      if (!server) server = new Server(data)
    }
    return server
  }
}
