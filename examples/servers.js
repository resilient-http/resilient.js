var Resilient = require('../')

var client = Resilient({
  service: {
    servers: [
      'http://localhost:8882/discovery/unavailable',
      'http://localhost:8882/discovery/timeout',
      'http://localhost:8882/discovery/server'
    ],
    timeout: 1000
  }
})

client.get('/hello', function (err, res) {
  console.log('Error:', err)
  console.log('Response:', res)
  console.log('Body:', res.data)
})
