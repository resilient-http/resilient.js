var Resilient = require('../')

var client = Resilient({
  discovery: {
    retry: 1,
    servers: [
      'http://localhost:8882/discovery/unavailable',
      'http://localhost:8882/discovery/timeout',
      'http://localhost:8882/discovery/valid'
    ]
  }
})

// dispatch before send the request
client.on('request:start', function (options) {
  // add a random request identifier
  options.headers['X-Request-Id'] = '37779240-7a46-11e4-82f8-0800200c9a66'
  // and the app client version number
  options.headers['X-Client-Version'] = '1.0.5'
})

// dispatch after any request was finished, with success or error status
client.on('request:finish', function (err, res) {
  if (err) {
    // do something when error happends, like logging the error
    console.error('The request was failed:', err)
  } else if (res.status >= 400) {
    // when an unexpected server response happends, do something...
    console.error('Invalid server response:', res.status)
  } else {
    console.log('Request success:', res.config.url)
  }
})
