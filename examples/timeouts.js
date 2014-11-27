var Resilient = require('../')

var client = Resilient({
  service: {
    servers: [
      'http://localhost:8882/server/unavailable',
      'http://localhost:8882/server/timeout',
      'http://localhost:8882/server/1'
    ],
    timeout: 5000, // default timoue
    timeouts: {
      GET: 1000, // lower timeout for read requests
      DELETE: 2000 // and for delete
      PATCH: 2000 // or patch
    }
  }
})

client.get('/', function (err, res) {
  console.log('Error:', err)
  console.log('Response:', res)
  console.log('Body:', res.data)
})
