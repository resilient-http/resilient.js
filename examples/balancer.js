var Resilient = require('../')

var client = Resilient({
  balancer: {
    random: true,
    roundRobin: false
  },
  discovery: {
    servers: [
      'http://localhost:8882/discovery/balancer'
    ],
    timeout: 1000,
    parallel: false
  }
})

client.on('request:outgoing', function (opts) {
  console.log('Calling out to:', opts.url)
})

for (let i = 1; i < 10; i += 1) {
  client.get('/hello').then(function (res) {
    console.log('Response:', res.status, res.request.method)
    console.log('Body:', res.data)
  }).catch(function (err) {
    console.error('Error:', err)
  })
}
