var Resilient = require('../')

var client = Resilient({
  service: {
    timeout: 1000,
    retry: 3,
    servers: [
      'http://localhost:8882/server/unavailable',
      'http://localhost:8882/server/timeout',
      'http://localhost:8882/server/1'
    ]
  }
})

client.get('/hello', function (err, res) {
  console.log('Error:', err)
  console.log('Response:', res.status)
})
