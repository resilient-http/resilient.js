var Resilient = require('../')
var consul = require('resilient-consul')

// This is a sample Resilient client configuration
// which uses Consul as discovery server via middleware
// See: https://github.com/h2non/resilient-consul

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
    'http://demo.consul.io',
    'http://demo.consul.io'
  ]
}))

// Test request
client.get('/', function (err, res) {
  if (err) {
    return console.error('Error:', err)
  }
  console.log('Response:', res.status)
})
