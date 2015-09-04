var expect = require('chai').expect
var nock = require('nock')
var Resilient = require('../')

describe('Fail strategies', function () {
  describe('add custom strategies', function () {
    var client = Resilient({
      service: {
        servers: [
          'http://unavailable',
          'http://unauthorized',
          'http://ratelimit',
          'http://valid'
        ]
      }
    })

    before(function () {
      nock('http://unavailable')
        .get('/hello')
        .reply(503)
      nock('http://unauthorized')
        .get('/hello')
        .reply(403)
      nock('http://ratelimit')
        .get('/hello')
        .reply(200,  'Limit reached', {
         'X-RateLimit-Remaining': 0
        })
      nock('http://valid')
        .get('/hello')
        .reply(204)
    })

    after(function () {
      nock.cleanAll()
    })

    it('should define a custom fail strategy', function () {
      client.failStrategy(function (err, res) {
        return +res.headers['x-ratelimit-remaining'] === 0
      })

      client.failStrategy(function (err, res) {
        return res.statusCode === 403
      })

      expect(client._failStrategies.strategies).to.have.length(2)
    })

    it('should fallback until reach a valid server', function (done) {
      client.get('/hello', function (err, res) {
        expect(res.status).to.be.equal(204)
        done()
      })
    })
  })
})
