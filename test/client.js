var expect = require('chai').expect
var nock = require('nock')
var Resilient = require('../')

describe('Client', function () {
  var client = Resilient({
    balancer: { roundRobin: false },
    discovery: {
      timeout: 50,
      servers: [
        'http://timeout/1',
        'http://unavailable',
        'http://timeout/2',
        'http://valid'
      ]
    }
  }).client()

  before(function () {
    nock('http://unnavailable')
      .filteringPath(/\?(.*)/g, '')
      .persist()
      .get('/')
      .reply(503)
    nock('http://timeout')
      .filteringPath(function () { return '/' })
      .persist()
      .get('/')
      .delayConnection(100)
      .reply(500)
    nock('http://valid')
      .filteringPath(/\?(.*)/g, '')
      .persist()
      .get('/')
      .reply(200, [ 'http://server' ])
  })

  after(function () {
    nock.cleanAll()
  })

  describe('send', function () {
    before(function () {
      nock('http://server')
        .post('/hello')
        .reply(200, { hello: 'world' })
    })

    it('should perform a valid request', function (done) {
      client.send('/hello', { method: 'POST' }, function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        expect(res.data).to.be.deep.equal({ hello: 'world' })
        done()
      })
    })
  })

  describe('GET', function () {
    before(function () {
      nock('http://server')
        .get('/hello')
        .reply(200, { hello: 'world' })
    })

    it('should perform a valid request', function (done) {
      client.get('/hello', function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        expect(res.data).to.be.deep.equal({ hello: 'world' })
        done()
      })
    })
  })

  describe('POST', function () {
    before(function () {
      nock('http://server')
        .filteringRequestBody(/.*/, '*')
        .post('/hello', '*')
        .reply(200, function (uri, body) {
          return body
        })
    })

    it('should perform a valid request', function (done) {
      client.post({ path: '/hello', data: { hello: 'world' }}, function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        expect(res.data).to.be.deep.equal({ hello: 'world' })
        done()
      })
    })
  })

  describe('PUT', function () {
    before(function () {
      nock('http://server')
        .filteringRequestBody(/.*/, '*')
        .put('/hello', '*')
        .reply(200, function (uri, body) {
          return body
        })
    })

    it('should perform a valid request', function (done) {
      client.put({ path: '/hello', data: { hello: 'world' }}, function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        expect(res.data).to.be.deep.equal({ hello: 'world' })
        done()
      })
    })
  })

  describe('DELETE', function () {
    before(function () {
      nock('http://server')
        .filteringRequestBody(/.*/, '*')
        .delete('/hello', '*')
        .reply(200, function (uri, body) {
          return body
        })
    })

    it('should perform a valid request', function (done) {
      client.del({ path: '/hello', data: { hello: 'world' }}, function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        expect(res.data).to.be.deep.equal({ hello: 'world' })
        done()
      })
    })
  })

  describe('PATCH', function () {
    before(function () {
      nock('http://server')
        .patch('/hello')
        .reply(200, { hello: 'world' })
    })

    it('should perform a valid request', function (done) {
      client.patch('/hello', function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        expect(res.data).to.be.deep.equal({ hello: 'world' })
        done()
      })
    })
  })

  describe('HEAD', function () {
    before(function () {
      nock('http://server')
        .head('/hello')
        .reply(200, { hello: 'world' })
    })

    it('should perform a valid request', function (done) {
      client.head('/hello', function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        expect(res.data).to.be.deep.equal({ hello: 'world' })
        done()
      })
    })
  })
})
