var Resilient = require('../')

var client = Resilient({
  discovery: {
    // define the hydra server base path and app name
    basePath: '/app/my-service',
    // hydra servers pool (aka discovery servers)
    servers: [
      'http://hydra1.server.net',
      'http://hydra2.server.net',
      'http://hydra3.server.net'
    ]
  }
})

// retrieve a list of servers, asking to discovery servers if required
client.discoverServers(function (err, servers) {
  console.log('Service servers:', servers)
})

// retrieve an up-to-date servers URLs (force asking for discovery servers)
client.getLatestServers(function (err, servers) {
  console.log('Fresh service servers:', servers)
})