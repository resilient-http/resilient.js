var Resilient = require('../')

var client = Resilient({
  service: {
    servers: [
      'http://localhost:8882/discovery/unavailable',
      'http://localhost:8882/discovery/unauthorized',
      'http://localhost:8882/discovery/valid'
    ],
    timeout: 5000,
    basePath: '/api',
    retry: 3,
    waitBeforeRetry: 5 * 1000
  }
})

function isLimitReached(err, res) {
  return !err && +res.headers['x-ratelimit-remaining'] === 0
}

function isInvalidContentType(err, res) {
  return !err && /json/i.test(res.headers['content-type'])
}

function isUnauthorized(err, res) {
  return !err && res.statusCode === 401
}

client.addFailStrategy(isLimitReached)
client.addFailStrategy(isInvalidContentType)
client.addFailStrategy(isUnauthorized)

client.get('/hello', function (err, res) {
  console.log('Error:', err)
  console.log('Response:', res)
  console.log('Body:', res.data)
})
