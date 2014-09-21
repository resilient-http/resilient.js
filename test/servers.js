var expect = require('chai').expect
var Servers = require('../src/servers')

describe('Servers', function () {
  var servers = null

  describe('basic servers', function () {
    var list = ['http://1.server.com', 'http://2.server.com', 'http://3.server.com']
    var stats = [ [10, 2, 542], [12, 2, 386], [9, 5, 230] ]

    it('should create a servers list', function () {
      servers = new Servers({ servers: list })
      expect(servers).to.be.an('object')
    })

    it('should expose the server array and have valid data', function () {
      expect(servers.servers).to.be.an('array')
      expect(servers.servers).to.be.length(3)
      expect(servers.servers[0]).to.be.an('object')
    })

    it('should define servers with custom stats', function () {
      servers.servers.forEach(function (server, index) {
        server.stats.read.request = stats[index][0]
        server.stats.read.error = stats[index][1]
        server.stats.read.latency = stats[index][2]
      })
    })

    it('should get the best available server', function () {
      expect(servers.bestAvailable('read')).to.be.equal(servers.servers[1])
    })
  })
})
