var ResilientError = require('./error')
var Requester = require('./requester')
var DiscoveryServers = require('./discovery-servers')
var ServersDiscovery = require('./servers-discovery')

module.exports = DiscoveryResolver

function DiscoveryResolver(resilient, options, servers) {
  var state = resilient._state

  function resolver(resolve) {
    return function finish(err, res) {
      resolve(err, res)
      unlockAndDispatchQueue(resilient, err, res)
    }
  }

  function updateServers(cb) {
    state.lock('updating')
    ServersDiscovery(resilient, options, servers)(resolver(cb))
  }

  return function resolve(cb) {
    if (state.locked('updating')) {
      state.enqueue('updating', cb)
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

function unlockAndDispatchQueue(resilient, err, res) {
  var state = resilient._state
  var queue = state.dequeue('updating')
  state.unlock('updating')
  queue.forEach(dispatcher(err, res))
}

function dispatcher(err, res) {
  return function (cb) {
    cb(err, res)
  }
}
