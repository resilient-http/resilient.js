var Resilient = require('../')

var client = Resilient({
  discovery: {
    servers: [
      'http://localhost:8882/discovery/unavailable',
      'http://localhost:8882/discovery/timeout',
      'http://localhost:8882/discovery/valid'
    ]
  }
})

// force update servers (asking to discover servers)
client.updateServers(function (err, servers) {
  console.log(servers)
})

// get servers, asking to discovery servers if required
client.updateServers(function (err, servers) {
  console.log(servers)
})

// get an up-to-date servers list
client.getUpdatedServers(function (err, servers) {
  console.log(servers)
})

// has discovery servers
client.hasDiscoveryServers() // -> true
