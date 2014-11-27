var expect = require('chai').expect
var nock = require('nock')
var Resilient = require('../')

describe('Timeouts', function () {
  describe('per method timeouts', function () {
    var client = Resilient({
      service: {
        timeout: 200,
        timeouts: {
          GET: 10,
          PUT: 30
        },
        servers: ['http://server']
      }
    })

    before(function () {
      nock('http://server')
        .get('/hello')
        .delayConnection(100)
        .reply(500)
      nock('http://server')
        .post('/hello')
        .delayConnection(100)
        .reply(204)
      nock('http://server')
        .put('/hello')
        .delayConnection(150)
        .reply(204)
      nock('http://server')
        .delete('/hello')
        .delayConnection(100)
        .reply(204)
    })

    after(function () {
      nock.cleanAll()
    })

    it('should resolve a GET request with timeout error', function (done) {
      client.get('/hello', function (err, res) {
        expect(err.status).to.be.equal(1000)
        expect(err.code).to.be.equal('ETIMEDOUT')
        done()
      })
    })

    it('should resolve a POST request with valid status', function (done) {
      client.post('/hello', function (err, res) {
        expect(res.status).to.be.equal(204)
        done()
      })
    })

    it('should resolve a PUT request with timeout error', function (done) {
      client.put('/hello', function (err, res) {
        expect(err.status).to.be.equal(1000)
        expect(err.code).to.be.equal('ETIMEDOUT')
        done()
      })
    })

    it('should resolve a DELETE request with valid status', function (done) {
      client.delete('/hello', function (err, res) {
        expect(res.status).to.be.equal(204)
        done()
      })
    })
  })
})
