var _ = require('./utils')
var Server = require('./server')
var RoundRobin = require('./roundrobin')

module.exports = Servers

function Servers (servers) {
  this.servers = []
  this.updated = 0
  this.set(servers)
}

Servers.prototype.get = function () {
  return this.servers.slice(0)
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
  return this.size() > 0
}

Servers.prototype.size = function () {
  return this.servers.length
}

Servers.prototype.urls = function () {
  return this.servers.map(function (server) {
    return server.url
  })
}

Servers.prototype.resetStats = function () {
  this.servers.forEach(function (server) {
    server.resetStats()
  })
}

Servers.prototype.sort = function (operation, options) {
  var servers = this.servers.slice(0)
  if (servers.length) {
    if (!options.get('disableWeight')) {
      servers.sort(function (x, y) {
        return x.balance(operation, options) - y.balance(operation, options)
      })
    }
    if (typeof options.get('balanceStrategy') === 'function') {
      servers = options.get('balanceStrategy')(servers)
    } else if (options.get('random')) {
      servers = shuffle(servers)
    } else if (options.get('roundRobin')) {
      servers = roundRobinSort(servers, options)
    }
  }

  return servers
}

Servers.prototype.find = function (url) {
  var server = null
  for (var i = 0, l = this.servers.length; i < l; i += 1) {
    if (this.servers[i].url === url) {
      server = this.servers[i]
      break
    }
  }
  return server
}

function isValidURI (uri) {
  if (_.isObj(uri)) uri = uri.url || uri.uri
  return _.isURI(uri)
}

function mapServers (servers) {
  return servers
    .filter(isValidURI)
    .map(_.bind(this, mapServer))
}

function mapServer (data, index) {
  var server
  if (data instanceof Server) {
    server = data
  } else {
    server = this.find(_.isObj(data) ? data.url : data)
    if (!server) server = new Server(data, index)
  }
  return server
}

function shuffle (arr) {
  var array = arr.slice(0)
  for (var i = array.length - 1; i > 0; i -= 1) {
    var j = Math.random() * (i + 1) | 0
    var temp = array[i]
    array[i] = array[j]
    array[j] = temp
  }
  return array
}

function roundRobinSort (servers, options) {
  var size = 0
  if (options && options.get('roundRobin')) {
    var configSize = +options.get('roundRobinSize')
    size = configSize > servers.length ? servers.length : configSize
    if (size > 1) {
      return RoundRobin(servers, size)
    }
  }
  return servers
}
