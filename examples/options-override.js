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
    method: 'GET',
    headers: {
      Authorization: 'Bearer 0b79bab50daca910b000d4f1a2b675d604257e42'
    }
  }
})

// override default global options for the following request
client.get('/hello', {
  timeout: 5000,
  parallel: false,
  basePath: '/discovery⁄custom',
  headers: {
    Authorization: 'Bearer ChuckNorris',
    Version: '0.1.0'
  }
}, function (err, res) {
  console.log('Error:', err)
  console.log('Response:', res)
  console.log('Body:', res.data)
})
