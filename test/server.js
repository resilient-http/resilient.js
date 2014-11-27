var expect = require('chai').expect
var Server = require('../lib/server')

describe('Server', function () {
  var server = null

  it('should create a server with a valid URI', function () {
    server = new Server('http://host.me:8080')
    expect(server).to.be.an('object')
  })

  it('should have the url property', function () {
    expect(server.url).to.be.equal('http://host.me:8080')
  })

  it('should initialize the server stats', function () {
    expect(server.statsStore.read).to.be.deep.equal({
      latency: 0,
      error: 0,
      request: 0
    })
    expect(server.statsStore.write).to.be.deep.equal({
      latency: 0,
      error: 0,
      request: 0
    })
  })

  describe('stats reporting', function () {
    it('should report the requests', function () {
      server.report('read', 100)
      expect(server.stats('read', 'request')).to.be.equal(1)
      expect(server.stats('read', 'latency')).to.be.equal(100)
      server.report('read', 50)
      expect(server.stats('read', 'request')).to.be.equal(2)
      expect(server.stats('read', 'latency')).to.be.equal(75)
      server.report('read', 50)
      expect(server.stats('read', 'request')).to.be.equal(3)
      expect(server.stats('read', 'latency')).to.be.equal(41.67)
    })
    it('should report the errors', function () {
      server.reportError('read', 100)
      expect(server.stats('read', 'error')).to.be.equal(1)
      expect(server.stats('read', 'latency')).to.be.equal(35.42)
      server.reportError('read', 50)
      expect(server.stats('read', 'error')).to.be.equal(2)
      expect(server.stats('read', 'latency')).to.be.equal(17.08)
    })
  })

  describe('stats server balance', function () {
    it('should have a valid balance', function () {
      expect(server.balance()).to.be.equal(34.98)
    })

    it('should have a valid latency average per request', function () {
      expect(server.stats().latency).to.be.equal(17.08)
    })
  })

  describe('reset server stats', function () {
    it('should reset values', function () {
      server.resetStats()
    })

    it('should have empty values', function () {
      expect(server.statsStore.read).to.be.deep.equal({
        latency: 0,
        error: 0,
        request: 0
      })
      expect(server.statsStore.write).to.be.deep.equal({
        latency: 0,
        error: 0,
        request: 0
      })
    })
  })
})
