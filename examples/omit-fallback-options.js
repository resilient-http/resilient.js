var Resilient = require('../')

var client = Resilient({
  service: {
    // omit server fallback on error in custom HTTP methods
    omitFallbackOnMethods: [ 'POST', 'PUT', 'DELETE' ],
    // or if server respond with a custom HTTP status
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

var client2 = Resilient({
  service: {
    // omit server fallback if matches a custom HTTP method and response status codes
    omitFallbackWhen: [{
      method: 'POST', codes: [ 500, 501 ]
    }, {
      methods: ['PUT', 'PATCH'], codes: [ 404, 501, 500 ]
    }],
    servers: [
      'http://localhost:8882/discovery/unavailable',
      'http://localhost:8882/discovery/timeout',
      'http://localhost:8882/discovery/valid'
    ]
  }
})

client2.get('/hello', function (err, res) {
  console.log('Response:', (err || res).status)
})

var client3 = Resilient({
  service: {
    // omit retry cycle if matches a custom HTTP method and response status codes
    omitRetryWhen: [{
      method: 'POST', codes: [ 500, 501 ]
    }, {
      methods: ['PUT', 'PATCH'], codes: [ 404, 501, 500 ]
    }],
    servers: [
      'http://localhost:8882/discovery/unavailable',
      'http://localhost:8882/discovery/timeout',
      'http://localhost:8882/discovery/valid'
    ]
  }
})

client3.get('/hello', function (err, res) {
  console.log('Response:', (err || res).status)
})
