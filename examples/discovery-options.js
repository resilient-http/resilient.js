var Resilient = require('../')

var client = Resilient({
  discovery: {
    servers: [
      'http://localhost:8882/discovery/unavailable',
      'http://localhost:8882/discovery/timeout',
      'http://localhost:8882/discovery/valid'
    ],
    timeout: 2000,
    parallel: true,
    basePath: '/discovery/myapp',
    method: 'POST',
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
