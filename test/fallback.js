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

})
