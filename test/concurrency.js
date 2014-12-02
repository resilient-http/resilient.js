var expect = require('chai').expect
var nock = require('nock')
var fw = require('fw')
var Resilient = require('../')

describe('Concurrency', function () {
  describe('discovery', function () {
    describe('read operation', function () {
      var resilient = Resilient({
        discovery: {
          timeout: 50,
          servers: [
            'http://timeout',
            'http://unavailable',
            'http://timeout',
            'http://valid'
          ]
        }
      })

      before(function () {
        nock('http://timeout')
          .filteringPath(function () { return '/' })
          .get('/')
          .delayConnection(150)
          .reply(200)
        nock('http://unavailable')
          .filteringPath(function () { return '/' })
          .get('/')
          .reply(503)
        nock('http://valid')
          .filteringPath(function () { return '/' })
          .get('/')
          .reply(200, ['http://server'])
        nock('http://server')
          .filteringPath(function () { return '/' })
          .get('/')
          .times(52)
          .delayConnection(5)
          .reply(200, { hello: 'world' })
      })

      after(function () {
        nock.cleanAll()
      })

      function expecter(done) {
        return function (err, res) {
          expect(err).to.be.null
          expect(res.status).to.be.equal(200)
          expect(res.data).to.be.deep.equal({ hello: 'world' })
          done()
        }
      }

      it('should resolve with a valid status', function (done) {
        resilient.get('/hello', expecter(done))
      })

      it('should resolve with a valid status', function (done) {
        resilient.get('/world', expecter(done))
      })

      it('should resolve all the concurrent request with valid state', function (done) {
        var i = 0, pool = []
        function request(done) { resilient.get('/chuck', expecter(done)) }
        while ((i += 1) < 50) { pool.push(request) }
        fw.parallel(pool, done)
      })
    })

    describe('write operations', function () {
      var resilient = Resilient({
        discovery: {
          timeout: 50,
          servers: [
            'http://timeout',
            'http://unavailable',
            'http://timeout',
            'http://valid'
          ]
        }
      })

      before(function () {
        nock('http://timeout')
          .filteringPath(function () { return '/' })
          .get('/')
          .delayConnection(150)
          .reply(200)
        nock('http://unavailable')
          .filteringPath(function () { return '/' })
          .get('/')
          .reply(503)
        nock('http://valid')
          .filteringPath(function () { return '/' })
          .get('/')
          .reply(200, ['http://server'])
        nock('http://server')
          .filteringPath(function () { return '/' })
          .post('/')
          .times(52)
          .delayConnection(5)
          .reply(200, { hello: 'world' })
      })

      after(function () {
        nock.cleanAll()
      })

      function expecter(done) {
        return function (err, res) {
          expect(err).to.be.null
          expect(res.status).to.be.equal(200)
          expect(res.data).to.be.deep.equal({ hello: 'world' })
          done()
        }
      }

      it('should resolve with a valid status', function (done) {
        resilient.post('/hello', expecter(done))
      })

      it('should resolve with a valid status', function (done) {
        resilient.post('/world', expecter(done))
      })

      it('should resolve all the concurrent request with valid state', function (done) {
        var i = 0, pool = []
        function request(done) { resilient.post('/chuck', expecter(done)) }
        while ((i += 1) < 50) { pool.push(request) }
        fw.parallel(pool, done)
      })
    })
  })
})
