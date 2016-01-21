var expect = require('chai').expect
var nock = require('nock')
var http = require('../lib/http')

describe('HTTP', function () {
  describe('GET', function () {
    before(function () {
      nock('http://server')
        .get('/hello')
        .reply(200, { hello: 'world' })
    })

    it('should perform a valid request', function (done) {
      http('http://server/hello', function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        expect(res.headers['content-type']).to.be.equal('application/json')
        expect(res.data).to.be.deep.equal({ hello: 'world' })
        done()
      })
    })
  })

  describe('POST', function () {
    before(function () {
      nock('http://server')
        .post('/hello')
        .reply(200, { hello: 'world' })
    })

    it('should perform a valid request', function (done) {
      http({ url: 'http://server/hello', method: 'POST' }, function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        expect(res.headers['content-type']).to.be.equal('application/json')
        expect(res.data).to.be.deep.equal({ hello: 'world' })
        done()
      })
    })
  })

  describe('PUT', function () {
    before(function () {
      nock('http://server')
        .put('/hello')
        .reply(200, { hello: 'world' })
    })

    it('should perform a valid request', function (done) {
      http({ url: 'http://server/hello', method: 'PUT' }, function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        expect(res.headers['content-type']).to.be.equal('application/json')
        expect(res.data).to.be.deep.equal({ hello: 'world' })
        done()
      })
    })
  })

  describe('DELETE', function () {
    before(function () {
      nock('http://server')
        .delete('/hello')
        .reply(200, { hello: 'world' })
    })

    it('should perform a valid request', function (done) {
      http({ url: 'http://server/hello', method: 'DELETE' }, function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        expect(res.headers['content-type']).to.be.equal('application/json')
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
      http({ url: 'http://server/hello', method: 'PATCH' }, function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        expect(res.headers['content-type']).to.be.equal('application/json')
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
      http({ url: 'http://server/hello', method: 'HEAD' }, function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        expect(res.headers['content-type']).to.be.equal('application/json')
        expect(res.data).to.be.deep.equal({ hello: 'world' })
        done()
      })
    })
  })

  describe('custom headers', function () {
    before(function () {
      nock('http://server')
        .matchHeader('version', '1.0')
        .get('/hello')
        .reply(202, { hello: 'world' })
    })

    it('should perform a valid request', function (done) {
      http({
        url: 'http://server/hello',
        headers: {
          version: '1.0'
        }
      }, function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(202)
        expect(res.data).to.be.deep.equal({ hello: 'world' })
        done()
      })
    })
  })

  describe('body payload', function () {
    before(function () {
      nock('http://server')
        .post('/hello', '{"ping":"pong"}')
        .reply(202, { hello: 'world' })
        .get('/bad-json')
        .reply(200, '{"a":5', {'Content-Type': 'application/json'})
    })

    it('should perform a valid request', function (done) {
      http({
        url: 'http://server/hello',
        data: JSON.stringify({ ping: 'pong' }),
        method: 'POST'
      }, function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(202)
        expect(res.data).to.be.deep.equal({ hello: 'world' })
        done()
      })
    })

    it('should handle unparsable response', function (done) {
      http({
        url: 'http://server/bad-json',
        method: 'GET'
      }, function (err, res) {
        expect(err).to.be.notNull
        expect(res.status).to.be.equal(200)
        expect(res.data).to.be.undefined
        done()
      })
    })
  })

  describe('request timeout', function () {
    before(function () {
      nock('http://server')
        .get('/hello')
        .delayConnection(100)
        .reply(202, { hello: 'world' })
    })

    it('should perform a valid request', function (done) {
      http({
        url: 'http://server/hello',
        timeout: 50
      }, function (err, res) {
        expect(err.code).to.be.equal('ETIMEDOUT')
        expect(res).to.be.undefined
        done()
      })
    })
  })

  describe('unavailable', function () {
    before(function () {
      nock('http://server')
        .get('/hello')
        .reply(503)
    })

    it('should perform a valid request', function (done) {
      http({ url: 'http://server/hello' }, function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(503)
        done()
      })
    })
  })

})
