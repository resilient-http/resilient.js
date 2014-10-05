var expect = require('chai').expect
var nock = require('nock')
var Resilient = require('../')

describe('Resilient servers', function () {

  it('should expose the resilient object as global', function () {
    expect(Resilient).to.be.a('function')
  })

  describe('static servers', function () {

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
            'http://valid'
          ]
        }
      })

      before(function () {
        nock('http://timeout')
          .get('/hello')
          .delayConnection(200)
          .reply(200)
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

    describe('timeout exceed fails servers without discovery servers', function () {
      var resilient = Resilient({
        service: {
          timeout: 50,
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
          .get('/hello')
          .times(4)
          .delayConnection(100)
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

      it('should resolve with a error timeout status', function (done) {
        resilient.get('/hello', function (err, res) {
          expect(err.status).to.be.equal(1000)
          expect(res).to.be.undefined
          done()
        })
      })
    })

  })

})
