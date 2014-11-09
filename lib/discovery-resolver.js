var _ = require('./utils')
var ResilientError = require('./error')
var Servers = require('./servers')
var Requester = require('./requester')
var DiscoveryServers = require('./discovery-servers')
var ServersDiscovery = require('./servers-discovery')

module.exports = DiscoveryResolver

function DiscoveryResolver(resilient, options, servers) {
  function resolver(cb) {
    return function finish(err, res) {
      dispatchQueue(err, res)
      cb(err, res)
    }
  }

  function updateServers(cb) {
    resilient._updating = true
    ServersDiscovery(resilient, options, servers)(resolver(cb))
  }

  function dispatchQueue(err, res) {
    resilient._updating = false
    resilient._queue.forEach(dispatcher(err, res))
    resilient._queue.splice(0)
  }

  function dispatcher(err, res) {
    return function (cb) {
      try { cb(err, res) } catch (e) {}
    }
  }

  return function resolve(cb) {
    if (resilient._updating) {
      resilient._queue.push(cb)
    } else {
      updateServers(cb)
    }
  }
}

Requester.DiscoveryResolver = DiscoveryResolver

DiscoveryResolver.update = function (resilient, options, cb) {
  DiscoveryResolver(resilient, options)
    (DiscoveryServers(resilient)
      (cb))
}

DiscoveryResolver.fetch = function (resilient, options, cb) {
  DiscoveryResolver(resilient, options)(function handler(err, res) {
    if (err) cb(err)
    else if (res && res.data) cb(null, res.data)
    else cb(new ResilientError(1001, res))
  })
}
