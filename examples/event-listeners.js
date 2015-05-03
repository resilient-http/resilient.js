var Resilient = require('../')

var client = Resilient({
  discovery: {
    retry: 1,
    servers: [
      'http://localhost:8882/discovery/unavailable',
      'http://localhost:8882/discovery/timeout',
      'http://localhost:8882/discovery/unavailable'
    ]
  }
})

client.on('request:outgoing', function (options) {
  console.log('Outgoing request:', options)
})

client.on('request:incoming', function (options) {
  console.log('Incoming response:', options)
})

client.on('request:fallback', function (options, res) {
  console.log('Request fallback request cycle was dispached!')
  console.log('Using the following options:', options)
  console.log('With the failed response:', res)
})

client.on('request:retry', function (options, servers) {
  console.log('Retry request cycle was dispached!')
  console.log('Using the following options:', options)
  console.log('Using the following servers:', servers)
})

client.on('servers:refresh', function (servers) {
  console.log('New servers list:', servers.join(', '))
})

client.on('servers:cache', function (servers) {
  console.log('Cached servers list:', servers.join(', '))
})

client.on('discovery:refresh', function (servers) {
  console.log('New up-to-date server list:', servers.join(', '))
})

// sample request
client.get('/', function (err, res) {
  console.log(err, res)
})
