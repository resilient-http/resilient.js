var Resilient = require('../')
var request = require('request')

var client = Resilient({
  service: {
    servers: [
      'http://localhost:8882/unavailable',
      'http://localhost:8882/timeout',
      'http://localhost:8882/server'
    ]
  }
})

// Outgoing request will pass over here
function proxyRequests(options, cb) {
  console.log('New request:', options.url)
  request(options, cb)
}

client.setHttpClient(proxyRequests)

client('/hello', function (err, res) {
  console.log('Error:', err)
  console.log('Response:', res)
  console.log('Body:', res.data)
})
