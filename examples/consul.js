var Resilient = require('../')
var consul = require('resilient-consul')

// this is a sample Resilient configuration
// which using the Consul middleware
// https://github.com/h2non/resilient-consul

var client = Resilient()

client.use(consul({
  // App service name (required)
  service: 'web',
  // Discovery service name (optional, default to consul)
  discoveryService: 'consul',
  // Specificy a custom datacenter (optional)
  datacenter: 'ams2',
  // auto refresh servers from Consul (optional, default to false)
  enableSelfRefresh: true,
  // Consul servers pool
  servers: [
    'http://demo.consul.net',
    'http://demo.consul.net'
  ]
}))

// Test request
client.get('/', function (err, res) {
  console.log('->', err, res)
})
