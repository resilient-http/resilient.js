var expect = require('chai').expect
var nock = require('nock')
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
          .persist()
          .filteringPath(function () { return '/' })
          .get('/')
          .reply(200, { hello: 'world' })
      })

      after(function () {
        nock.cleanAll()
      })

      it('should resolve with a valid status', function (done) {
        resilient.get('/hello', function (err, res) {
          expect(err).to.be.null
          expect(res.status).to.be.equal(200)
          expect(res.data).to.be.deep.equal({ hello: 'world' })
          done()
        })
      })

      it('should resolve with a valid status', function (done) {
        resilient.get('/world', function (err, res) {
          expect(err).to.be.null
          expect(res.status).to.be.equal(200)
          expect(res.data).to.be.deep.equal({ hello: 'world' })
          done()
        })
      })

      it('should resolve with a valid status', function (done) {
        resilient.get('/chuck', function (err, res) {
          expect(err).to.be.null
          expect(res.status).to.be.equal(200)
          expect(res.data).to.be.deep.equal({ hello: 'world' })
          done()
        })
      })
    })
  })
})
