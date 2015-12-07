var ResilientError = require('../error')
var Requester = require('../requester')
var ServersDiscovery = require('../discovery')
var ServiceResolve = require('./service')

module.exports = DiscoveryResolver

Requester.DiscoveryResolver = DiscoveryResolver

function DiscoveryResolver (resilient, options, servers) {
  var sync = resilient._sync

  function resolver (resolve) {
    return function (err, res) {
      sync.unlock('updating')
      sync.dequeue('updating').forEach(function (cb) { cb(err, res) })
      resolve(err, res)
    }
  }

  function updateServers (cb) {
    sync.lock('updating')
    ServersDiscovery(resilient, options, servers)(resolver(cb))
  }

  return function resolve (cb) {
    if (sync.locked('updating')) {
      sync.enqueue('updating', cb)
    } else {
      updateServers(cb)
    }
  }
}

DiscoveryResolver.update = function (resilient, options, cb) {
  DiscoveryResolver(resilient, options)(ServiceResolve(resilient)(cb))
}

DiscoveryResolver.fetch = function (resilient, options, cb) {
  DiscoveryResolver(resilient, options)(fetchHandler(cb))
}

function fetchHandler (cb) {
  return function (err, res) {
    if (err) {
      cb(err)
    } else if (res && res.data) {
      cb(null, res.data)
    } else {
      cb(new ResilientError(1001, res))
    }
  }
}
