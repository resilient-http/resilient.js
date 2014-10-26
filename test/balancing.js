var expect = require('chai').expect
var nock = require('nock')
var Resilient = require('../')

describe('Servers sorting', function () {
  describe('balance by best available server', function () {
    var resilient = Resilient({
      service: {
        timeout: 100,
        servers: [
          'http://unavailable',
          'http://timeout',
          'http://unavailable',
          'http://timeout',
          'http://valid1',
          'http://unavailable',
          'http://valid2',
          'http://valid3',
        ]
      },
      balancer: {
        roundRobin: false
      }
    })

    before(function () {
      nock('http://timeout')
        .filteringPath(function () { return '/' })
        .get('/')
        .times(1)
        .delayConnection(150)
        .reply(200)
      nock('http://unavailable')
        .filteringPath(function () { return '/' })
        .get('/')
        .times(1)
        .reply(503)
      nock('http://valid1')
        .get('/hello')
        .times(2)
        .reply(200, { name: 'Chuck' })
      nock('http://valid2')
        .get('/hello')
        .delayConnection(40)
        .times(2)
        .reply(200, { name: 'Norris' })
      nock('http://valid3')
        .get('/hello')
        .delayConnection(80)
        .times(3)
        .reply(200, { name: 'Elthon' })
    })

    after(function () {
      nock.cleanAll()
    })

    it('should resolve with the valid1 server', function (done) {
      resilient.get('/hello', function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        expect(res.data).to.be.deep.equal({ name: 'Chuck' })
        done()
      })
    })

    it('should then resolve with valid2 server', function (done) {
      resilient.get('/hello', function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        expect(res.data).to.be.deep.equal({ name: 'Norris' })
        done()
      })
    })

    it('should then resolve with valid3 server', function (done) {
      resilient.get('/hello', function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        expect(res.data).to.be.deep.equal({ name: 'Elthon' })
        done()
      })
    })

    it('should then resolve with the valid1 server', function (done) {
      resilient.get('/hello', function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        expect(res.data).to.be.deep.equal({ name: 'Chuck' })
        done()
      })
    })

    it('should then resolve with the valid2 server', function (done) {
      resilient.get('/hello', function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        expect(res.data).to.be.deep.equal({ name: 'Norris' })
        done()
      })
    })

    it('should then resolve with the valid3 server', function (done) {
      resilient.get('/hello', function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        expect(res.data).to.be.deep.equal({ name: 'Elthon' })
        done()
      })
    })

    it('should then resolve with the valid3 server again', function (done) {
      resilient.get('/hello', function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        expect(res.data).to.be.deep.equal({ name: 'Elthon' })
        done()
      })
    })
  })
})
