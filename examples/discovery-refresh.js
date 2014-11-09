var Resilient = require('../')

var client = Resilient({
  service: {
    timeout: 1000
  },
  discovery: {
    servers: null,
    parallel: false,
    timeout: 1000,
    refreshServers: [
      'http://localhost:8882/discovery/unavailable',
      'http://localhost:8882/discovery/timeout',
      'http://localhost:8882/discovery/valid'
    ],
    refreshPath: '/discovery',
    refreshServersInterval: 1 * 1000,
    refreshOptions: {
      method: 'POST',
      headers: {
        'API-Key': '123123123123123'
      }
    }
  }
})

client.get('/hello', function (err, res) {
  console.log('Error:', err)
  console.log('Response:', res)
  console.log('Body:', res.data)
})
