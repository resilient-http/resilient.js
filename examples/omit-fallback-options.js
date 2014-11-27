var Resilient = require('../')

var client = Resilient({
  service: {
    omitFallbackOnMethods: [ 'POST', 'PUT', 'DELETE' ],
    omitFallbackOnErrorCodes: [ 500, 501 ],
    servers: [
      'http://localhost:8882/discovery/unavailable',
      'http://localhost:8882/discovery/timeout',
      'http://localhost:8882/discovery/valid'
    ]
  }
})

client.get('/hello', function (err, res) {
  console.log('Response:', (err || res).status)
})
