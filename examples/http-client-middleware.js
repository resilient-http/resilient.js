var Resilient = require('../')
var request = require('request')

var client = Resilient({
  service: {
    servers: [
      'http://localhost:8882/discovery/unavailable',
      'http://localhost:8882/discovery/timeout',
      'http://localhost:8882/discovery/server'
    ]
  }
})

// Outgoing request will pass over here
function httpRequestProxy(options, cb) {
  console.log('New request:', options.url)
  request(options, cb)
}

client.useHttpClient(httpRequestProxy)

client.get('/hello', function (err, res) {
  console.log('Error:', err)
  console.log('Response:', res)
  console.log('Body:', res.data)
})
