var Resilient = require('../')

var client = Resilient({
  service: {
    servers: [
      'http://localhost:8882/unavailable',
      'http://localhost:8882/timeout',
      'http://localhost:8882/server'
    ],
    timeout: 1000,
    basePath: '/api',
    method: 'POST',
    retry: 3,
    retryWait: 500,
    headers: {
      Authorization: 'Bearer 0b79bab50daca910b000d4f1a2b675d604257e42'
    }
  }
})

client.get('/hello', function (err, res) {
  console.log('Error:', err)
  console.log('Response:', res)
  console.log('Body:', res.data)
})
