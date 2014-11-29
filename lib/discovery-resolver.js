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
      try {
        dispatchQueue(resilient, err, res)
      } catch (e) {
        throw e
      } finally {
        cb(err, res)
      }
    }
  }

  function updateServers(cb) {
    resilient._updating = true
    ServersDiscovery(resilient, options, servers)(resolver(cb))
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

function dispatchQueue(resilient, err, res) {
  var queue = resilient._queue.slice(0)
  resilient._updating = false
  resilient._queue.splice(0)
  queue.forEach(dispatcher(err, res))
}

function dispatcher(err, res) {
  return function (cb) {
    cb(err, res)
  }
}
