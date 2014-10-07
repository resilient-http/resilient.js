var _ = require('./utils')
var Server = require('./server')
var RoundRobin = require('./roundrobin')

module.exports = Servers

function Servers(servers) {
  this.servers = []
  this.updated = 0
  this.set(servers)
}

Servers.prototype.sort = function (operation, options) {
  var servers = this.servers.slice(0).sort(function (x, y) {
    return x.getBalance(operation, options) - y.getBalance(operation, options)
  })
  return roundRobinSort(servers, options)
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
  if (_.isArr(servers)) {
    this.updated = _.now()
    this.servers = mapServers.call(this, servers)
  }
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
  return _.isURI(uri)
}

function mapServers(servers) {
  return servers
    .filter(isValidURI)
    .map(_.bind(this, mapServer))
}

function mapServer(data) {
  var server
  if (data instanceof Server) {
    server = data
  } else {
    server = this.find(_.isObj(data) ? data.url : data)
    if (!server) server = new Server(data)
  }
  return server
}

function roundRobinSort(servers, options) {
  var size = 0
  if (options && options.roundRobin) {
    size = options.roundRobinSize > servers.length ? servers.length : options.roundRobinSize
    if (size > 1) servers = RoundRobin(servers, size)
  }
  return servers
}
