var _ = require('./utils')
var Servers = require('./servers')
var Requester = require('./requester')
var ResilientError = require('./error')

var CONCURRENCY = 3

module.exports = ServersDiscovery

function ServersDiscovery (resilient, options, servers) {
  var requester = Requester(resilient)
  var middleware = resilient._middleware

  function getOptions () {
    return _.merge(resilient.options('discovery').get(), options)
  }

  function getServers () {
    return servers || resilient.servers('discovery')
  }

  function hasDiscoveryServers () {
    var servers = getServers()
    return servers && servers.exists() || false
  }

  function updateServersInParallel (options, cb) {
    var buf = []
    var servers = getServers().sort('read', resilient.balancer())
    var pending = counter(servers.length)

    var onServersUpdateFn = onUpdateServers(cb, buf)
    var onUpdateInParallelFn = onUpdateInParallel(servers, pending, onServersUpdateFn)

    servers.slice(0, CONCURRENCY).forEach(function (server, index) {
      var pool = [ server ]
      if (index === 2 && servers.length > CONCURRENCY) {
        pool = pool.concat(servers.slice(CONCURRENCY))
      }
      requester(new Servers(pool), options, onUpdateInParallelFn, buf)(null)
    })
  }

  function updateServers (options, next) {
    if (options.parallel) {
      updateServersInParallel(options, next)
    } else {
      requester(getServers(), options, onUpdateServers(next))(null)
    }
  }

  function fetchServers (next) {
    var options = getOptions()
    options.params = addTimeStamp(options)

    middleware.run('discovery', 'out')(options, function (err) {
      if (err) {
        next(new ResilientError(1007, err))
      } else {
        updateServers(options, next)
      }
    })
  }

  return function resolver (next) {
    if (hasDiscoveryServers() === false) {
      next(new ResilientError(1002))
    } else {
      fetchServers(next)
    }
  }
}

function onUpdateInParallel (servers, counter, next) {
  return function handler (err, res) {
    var pending = counter()
    if (err == null || pending === 0) {
      counter(true)
      next(err, res)
    }
  }
}

function counter (total) {
  total = total > 2 ? CONCURRENCY : total
  return function decrement (reset) {
    return (total = reset ? -1 : (total - 1))
  }
}

function addTimeStamp (options) {
  return _.extend(options.params || options.qs || {}, { _time: _.now() })
}

function onUpdateServers (cb, buf) {
  return function (err, res) {
    closeAndEmptyPendingRequests(buf)
    cb(err || null, res)
  }
}

function closeAndEmptyPendingRequests (buf) {
  if (buf) {
    if (!isEmptyBuffer(buf)) {
      buf.forEach(closePendingRequest)
    }
    buf.splice(0)
  }
}

function closePendingRequest (client) {
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

function closeClient (client) {
  if (typeof client.abort === 'function') {
    try { client.abort() } catch (e) {}
  }
}

function isEmptyBuffer (buf) {
  return buf.filter(function (request) { return _.isObj(request) }).length === 0
}
