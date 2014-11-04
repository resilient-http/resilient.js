var _ = require('./utils')
var ResilientError = require('./error')
var Servers = require('./servers')
var Requester = require('./requester')
var DiscoveryServers = require('./discovery-servers')

module.exports = DiscoveryResolver

function DiscoveryResolver(resilient, options) {
  function getOptions() {
    return _.merge(resilient.getOptions('discovery').get(), options)
  }

  function getServers() {
    return resilient.servers('discovery')
  }

  function isUpdating() {
    return resilient._updating
  }

  function hasDiscoveryServers() {
    var servers = getServers()
    return (servers && servers.exists()) || false
  }

  function resolver(cb) {
    if (hasDiscoveryServers() === false) {
      cb(new ResilientError(1002))
    } else if (isUpdating()) {
      resilient._queue.push(cb)
    } else {
      updateServers(cb)
    }
  }

  function updateServers(cb) {
    try {
      fetchServers(cb)
    } catch (err) {
      resilient._updating = false
      cb(new ResilientError(1006, err))
    }
  }

  function fetchServers(cb) {
    var options = getOptions()
    options.params = addTimeStamp(options)
    resilient._updating = true
    if (options.parallel) {
      updateServersInParallel(options, cb)
    } else {
      Requester(resilient)(getServers(), options, onUpdateServers(cb))
    }
  }

  function updateServersInParallel(options, cb) {
    var buf = [], servers = getServers().sort('read', resilient.balancer())
    servers.slice(0, 3).forEach(function (server, index) {
      server = [ server ]
      if (index === 2 && servers.length > 3) {
        server = server.concat(servers.slice(3))
      }
      Requester(resilient)(new Servers(server), options, onUpdateInParallel(index, buf, cb), buf)
    })
  }

  function onUpdateInParallel(index, buf, cb) {
    return function (err, res) {
      if (err) buf[index] = null
      if (res || index === 2) {
        onUpdateServers(cb, buf)(err, res)
      }
    }
  }

  function onUpdateServers(cb, buf) {
    return function (err, res) {
      dispatchQueue(err, res)
      closePendingRequests(buf)
      cb(err || null, res)
    }
  }

  function dispatchQueue(err, res) {
    resilient._updating = false
    resilient._queue.forEach(function (cb) { cb(err, res) })
    resilient._queue.splice(0)
  }

  function closePendingRequests(buf) {
    if (buf) {
      if (!isEmptyBuffer(buf)) {
        buf.forEach(closeAliveRequest)
      }
      buf.splice(0)
    }
  }

  return resolver
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

function addTimeStamp(options) {
  var time = _.now() + Math.floor(Math.random() * 10000)
  return _.extend(options.params || options.qs || {}, { _time: time })
}

function closeAliveRequest(client) {
  if (client) {
    if (client.xhr) {
      if (client.xhr.readyState !== 4) {
        closeClient(client.xhr)
      }
    } else if (typeof client.abort === 'function') {
      closeClient(client)
    }
  }
}

function closeClient(client) {
  try { client.abort() } catch (e) {}
}

function isEmptyBuffer(buf) {
  return buf.filter(function (request) { return _.isObj(request) }).length === 0
}
