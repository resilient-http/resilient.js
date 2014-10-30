var Resilient = require('../')

var client = Resilient({
  discovery: {
    retry: 1,
    servers: [
      'http://localhost:8882/discovery/unavailable',
      'http://localhost:8882/discovery/timeout',
      'http://localhost:8882/discovery/unavailable'
    ]
  }
})

// event interceptors
client.on('request:start', function (options) {
  console.log('New request:', options.url)
  // change url
  options.url += '?_cache=' + Date.now()
})

client.on('request:finish', function (err, res) {
  console.log('Finish request!')
  console.log(err)
  console.log(res)
})

// retry cycle
client.on('request:retry', function (options, servers) {
  console.log('Retry request cycle!')
  console.log(options)
  console.log(servers)
})
