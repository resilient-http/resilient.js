var expect = require('chai').expect
var nock = require('nock')
var Resilient = require('../')

describe('Fallback', function () {

  describe('invalid servers with invalid status', function () {
    var client = Resilient({
      service: {
        timeout: 50,
        servers: [
          'http://unavailable',
          'http://timeout',
          'http://unauthorized',
          'http://valid'
        ]
      }
    })

    before(function () {
      nock('http://unavailable')
        .get('/hello')
        .reply(503)
      nock('http://timeout')
        .get('/hello')
        .delayConnection(100)
        .reply(500)
      nock('http://unauthorized')
        .get('/hello')
        .reply(403)
      nock('http://valid')
        .get('/hello')
        .reply(204)
    })

    after(function () {
      nock.cleanAll()
    })

    it('should perform a unique request with 404 status', function (done) {
      client.get('/hello', function (err, res) {
        expect(res.status).to.be.equal(403)
        done()
      })
    })
  })

  describe('valid server', function () {
    var client = Resilient({
      service: {
        timeout: 50,
        servers: [
          'http://unavailable',
          'http://timeout',
          'http://valid'
        ]
      }
    })

    before(function () {
      nock('http://unavailable')
        .get('/hello')
        .reply(503)
      nock('http://timeout')
        .get('/hello')
        .delayConnection(100)
        .reply(500)
      nock('http://valid')
        .get('/hello')
        .reply(204)
    })

    after(function () {
      nock.cleanAll()
    })

    it('should perform a unique request cycle with valid status', function (done) {
      client.get('/hello', function (err, res) {
        expect(res.status).to.be.equal(204)
        done()
      })
    })
  })

})
