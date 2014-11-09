var Resilient = require('../')

var client = Resilient({
  balancer: {
    weight: {
      error: 80,
      latency: 15,
      success: 5
    }
  },
  discovery: {
    servers: [
      'http://localhost:8882/discovery/unavailable',
      'http://localhost:8882/discovery/timeout',
      'http://localhost:8882/discovery/valid/1'
    ],
    timeout: 1000,
    parallel: false
  }
})

client.get('/hello', function (err, res) {
  console.log('Error:', err)
  console.log('Response:', res.status, res.request.method)
  console.log('Body:', res.data)
})

client.post({ path: '/hello', data: { hello: 'world' } }, function (err, res) {
  console.log('Error:', err)
  console.log('Response:', res.status, res.request.method)
  console.log('Body:', res.data)
})
