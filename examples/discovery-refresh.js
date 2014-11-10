var Resilient = require('../')

var client = Resilient({
  discovery: {
    servers: null, // note that discovery server are empty
    parallel: false,
    timeout: 100,
    refreshServers: [
      'http://localhost:8882/discovery/unavailable',
      'http://localhost:8882/discovery/timeout',
      'http://localhost:8882/discovery/valid'
    ],
    refreshServersInterval: 1000,
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
})
