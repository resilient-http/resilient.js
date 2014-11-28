var Resilient = require('../')

var client = Resilient({
  service: {
    servers: [
      'http://localhost:8882/server/unavailable',
      'http://localhost:8882/server/timeout',
      'http://localhost:8882/server/1'
    ],
    // default timeout for all HTTP requests
    timeout: 5000,
    // override default timeout for custom HTTP methods
    timeouts: {
      GET: 1000, // read request should be fast
      DELETE: 2000 // and increment a bit for DELETE
      PATCH: 2000 // and for PATCH
    }
  }
})

client.get('/', function (err, res) {
  console.log('Error:', err)
  console.log('Response:', res.status)
})
