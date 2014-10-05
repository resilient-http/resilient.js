var expect = require('chai').expect
var nock = require('nock')
var Resilient = require('../')

describe('Resilient discovery', function () {

  describe('discovery servers', function() {
    var resilient = Resilient({
      discovery: {
        timeout: 50,
        servers: [
          'http://unavailable',
          'http://timeout',
          'http://valid'
        ]
      }
    })

    before(function () {
      nock('http://unnavailable')
        .filteringPath(/\?(.*)/g, '')
        .get('/')
        .reply(503)
      nock('http://timeout')
        .filteringPath(function () { return '/' })
        .get('/')
        .delayConnection(100)
        .reply(500)
      nock('http://valid')
        .filteringPath(/\?(.*)/g, '')
        .get('/')
        .reply(200, [ 'http://server' ])
      nock('http://server')
        .get('/hello')
        .reply(200, { hello: 'world' })
    })

    it('should fallback to the request', function (done) {
      resilient.get('/hello', function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        expect(res.data).to.be.deep.equal({ hello: 'world' })
        done()
      })
    })
  })

  describe('timeout discovery servers with retry', function() {
    var resilient = Resilient({
      discovery: {
        timeout: 50,
        retry: 2,
        retryWait: 50,
        servers: [
          'http://timeout/1',
          'http://timeout/2',
          'http://timeout/3'
        ]
      }
    })

    before(function () {
      nock('http://timeout')
        .filteringPath(function () { return '/' })
        .get('/')
        .times(9)
        .delayConnection(100)
        .reply(503)
    })

    after(function () {
      nock.cleanAll()
    })

    it('should fallback to the request', function (done) {
      var start = Date.now()
      var end = 50 * 3 * 3
      resilient.get('/hello', function (err, res) {
        expect(err.status).to.be.equal(1000)
        expect(err.code).to.be.equal('ETIMEDOUT')
        console.log(Date.now() - start, end)
        expect(Date.now() - start > end).to.be.true
        done()
      })
    })
  })

  describe('unavailable discovery servers with retry support', function() {
    var resilient = Resilient({
      discovery: {
        timeout: 50,
        retry: 3,
        retryWait: 50,
        servers: [
          'http://unavailable/1',
          'http://unavailable/2',
          'http://unavailable/3'
        ]
      }
    })

    before(function () {
      nock('http://unavailable')
        .persist()
        .filteringPath(function () { return '/' })
        .get('/')
        .delayConnection(10)
        .reply(503)
    })

    after(function () {
      nock.cleanAll()
    })

    it('should fallback to the request', function (done) {
      var start = Date.now()
      var end = 10 * 3 * 4
      resilient.get('/hello', function (err, res) {
        expect(err.status).to.be.equal(1000)
        expect(Date.now() - start > end).to.be.true
        done()
      })
    })
  })

  describe('timeout discovery servers parallel', function () {
    var resilient = Resilient({
      discovery: {
        timeout: 50,
        parallel: true,
        servers: [
          'http://timeout/1',
          'http://timeout/2',
          'http://timeout/2',
          'http://valid'
        ]
      }
    })

    before(function () {
      nock('http://timeout')
        .filteringPath(function () { return '/' })
        .get('/')
        .times(3)
        .delayConnection(100)
        .reply(503)
      nock('http://valid')
        .filteringPath(function () { return '/' })
        .get('/')
        .delayConnection(10)
        .reply(200, ['http://server'])
      nock('http://server')
        .get('/hello')
        .reply(200, { hello: 'world' })
    })

    after(function () {
      nock.cleanAll()
    })

    it('should resolve with a vlaid status', function (done) {
      var start = Date.now()
      resilient.get('/hello', function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        expect(res.data).to.be.deep.equal({ hello: 'world' })
        expect((Date.now() - start) < 100).to.be.true
        done()
      })
    })
  })

})
