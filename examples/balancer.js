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
      'http://localhost:8882/unavailable',
      'http://localhost:8882/timeout',
      'http://localhost:8882/valid'
    ],
    timeout: 1000,
    parallel: false
  }
})

client('/hello', function (err, res) {
  console.log('Error:', err)
  console.log('Response:', res)
  console.log('Body:', res.data)
})
