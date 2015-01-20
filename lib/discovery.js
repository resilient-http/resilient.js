var _ = require('./utils')
var ResilientError = require('./error')
var Servers = require('./servers')
var Requester = require('./requester')

var MAX_PARALLEL = 3

module.exports = ServersDiscovery

function ServersDiscovery(resilient, options, servers) {
  function getOptions() {
    return _.merge(resilient.options('discovery').get(), options)
  }

  function getServers() {
    return servers || resilient.servers('discovery')
  }

  function hasDiscoveryServers() {
    var servers = getServers()
    return servers && servers.exists() || false
  }

  function updateServersInParallel(options, cb) {
    var buf = []
    var servers = getServers().sort('read', resilient.balancer())
    var pending = counter(servers.length)

    var onServersUpdateFn = function (err, res) { onUpdateServers(cb, buf)(err, res) }
    var onUpdateInParallelFn = onUpdateInParallel(servers, pending, onServersUpdateFn)

    servers.slice(0, MAX_PARALLEL).forEach(function (server, index) {
      server = [ server ]
      if (index === 2 && servers.length > MAX_PARALLEL) {
        server = server.concat(servers.slice(MAX_PARALLEL))
      }
      Requester(resilient)(new Servers(server), options, onUpdateInParallelFn, buf)(null)
    })
  }

  function fetchServers(cb) {
    var options = getOptions()
    options.params = addTimeStamp(options)

    if (options.parallel) {
      updateServersInParallel(options, cb)
    } else {
      Requester(resilient)(getServers(), options, onUpdateServers(cb))(null)
    }
  }

  function updateServers(cb) {
    try {
      fetchServers(cb)
    } catch (err) {
      cb(new ResilientError(1006, err))
    }
  }

  return function resolver(cb) {
    if (hasDiscoveryServers() === false) {
      cb(new ResilientError(1002))
    } else {
      updateServers(cb)
    }
  }
}

function onUpdateInParallel(servers, counter, next) {
  return function handler(err, res) {
    var pending = counter()
    if (err == null || pending === 0) {
      counter(true)
      next(err, res)
    }
  }
}

function counter(total) {
  total = total > 2 ? MAX_PARALLEL : total
  return function decrement(reset) {
    return (total = reset ? -1 : (total - 1))
  }
}

function addTimeStamp(options) {
  return _.extend(options.params || options.qs || {}, { _time: _.now() })
}

function onUpdateServers(cb, buf) {
  return function (err, res) {
    closeAndEmptyPendingRequests(buf)
    cb(err || null, res)
  }
}

function closeAndEmptyPendingRequests(buf) {
  if (buf) {
    if (!isEmptyBuffer(buf)) buf.forEach(closePendingRequest)
    buf.splice(0)
  }
}

function closePendingRequest(client) {
  if (client) {
    if (client.xhr) {
      if (client.xhr.readyState !== 4) {
        closeClient(client.xhr)
      }
    } else {
      closeClient(client)
    }
  }
}

function closeClient(client) {
  if (typeof client.abort === 'function') {
    try { client.abort() } catch (e) {}
  }
}

function isEmptyBuffer(buf) {
  return buf.filter(function (request) { return _.isObj(request) }).length === 0
}
