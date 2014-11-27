var expect = require('chai').expect
var Servers = require('../lib/servers')

describe('Servers', function () {
  var servers = null
  var list = ['http://1.server.com', 'http://2.server.com', 'http://3.server.com']
  var stats = [ [10, 2, 542], [12, 2, 386], [9, 5, 230] ]

  it('should create a servers list', function () {
    servers = new Servers(list)
    expect(servers).to.be.an('object')
  })

  it('should expose the server array and have valid data', function () {
    expect(servers.servers).to.be.an('array')
    expect(servers.servers).to.be.length(3)
    expect(servers.servers[0]).to.be.an('object')
  })

  it('should have a valid number of servers', function () {
    expect(servers.size()).to.be.equal(3)
  })

  it('should define servers with custom stats', function () {
    servers.servers.forEach(function (server, index) {
      server.statsStore.read.request = stats[index][0]
      server.statsStore.read.error = stats[index][1]
      server.statsStore.read.latency = stats[index][2]
    })
  })

  it('should get the servers URLs', function () {
    expect(servers.urls()).to.deep.equal(list)
  })

  it('should find an existent server', function () {
    expect(servers.find('http://1.server.com')).to.be.an('object')
  })

  it('should cannot find a non existent server', function () {
    expect(servers.find('http://empty')).to.be.null
  })

  describe('sort', function () {
    it('should sort by best availability', function () {
      expect(servers.sort()).to.have.length(3)
    })

    it('should have a valid first server', function () {
      expect(servers.sort()[0].url).to.be.equal(list[2])
    })

    it('should have a valid last server', function () {
      expect(servers.sort()[2].url).to.be.equal(list[0])
    })
  })

  describe('update', function () {
    it('should set an existent server and reuse it', function () {
      servers.set(['http://2.server.com'])
      expect(servers.servers).to.have.length(1)
      expect(servers.servers[0].url).to.be.equal('http://2.server.com')
    })

    it('should persist the stats when server update', function () {
      expect(servers.servers[0].statsStore.read.request).to.be.equal(12)
    })
  })

  describe('reset', function () {
    it('should reset servers list stats', function () {
      servers.resetStats()
    })

    it('should have empty stats values', function () {
      expect(servers.servers[0].statsStore.read.request).to.be.equal(0)
      expect(servers.servers[0].statsStore.write.request).to.be.equal(0)
      expect(servers.servers[0].statsStore.read.error).to.be.equal(0)
      expect(servers.servers[0].statsStore.write.error).to.be.equal(0)
    })
  })
})
