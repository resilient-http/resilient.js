var expect = require('chai').expect
var nock = require('nock')
var sinon = require('sinon')
var _ = require('../lib/utils')
var Resilient = require('../')

var timer = _.timer;
function stubTimer(time) {
  _.timer = function () {
    console.log('stubTimer', time)
    return function () {
      return time
    }
  }
}

describe('Servers sorting', function () {
  if (process.env.CI) return

  describe('balance by best available server', function () {

    var resilient = Resilient({
      service: {
        timeout: 100,
        servers: [
          // 'http://unavailable',
          // 'http://timeout',
          // 'http://unavailable',
          // 'http://timeout',
          'http://valid1',
          // 'http://unavailable',
          'http://valid2',
          'http://valid3'
        ]
      },
      balancer: {
        roundRobin: false
      }
    })

    before(function () {
      nock('http://timeout')
        .persist()
        .filteringPath(function () { return '/' })
        .get('/')
        .socketDelay(150)
        .reply(200)
      nock('http://unavailable')
        .persist()
        .filteringPath(function () { return '/' })
        .get('/')
        .reply(503)

      nock('http://valid1')
        .persist()
        .get('/hello')
        .reply(200, { name: 'Chuck' })
      nock('http://valid2')
        .persist()
        .get('/hello')
        .reply(200, { name: 'Norris' })
      nock('http://valid3')
        .persist()
        .get('/hello')
        .reply(200, { name: 'Elthon' })
    })

    after(function () {
      _.timer = timer;
      nock.cleanAll()
    })

    it('should resolve with the valid1 server', function (done) {
      stubTimer(100)

      resilient.get('/hello', function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        expect(res.data).to.be.deep.equal({ name: 'Chuck' })
        done()
      })
    })

    it('should then resolve with valid2 server', function (done) {
      stubTimer(150)

      resilient.get('/hello', function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        expect(res.data).to.be.deep.equal({ name: 'Norris' })
        done()
      })
    })

    it('should then resolve with valid3 server', function (done) {
      stubTimer(200)

      resilient.get('/hello', function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        expect(res.data).to.be.deep.equal({ name: 'Elthon' })
        done()
      })
    })

    it('should then resolve with the valid1 server', function (done) {
      stubTimer(100)

      resilient.get('/hello', function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        expect(res.data).to.be.deep.equal({ name: 'Chuck' })
        done()
      })
    })

    it('should then resolve with the valid1 server', function (done) {
      stubTimer(100)

      resilient.get('/hello', function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        expect(res.data).to.be.deep.equal({ name: 'Chuck' })
        done()
      })
    })

    it('should then resolve with the valid2 server', function (done) {
      stubTimer(150)

      resilient.get('/hello', function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        expect(res.data).to.be.deep.equal({ name: 'Norris' })
        done()
      })
    })

    it('should then resolve with the valid1 server again', function (done) {
      stubTimer(100)

      resilient.get('/hello', function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        expect(res.data).to.be.deep.equal({ name: 'Chuck' })
        done()
      })
    })

    it('should then resolve with the valid2 server again', function (done) {
      stubTimer(150)

      resilient.get('/hello', function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        expect(res.data).to.be.deep.equal({ name: 'Norris' })
        done()
      })
    })

    it('should then resolve with the valid2 server again', function (done) {
      stubTimer(200)

      resilient.get('/hello', function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        expect(res.data).to.be.deep.equal({ name: 'Elthon' })
        done()
      })
    })
  })
})
