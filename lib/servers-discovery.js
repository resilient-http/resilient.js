var _ = require('./utils')
var ResilientError = require('./error')
var Servers = require('./servers')
var Requester = require('./requester')

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

  function fetchServers(cb) {
    var options = getOptions()
    options.params = addTimeStamp(options)
    if (options.parallel) {
      updateServersInParallel(options, cb)
    } else {
      Requester(resilient)(getServers(), options, onUpdateServers(cb))
    }
  }

  function updateServersInParallel(options, cb) {
    var buf = []
    var servers = getServers().sort('read', resilient.balancer())
    var pending = counter(servers.length > 2 ? 3 : servers.length)

    servers.slice(0, 3).forEach(function (server, index) {
      server = [ server ]
      if (index === 2 && servers.length > 3) {
        server = server.concat(servers.slice(3))
      }
      Requester(resilient)(new Servers(server), options, onUpdateInParallel(servers, pending, buf, cb), buf)
    })
  }

  function onUpdateInParallel(servers, counter, buf, cb) {
    return function (err, res) {
      var pending = counter()
      if (!err || pending === 0) {
        counter(true) // reset
        onUpdateServers(cb, buf)(err, res)
      }
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

function counter(total) {
  return function decrement(reset) {
    return (total = reset ? -1 : (total - 1))
  }
}

function addTimeStamp(options) {
  return _.extend(options.params || options.qs || {}, { _time: _.now() })
}

function onUpdateServers(cb, buf) {
  return function (err, res) {
    closePendingRequests(buf)
    cb(err || null, res)
  }
}

function closePendingRequests(buf) {
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
