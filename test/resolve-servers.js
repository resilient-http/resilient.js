var expect = require('chai').expect
var nock = require('nock')
var Resilient = require('../')

describe('Resolve servers', function () {

  describe('missing servers', function () {
    it('should have resolve with a missing servers error', function (done) {
      Resilient().get('/test', function (err) {
        expect(err.status).to.be.equal(1002)
        done()
      })
    })
  })

  describe('multiple fallback servers', function () {
    var resilient = Resilient({
      service: {
        timeout: 100,
        servers: [
          'http://unavailable:8888',
          'http://timeout',
          'http://unavailable:8888',
          'http://timeout',
          'http://valid'
        ]
      }
    })

    before(function () {
      nock('http://timeout')
        .get('/hello')
        .delayConnection(200)
        .reply(204)
      nock('http://valid')
        .get('/hello')
        .reply(200)
    })

    after(function () {
      nock.cleanAll()
    })

    it('should resolve with a valid status', function (done) {
      resilient.get('/hello', function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        done()
      })
    })
  })

  describe('timeout exceeded total failure', function () {
    var resilient = Resilient({
      service: {
        timeout: 20,
        servers: [
          'http://timeout',
          'http://timeout',
          'http://timeout',
          'http://timeout'
        ]
      }
    })

    before(function () {
      nock('http://timeout')
        .filteringPath(function () { return '/' })
        .persist(4)
        .get('/')
        .delayConnection(500)
        .reply(503)
    })

    after(function () {
      nock.cleanAll()
    })

    it('should resolve with a error timeout status', function (done) {
      resilient.get('/hello', function (err, res) {
        expect(err.status).to.be.equal(1000)
        expect(err.code).to.be.equal('ETIMEDOUT')
        expect(res).to.be.undefined
        done()
      })
    })
  })

  describe('define client with base path', function () {
    var resilient = Resilient({
      service: {
        basePath: '/base',
        servers: ['http://server']
      }
    })

    before(function () {
      nock('http://server')
        .get('/base/hello')
        .reply(200, { name: 'Chuck' })
    })

    after(function () {
      nock.cleanAll()
    })

    it('should resolve with valid status', function (done) {
      resilient.get('/hello', function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        expect(res.data).to.deep.equal({ name: 'Chuck' })
        done()
      })
    })
  })

  describe('unavailable servers status fallback error', function () {
    var resilient = Resilient({
      service: {
        servers: [
          'http://unavailable',
          'http://unavailable',
          'http://unavailable',
          'http://unavailable'
        ]
      }
    })

    before(function () {
      nock('http://unavailable')
        .get('/hello')
        .times(4)
        .reply(503)
    })

    after(function () {
      nock.cleanAll()
    })

    it('should resolve with a error timeout status', function (done) {
      resilient.get('/hello', function (err, res) {
        expect(err.status).to.be.equal(1000)
        expect(res).to.be.undefined
        done()
      })
    })
  })

  describe('promiscuous error mode', function () {
    var resilient = Resilient({
      service: {
        promiscuousErrors: true,
        servers: [
          'http://not-found',
          'http://bad-request',
          'http://forbidden',
          'http://valid'
        ]
      }
    })

    before(function () {
      nock('http://not-found')
        .get('/hello')
        .times(2)
        .reply(404)
      nock('http://bad-request')
        .get('/hello')
        .times(2)
        .reply(400)
      nock('http://forbidden')
        .get('/hello')
        .reply(403)
      nock('http://valid')
        .get('/hello')
        .reply(200)
    })

    after(function () {
      nock.cleanAll()
    })

    it('should resolve with valid status', function (done) {
      resilient.get('/hello', function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        done()
      })
    })
  })

  describe('unavailable servers by timeout and status code', function () {
    var resilient = Resilient({
      service: {
        timeout: 50,
        servers: [
          'http://timeout',
          'http://unavailable',
          'http://timeout',
          'http://unavailable'
        ]
      }
    })

    before(function () {
      nock('http://timeout')
        .get('/hello')
        .times(2)
        .delayConnection(100)
        .reply(503)
      nock('http://unavailable')
        .get('/hello')
        .times(2)
        .reply(503)
    })

    after(function () {
      nock.cleanAll()
    })

    it('should resolve with an error timeout status', function (done) {
      resilient.get('/hello', function (err, res) {
        expect(err.status).to.be.equal(1000)
        expect(res).to.be.undefined
        done()
      })
    })
  })

  describe('infinity number of servers retry attemps', function () {
    var resilient = Resilient({
      service: {
        timeout: 50,
        retry: Infinity,
        waitBeforeRetry: 10,
        servers: [
          'http://unavailable',
          'http://unavailable',
          'http://unavailable'
        ]
      }
    })

    before(function () {
      nock('http://unavailable')
        .persist()
        .get('/hello')
        .delayConnection(10)
        .reply(503)
    })

    after(function () {
      nock.cleanAll()
    })

    it('should retry until max timeout exceeds', function (done) {
      var start = Date.now()
      var end = 450
      resilient.get('/hello', function (err, res) {
        expect(res.status).to.be.equal(204)
        expect(Date.now() - start > end).to.be.true
        done()
      })

      setTimeout(function () {
        nock.cleanAll()
        nock('http://unavailable')
          .get('/hello')
          .reply(204)
      }, 500)
    })
  })

  describe('callback error exception', function () {
    var resilient = Resilient({
      service: {
        timeout: 50,
        waitBeforeRetry: 10,
        servers: [
          'http://unavailable',
          'http://unavailable',
          'http://valid'
        ]
      }
    })

    before(function () {
      nock('http://unavailable')
        .get('/hello')
        .times(2)
        .delayConnection(10)
        .reply(503)
      nock('http://valid')
        .get('/hello')
        .reply(204)
    })

    after(function () {
      nock.cleanAll()
    })

    it('should retry values', function (done) {
      function callback() {
        missing()
      }

      function handler(err, res) {
        expect(callback).to.throw(ReferenceError)
        done()
      }

      resilient.get('/hello', handler)
    })
  })

})
