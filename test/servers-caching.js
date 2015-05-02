var expect = require('chai').expect
var nock = require('nock')
var Resilient = require('../')

describe('Servers caching', function () {
  describe('sort by best available service server', function () {
    var initialServers = [
      'http://unavailable',
      'http://timeout',
      'http://valid'
    ]

    var newServers = [
      'http://unavailable',
      'http://timeout',
      'http://new-valid'
    ]

    var resilient = Resilient({
      discovery: {
        timeout: 100,
        cacheEnabled: true,
        servers: initialServers
      },
      balancer: { roundRobin: false }
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
        .get('/hello')
        .times(4)
        .reply(200, { name: 'Chuck'})
      nock('http://valid2')
        .filteringPath(function () { return '/' })
        .get('/')
        .reply(200, ['http://server-invalid'])
      nock('http://server-invalid')
        .get('/hello')
        .reply(503)
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

    it('should define update the discovery servers list', function () {
      resilient.discoveryServers(newServers)
      expect(resilient.discoveryServers().find('http://new-valid')).to.be.an('object')
    })

    it('should resolve from cache', function (done) {
      resilient.get('/hello', function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        expect(res.data).to.be.deep.equal({ name: 'Chuck' })
        done()
      })
    })

    it('should have a valid server in cache', function () {
      expect(resilient.cache.get('servers').data).to.be.deep.equal(['http://server'])
    })

    it('should still resolving with from cache', function (done) {
      resilient.get('/hello', function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        expect(res.data).to.be.deep.equal({ name: 'Chuck' })
        done()
      })
    })

    it('should have another valid discovery servers', function () {
      resilient.discoveryServers(initialServers)
      expect(resilient.discoveryServers().find('http://valid')).to.be.an('object')
    })

    it('should resolve from the new list of servers', function (done) {
      resilient.get('/hello', function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        expect(res.data).to.be.deep.equal({ name: 'Chuck' })
        done()
      })
    })

    it('should update the cache with valid servers', function () {
      expect(resilient.cache.get('servers').data).to.be.deep.equal(['http://server'])
    })
  })
})
