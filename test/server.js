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
    expect(server.stats.read).to.be.deep.equal({
      latency: 0,
      error: 0,
      request: 0
    })
    expect(server.stats.write).to.be.deep.equal({
      latency: 0,
      error: 0,
      request: 0
    })
  })

  describe('stats reporting', function () {
    it('should report the requests', function () {
      server.report('read', 'request', 100)
      expect(server.getStats('read', 'request')).to.be.equal(1)
      expect(server.getStats('read', 'latency')).to.be.equal(100)
      server.report('read', 'request', 50)
      expect(server.getStats('read', 'request')).to.be.equal(2)
      expect(server.getStats('read', 'latency')).to.be.equal(75)
      server.report('read', 'request', 50)
      expect(server.getStats('read', 'request')).to.be.equal(3)
      expect(server.getStats('read', 'latency')).to.be.equal(41.67)
    })
    it('should report the errors', function () {
      server.report('read', 'error', 100)
      expect(server.getStats('read', 'error')).to.be.equal(1)
      expect(server.getStats('read', 'latency')).to.be.equal(35.42)
      server.report('read', 'error', 50)
      expect(server.getStats('read', 'error')).to.be.equal(2)
      expect(server.getStats('read', 'latency')).to.be.equal(17.08)
    })
  })

  describe('stats server balance', function () {
    it('should have a valid balance', function () {
      expect(server.getBalance()).to.be.equal(39.27)
    })

    it('should have a valid latency average per request', function () {
      expect(server.getStats().latency).to.be.equal(17.08)
    })
  })
})
