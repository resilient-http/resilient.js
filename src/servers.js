var Server = require('./server')

module.exports = Servers

function Servers(options) {
  this.options = options
  this.setServers(options.servers)
}

Servers.prototype.bestAvailable = function (operation) {
  var i, l, servers = this.servers
  var server = servers[0]
  for (i = 1, l = servers.length; i < l; i += 1) {
    if (servers[i].getBalance(operation) < server.getBalance(operation))
      server = servers[i]
  }
  return server
}

Servers.prototype.setServers = function (servers) {
  if (Array.isArray(servers)) {
    this.servers = servers.map(function (uri) {
      return new Server(uri)
    })
  }
}
