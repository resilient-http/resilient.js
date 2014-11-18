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

  describe('invalid refresh servers with custom retry', function() {
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
          'http://refresh-timeout'
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
        .delayConnection(1000)
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
        expect(err).to.be.an('object')
        expect(err.status).to.be.equal(1001)
        expect(err.error.code).to.match(/ETIMEDOUT|ENOTFOUND/)
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
          'http://discovery-unavailable',
          'http://discovery-timeout',
          'http://discovery-valid'
        ]
      }
    })

    before(function () {
      nock('http://discovery-unnavailable')
        .filteringPath(/\?(.*)/g, '')
        .persist()
        .get('/')
        .reply(503)
      nock('http://discovery-timeout')
        .filteringPath(function () { return '/' })
        .persist()
        .get('/')
        .delayConnection(100)
        .reply(500)
      nock('http://discovery-valid')
        .filteringPath(/\?(.*)/g, '')
        .persist()
        .get('/app/hydra')
        .reply(200, [
          'http://discovery-unavailable',
          'http://discovery-timeout',
          'http://discovery-valid'
        ])
    })

    before(function () {
      nock('http://discovery-valid')
        .filteringPath(/\?(.*)/g, '')
        .get('/')
        .reply(200, [ 'http://server-1' ])
      nock('http://server-1')
        .get('/hello')
        .reply(200, { hello: 'server-1' })
    })

    after(function () {
      nock.cleanAll()
    })

    it('should perform a valid request asking to the current discovery servers', function (done) {
      resilient.get('/hello', function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        expect(res.data).to.be.deep.equal({ hello: 'server-1' })
        done()
      })
    })

    it('should wait 350 miliseconds', function (done) {
      setTimeout(done, 350)
    })

    it('should register a new discovery mock server with a different URL', function () {
      nock('http://discovery-valid')
        .filteringPath(/\?(.*)/g, '')
        .get('/')
        .reply(200, [ 'http://server-2' ])
      nock('http://server-2')
        .get('/hello')
        .reply(200, { hello: 'server-2' })
    })

    it('should update the discovery servers list and perform a valid request', function (done) {
      resilient.get('/hello', function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        expect(res.data).to.be.deep.equal({ hello: 'server-2' })
        done()
      })
    })

    it('should wait 350 miliseconds', function (done) {
      setTimeout(done, 350)
    })

    it('should register a new discovery mock server with a different URL', function () {
      nock('http://discovery-valid')
        .filteringPath(/\?(.*)/g, '')
        .get('/')
        .reply(200, [ 'http://server-3' ])
      nock('http://server-3')
        .get('/hello')
        .reply(200, { hello: 'server-3' })
    })

    it('should update the discovery servers list and perform a valid request', function (done) {
      resilient.get('/hello', function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        expect(res.data).to.be.deep.equal({ hello: 'server-3' })
        done()
      })
    })

    it('should have valid discovery servers list', function () {
      var servers = resilient.discoveryServers().urls()
      expect(servers).to.be.deep.equal([
        'http://discovery-unavailable',
        'http://discovery-timeout',
        'http://discovery-valid'
      ])
    })

    it('should have valid service servers list', function () {
      var servers = resilient.servers().urls()
      expect(servers).to.be.deep.equal([
        'http://server-3'
      ])
    })
  })
})
