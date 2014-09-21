var expect = require('chai').expect
var Server = require('../src/server')

describe('Server', function () {
  var server = null

  it('should create a server with a valid URI', function () {
    server = new Server('http://host.me:8080')
    expect(server).to.be.an('object')
  })

  it('should have the uri property', function () {
    expect(server.uri).to.be.equal('http://host.me:8080')
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
      expect(server.getStats('read', 'latency')).to.be.equal(150)
      server.report('read', 'request', 50)
      expect(server.getStats('read', 'request')).to.be.equal(3)
      expect(server.getStats('read', 'latency')).to.be.equal(200)
    })
    it('should report the errors', function () {
      server.report('read', 'error', 100)
      expect(server.getStats('read', 'error')).to.be.equal(1)
      expect(server.getStats('read', 'latency')).to.be.equal(300)
      server.report('read', 'error', 50)
      expect(server.getStats('read', 'error')).to.be.equal(2)
      expect(server.getStats('read', 'latency')).to.be.equal(350)
    })
  })

  describe('stats server balance', function () {
    it('should have a valid balance', function () {
      expect(server.getBalance()).to.be.equal(51.5)
    })

    it('should have a valid latency average per request', function () {
      expect(server.getLatency()).to.be.equal(70)
    })
  })
})
