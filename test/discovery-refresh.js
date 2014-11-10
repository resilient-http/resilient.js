var expect = require('chai').expect
var nock = require('nock')
var Resilient = require('../')

describe('Refresh discovery servers', function () {
  describe('invalid discovery servers', function() {
    var resilient = Resilient({
      discovery: {
        timeout: 50,
        parallel: false,
        refreshServersInterval: 300,
        useDiscoveryServersToRefresh: false,
        servers: [
          'http://unavailable',
          'http://unavailable'
        ],
        refreshServers: [
          'http://refresh-unavailable',
          'http://refresh-timeout',
          'http://refresh-valid'
        ]
      }
    })

    before(function () {
      nock('http://unnavailable')
        .filteringPath(/\?(.*)/g, '')
        .get('/')
        .reply(503)
      nock('http://refresh-timeout')
        .filteringPath(function () { return '/' })
        .get('/')
        .delayConnection(100)
        .reply(500)
      nock('http://refresh-valid')
        .filteringPath(/\?(.*)/g, '')
        .get('/')
        .times(2)
        .reply(200, [ 'http://valid' ])
      nock('http://valid')
        .filteringPath(/\?(.*)/g, '')
        .get('/')
        .times(2)
        .reply(200, [ 'http://server' ])
      nock('http://server')
        .get('/hello')
        .times(3)
        .reply(200, { hello: 'world' })
    })

    after(function () {
      nock.cleanAll()
    })

    it('should define refresh servers', function () {
      var servers = resilient.options('discovery').get('refreshServers')
      expect(servers.urls()).to.be.deep.equal([
        'http://refresh-unavailable',
        'http://refresh-timeout',
        'http://refresh-valid'
      ])
    })

    it('should wait 350 miliseconds', function (done) {
      setTimeout(done, 350)
    })

    it('should update the discovery servers list', function (done) {
      resilient.get('/hello', function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        expect(res.data).to.be.deep.equal({ hello: 'world' })
        done()
      })
    })

    it('should have valid discovery servers list', function () {
      var servers = resilient.discoveryServers().urls()
      expect(servers).to.be.deep.equal([ 'http://valid' ])
    })

    it('should resolve without updating the servers', function (done) {
      resilient.get('/hello', function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        expect(res.data).to.be.deep.equal({ hello: 'world' })
        done()
      })
    })

    it('should wait 350 miliseconds', function (done) {
      setTimeout(done, 350)
    })

    it('should update the discovery servers list again', function (done) {
      resilient.get('/hello', function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        expect(res.data).to.be.deep.equal({ hello: 'world' })
        done()
      })
    })

    it('should have valid discovery servers list', function () {
      var servers = resilient.discoveryServers().urls()
      expect(servers).to.be.deep.equal([ 'http://valid' ])
    })
  })

  describe('missing discovery servers', function() {
    var resilient = Resilient({
      discovery: {
        timeout: 50,
        parallel: false,
        refreshServersInterval: 300,
        useDiscoveryServersToRefresh: false,
        servers: null,
        refreshServers: [
          'http://refresh-unavailable',
          'http://refresh-timeout',
          'http://refresh-valid'
        ]
      }
    })

    before(function () {
      nock('http://unnavailable')
        .filteringPath(/\?(.*)/g, '')
        .get('/')
        .reply(503)
      nock('http://refresh-timeout')
        .filteringPath(function () { return '/' })
        .get('/')
        .delayConnection(100)
        .reply(500)
      nock('http://refresh-valid')
        .filteringPath(/\?(.*)/g, '')
        .get('/')
        .reply(200, [ 'http://valid' ])
      nock('http://valid')
        .filteringPath(/\?(.*)/g, '')
        .get('/')
        .reply(200, [ 'http://server' ])
      nock('http://server')
        .get('/hello')
        .reply(200, { hello: 'world' })
    })

    after(function () {
      nock.cleanAll()
    })

    it('should define refresh servers', function () {
      var servers = resilient.options('discovery').get('refreshServers')
      expect(servers.urls()).to.be.deep.equal([
        'http://refresh-unavailable',
        'http://refresh-timeout',
        'http://refresh-valid'
      ])
    })

    it('should wait 350 miliseconds', function (done) {
      setTimeout(done, 350)
    })

    it('should update the discovery servers list', function (done) {
      resilient.get('/hello', function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        expect(res.data).to.be.deep.equal({ hello: 'world' })
        done()
      })
    })

    it('should have valid discovery servers list', function () {
      var servers = resilient.discoveryServers().urls()
      expect(servers).to.be.deep.equal([ 'http://valid' ])
    })
  })

  describe('invalid refresh servers', function() {
    var resilient = Resilient({
      discovery: {
        timeout: 50,
        retry: 1,
        retryWait: 10,
        parallel: false,
        useDiscoveryServersToRefresh: false,
        servers: null,
        refreshServers: [
          'http://refresh-unavailable',
          'http://refresh-timeout',
          'http://refresh-unavailable',
          'http://refresh-timeout',
        ]
      }
    })

    before(function () {
      nock('http://unnavailable')
        .filteringPath(/\?(.*)/g, '')
        .get('/')
        .times(8)
        .reply(503)
      nock('http://refresh-timeout')
        .filteringPath(function () { return '/' })
        .get('/')
        .times(8)
        .delayConnection(100)
        .reply(500)
    })

    after(function () {
      nock.cleanAll()
    })

    it('should define refresh servers', function () {
      var servers = resilient.options('discovery').get('refreshServers')
      expect(servers.urls()).to.be.deep.equal([
        'http://refresh-unavailable',
        'http://refresh-timeout',
        'http://refresh-unavailable',
        'http://refresh-timeout'
      ])
    })

    it('should update the discovery servers list', function (done) {
      resilient.get('/hello', function (err, res) {
        console.log(err)
        expect(err).to.be.an('object')
        expect(err.status).to.be.equal(1001)
        expect(err.error.code).to.be.equal('ETIMEDOUT')
        done()
      })
    })
  })

  describe('self discovery servers', function() {
    var resilient = Resilient({
      discovery: {
        timeout: 50,
        parallel: false,
        refreshServersInterval: 300,
        useDiscoveryServersToRefresh: true,
        refreshPath: '/app/hydra',
        servers: [
          'http://refresh-unavailable',
          'http://refresh-timeout',
          'http://refresh-valid'
        ]
      }
    })

    before(function () {
      nock('http://unnavailable')
        .filteringPath(/\?(.*)/g, '')
        .get('/')
        .reply(503)
      nock('http://refresh-timeout')
        .filteringPath(function () { return '/' })
        .get('/')
        .delayConnection(100)
        .reply(500)
      nock('http://refresh-valid')
        .filteringPath(/\?(.*)/g, '')
        .get('/app/hydra')
        .reply(200, [ 'http://valid' ])
      nock('http://valid')
        .filteringPath(/\?(.*)/g, '')
        .get('/')
        .reply(200, [ 'http://server' ])
      nock('http://server')
        .get('/hello')
        .reply(200, { hello: 'world' })
    })

    after(function () {
      nock.cleanAll()
    })

    it('should wait 350 miliseconds', function (done) {
      setTimeout(done, 350)
    })

    it('should update the discovery servers list', function (done) {
      resilient.get('/hello', function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        expect(res.data).to.be.deep.equal({ hello: 'world' })
        done()
      })
    })

    it('should have valid discovery servers list', function () {
      var servers = resilient.discoveryServers().urls()
      expect(servers).to.be.deep.equal([ 'http://valid' ])
    })
  })
})
