var Resilient = require('../')

var client = Resilient({
  service: {
    retry: Infinity,
    discoverBeforeRetry: true,
    waitBeforeRetry: 100,
    timeout: 1000,
    promiscuousErrors: true
  },
  discovery: {
    servers: [
      'http://localhost:8882/discovery/unavailable',
      'http://localhost:8882/discovery/timeout',
      'http://localhost:8882/discovery/valid'
    ],
    retry: Infinity,
    waitBeforeRetry: 100,
    refreshInterval: 5 * 1000,
    basePath: '/api/1.0',
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
