var Resilient = require('../')

var client = Resilient({
  discovery: {
    // define the hydra server base path and app name
    basePath: '/app/my-service',
    // refresh path for dynamic servers
    refreshPath: '/app/hydra',
    // autorefresh from hydra (discovery) servers pool
    useDiscoveryServersToRefresh: true,
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

// retrieve an up-to-date servers URLs (force asking to discovery servers)
client.getLatestServers(function (err, servers) {
  console.log('Fresh service servers:', servers)
})

// custom app name
client.discoverServers({ basePath: '/app/my-app' }, function (err, servers) {
  console.log('Fresh service servers:', servers)
})

client.getLatestServers({ basePath: '/app/my-app' }, function (err, servers) {
  console.log('Fresh service servers:', servers)
})
