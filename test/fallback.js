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

    it('should fallback until returns the 403 status', function (done) {
      var fallbackTimes = 0
      client.on('request:fallback', function (options, res) {
        fallbackTimes += 1
      })
      client.get('/hello', function (err, res) {
        expect(res.status).to.be.equal(403)
        expect(fallbackTimes).to.be.equal(2)
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
      var fallbackTimes = 0
      client.on('request:fallback', function (options, res) {
        fallbackTimes += 1
      })
      client.get('/hello', function (err, res) {
        expect(res.status).to.be.equal(204)
        expect(fallbackTimes).to.be.equal(2)
        done()
      })
    })
  })

  describe('omit server fallback on custom HTTP methods', function () {
    var client = Resilient({
      service: {
        omitFallbackOnMethods: ['POST', 'PUT'],
        servers: ['http://unavailable', 'http://valid']
      }
    })

    before(function () {
      nock('http://unavailable')
        .persist()
        .get('/hello')
        .reply(503)
      nock('http://unavailable')
        .persist()
        .post('/hello')
        .reply(503)
      nock('http://unavailable')
        .persist()
        .put('/hello')
        .reply(503)
      nock('http://unavailable')
        .persist()
        .delete('/hello')
        .reply(503)
      nock('http://valid')
        .persist()
        .get('/hello')
        .reply(204)
      nock('http://valid')
        .persist()
        .delete('/hello')
        .reply(204)
    })

    after(function () {
      nock.cleanAll()
    })

    beforeEach(function () {
      client.resetStats()
    })

    it('should resolve a GET request with success status', function (done) {
      client.get('/hello', function (err, res) {
        expect(res.status).to.be.equal(204)
        done()
      })
    })

    it('should resolve POST request with invalid status', function (done) {
      client.post('/hello', function (err, res) {
        expect(res.status).to.be.equal(503)
        done()
      })
    })

    it('should resolve PUT request with invalid status', function (done) {
      client.put('/hello', function (err, res) {
        expect(res.status).to.be.equal(503)
        done()
      })
    })

    it('should resolve DELETE request with valid status', function (done) {
      client.delete('/hello', function (err, res) {
        expect(res.status).to.be.equal(204)
        done()
      })
    })
  })

  describe('omit server fallback on custom response status codes', function () {
    var client = Resilient({
      service: {
        omitFallbackOnErrorCodes: [ 503 ],
        servers: ['http://unavailable', 'http://valid']
      }
    })

    before(function () {
      nock('http://unavailable')
        .persist()
        .get('/hello')
        .reply(503)
      nock('http://unavailable')
        .persist()
        .post('/hello')
        .reply(503)
      nock('http://unavailable')
        .persist()
        .put('/hello')
        .reply(503)
      nock('http://unavailable')
        .persist()
        .delete('/hello')
        .reply(503)
      nock('http://valid')
        .persist()
        .get('/hello')
        .reply(204)
      nock('http://valid')
        .persist()
        .delete('/hello')
        .reply(204)
    })

    after(function () {
      nock.cleanAll()
    })

    beforeEach(function () {
      client.resetStats()
    })

    it('should resolve a GET request with success status', function (done) {
      client.get('/hello', function (err, res) {
        expect(res.status).to.be.equal(503)
        done()
      })
    })

    it('should resolve POST request with invalid status', function (done) {
      client.post('/hello', function (err, res) {
        expect(res.status).to.be.equal(503)
        done()
      })
    })

    it('should resolve PUT request with invalid status', function (done) {
      client.put('/hello', function (err, res) {
        expect(res.status).to.be.equal(503)
        done()
      })
    })

    it('should resolve DELETE request with valid status', function (done) {
      client.delete('/hello', function (err, res) {
        expect(res.status).to.be.equal(503)
        done()
      })
    })
  })

  describe('omit retry cycly on custom HTTP methods', function () {
    var client = Resilient({
      service: {
        retry: 1,
        omitFallbackOnMethods: ['POST', 'PUT'],
        servers: ['http://unavailable', 'http://unavailable', 'http://unavailable']
      }
    })

    before(function () {
      nock('http://unavailable')
        .get('/hello')
        .times(6)
        .reply(503)
      nock('http://unavailable')
        .post('/hello')
        .times(3)
        .reply(503)
      nock('http://unavailable')
        .put('/hello')
        .times(3)
        .reply(503)
      nock('http://unavailable')
        .delete('/hello')
        .times(6)
        .reply(503)
    })

    after(function () {
      nock.cleanAll()
    })

    beforeEach(function () {
      client.resetStats()
    })

    it('should resolve a GET request with success status', function (done) {
      client.get('/hello', function (err, res) {
        expect(err.status).to.be.equal(1000)
        expect(err.request.status).to.be.equal(503)
        done()
      })
    })

    it('should resolve POST request with invalid status', function (done) {
      client.post('/hello', function (err, res) {
        expect(res.status).to.be.equal(503)
        done()
      })
    })

    it('should resolve PUT request with invalid status', function (done) {
      client.put('/hello', function (err, res) {
        expect(res.status).to.be.equal(503)
        done()
      })
    })

    it('should resolve DELETE request with valid status', function (done) {
      client.delete('/hello', function (err, res) {
        expect(err.status).to.be.equal(1000)
        expect(err.request.status).to.be.equal(503)
        done()
      })
    })
  })


  describe('omit retry cycle on custom response status codes', function () {
    var client = Resilient({
      service: {
        retry: 2,
        omitRetryOnErrorCodes: [ 503 ],
        servers: ['http://unavailable', 'http://unavailable', 'http://unavailable']
      }
    })

    before(function () {
      nock('http://unavailable')
        .get('/hello')
        .times(12)
        .reply(503)
      nock('http://unavailable')
        .post('/hello')
        .times(12)
        .reply(503)
      nock('http://unavailable')
        .put('/hello')
        .times(12)
        .reply(503)
      nock('http://unavailable')
        .delete('/hello')
        .times(12)
        .reply(503)
    })

    after(function () {
      nock.cleanAll()
    })

    beforeEach(function () {
      client.resetStats()
    })

    it('should resolve a GET request with success status', function (done) {
      client.get('/hello', function (err, res) {
        expect(res.status).to.be.equal(503)
        done()
      })
    })

    it('should resolve POST request with invalid status', function (done) {
      client.post('/hello', function (err, res) {
        expect(res.status).to.be.equal(503)
        done()
      })
    })

    it('should resolve PUT request with invalid status', function (done) {
      client.put('/hello', function (err, res) {
        expect(res.status).to.be.equal(503)
        done()
      })
    })

    it('should resolve DELETE request with valid status', function (done) {
      client.delete('/hello', function (err, res) {
        expect(res.status).to.be.equal(503)
        done()
      })
    })
  })

  describe('omit fallback when the given config matches', function () {
    var client = Resilient({
      service: {
        retry: 2,
        omitFallbackWhen: [
          { method: 'POST', code: 500 },
          { methods: ['PUT', 'PATCH'], codes: [ 403, 500, 501 ] }
        ],
        servers: ['http://unavailable', 'http://valid']
      }
    })

    before(function () {
      nock('http://unavailable')
        .get('/hello')
        .reply(500)
      nock('http://unavailable')
        .post('/hello')
        .reply(500)
      nock('http://unavailable')
        .post('/greetings')
        .reply(503)
      nock('http://unavailable')
        .put('/hello')
        .reply(403)
      nock('http://unavailable')
        .delete('/hello')
        .reply(503)
      nock('http://unavailable')
        .put('/greetings')
        .reply(503)
      nock('http://unavailable')
        .patch('/hello')
        .reply(503)
      nock('http://valid')
        .get('/hello')
        .reply(204)
      nock('http://valid')
        .delete('/hello')
        .reply(204)
      nock('http://valid')
        .post('/greetings')
        .reply(204)
      nock('http://valid')
        .put('/greetings')
        .reply(204)
    })

    after(function () {
      nock.cleanAll()
    })

    beforeEach(function () {
      client.resetStats()
    })

    it('should resolve a GET request with success status', function (done) {
      client.get('/hello', function (err, res) {
        expect(res.status).to.be.equal(204)
        done()
      })
    })

    it('should omit fallback in a POST request with 500 status', function (done) {
      client.post('/hello', function (err, res) {
        expect(res.status).to.be.equal(500)
        done()
      })
    })

    it('should perform server fallback in a POST request with 503 status', function (done) {
      client.post('/greetings', function (err, res) {
        expect(res.status).to.be.equal(204)
        done()
      })
    })

    it('should omit fallback in a PUT request with 403 status', function (done) {
      client.put('/hello', function (err, res) {
        expect(res.status).to.be.equal(403)
        done()
      })
    })

    it('should perform server fallback in a PUT request with 503 status', function (done) {
      client.put('/greetings', function (err, res) {
        expect(res.status).to.be.equal(204)
        done()
      })
    })

    it('should perform server fallback in a DELETE request with 503 status', function (done) {
      client.delete('/hello', function (err, res) {
        expect(res.status).to.be.equal(204)
        done()
      })
    })
  })

  describe('omit retry cycle when the given config matches', function () {
    var client = Resilient({
      service: {
        retry: 1,
        omitRetryWhen: [
          { method: 'POST', code: 500 },
          { methods: ['PUT', 'PATCH'], codes: [ 403, 500, 501 ] }
        ],
        servers: ['http://unavailable', 'http://unavailable', 'http://unavailable']
      }
    })

    before(function () {
      nock('http://unavailable')
        .get('/hello')
        .times(6)
        .reply(500)
      nock('http://unavailable')
        .post('/hello')
        .times(3)
        .reply(500)
      nock('http://unavailable')
        .put('/hello')
        .times(3)
        .reply(403)
      nock('http://unavailable')
        .put('/greetings')
        .times(6)
        .reply(503)
      nock('http://unavailable')
        .patch('/hello')
        .times(3)
        .reply(500)
      nock('http://unavailable')
        .patch('/greetings')
        .times(6)
        .reply(503)
      nock('http://unavailable')
        .delete('/hello')
        .times(6)
        .reply(500)
    })

    after(function () {
      nock.cleanAll()
    })

    beforeEach(function () {
      client.resetStats()
    })

    it('should resolve a GET with multiple retry cycle attempts', function (done) {
      client.get('/hello', function (err, res) {
        expect(err.status).to.be.equal(1000)
        expect(err.request.status).to.be.equal(500)
        done()
      })
    })

    it('should omit retry cycle in a POST request with 500 status', function (done) {
      client.post('/hello', function (err, res) {
        expect(res.status).to.be.equal(500)
        done()
      })
    })

    it('should omit retry cycle in a PUT request with 403 status', function (done) {
      client.put('/hello', function (err, res) {
        expect(res.status).to.be.equal(403)
        done()
      })
    })

    it('should resolve a PUT request with multiple retry cycles attempts', function (done) {
      client.put('/greetings', function (err, res) {
        expect(err.status).to.be.equal(1000)
        expect(err.request.status).to.be.equal(503)
        done()
      })
    })

    it('should omit retry cycle in a PATCH request with 501 status', function (done) {
      client.patch('/hello', function (err, res) {
        expect(res.status).to.be.equal(500)
        done()
      })
    })

    it('should resolve a PATCH request with multiple retry cycles attempts', function (done) {
      client.patch('/greetings', function (err, res) {
        expect(err.status).to.be.equal(1000)
        expect(err.request.status).to.be.equal(503)
        done()
      })
    })

    it('should resolve a DELETE with multiple retry cycle attempts', function (done) {
      client.delete('/hello', function (err, res) {
        expect(err.status).to.be.equal(1000)
        expect(err.request.status).to.be.equal(500)
        done()
      })
    })
  })

})
