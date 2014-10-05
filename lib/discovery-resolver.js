var _ = require('./utils')
var ResilientError = require('./error')
var Servers = require('./servers')
var Requester = require('./requester')

module.exports = DiscoveryResolver

function DiscoveryResolver(resilient) {
  function getOptions() {
    return resilient.getOptions('discovery')
  }

  function isUpdating() {
    return resilient._updating || resilient._queue.length > 0
  }

  function hasDiscoveryServers() {
    var servers = getOptions().servers()
    return (servers && servers.exists()) || false
  }

  function resolver(cb) {
    var options = getOptions().get()
    if (!hasDiscoveryServers()) {
      cb(new ResilientError(1002))
    } else if (isUpdating()) {
      resilient._queue.push(cb)
    } else {
      updateServers(options, cb)
    }
  }

  function updateServers(options, cb) {
    try {
      fetchServers(options, cb)
    } catch (err) {
      resilient._updating = false
      cb(new ResilientError(1006, err))
    }
  }

  function fetchServers(options, cb) {
    resilient._updating = true
    options.path = addTimeStamp(options.path)
    if (options.parallel) {
      updateServersInParallel(options, cb)
    } else {
      Requester(resilient)(getOptions().servers(), options, onUpdateServers(cb))
    }
  }

  function updateServersInParallel(options, cb) {
    var buf = [], servers = getOptions().servers().sort()

    servers.slice(0, 3).forEach(function (server, index) {
      server = [ server ]
      if (index === 2 && servers.length > 3) {
        server = server.concat(servers.slice(3))
      }
      options.retry = 0
      Requester(resilient)(new Servers(server), options, onUpdate(index), buf)
    })

    function onUpdate(index) {
      return function (err, res) {
        //console.log('ERROR >', err)
        if (err) buf[index] = null
        if (res || isEmptyBuffer(buf)) {
          onUpdateServers(cb, buf)(err, res)
        }
      }
    }
  }

  function onUpdateServers(cb, buf) {
    return function (err, res) {
      resilient._updating = false
      resilient._queue.forEach(function (cb) { cb(err, res) })
      resilient._queue.splice(0)
      if (buf) closePendingRequests(buf)
      if (err) cb(err)
      else cb(null, res)
    }
  }

  function closePendingRequests(buf) {
    buf.forEach(function (client) {
      try { close(client) } catch (e) {}
    })
    buf.splice(0)
  }

  return resolver
}

Requester.DiscoveryResolver = DiscoveryResolver

function addTimeStamp(path) {
  path = path || ''
  path += path.indexOf('?') === -1 ? '?' : '&'
  path += _.now() + Math.floor(Math.random() * 10000)
  return path
}

function close(client) {
  if (client) {
    if (client.xhr) {
      if (client.xhr.readyState !== 4) client.xhr.abort()
    } else {
      client.abort()
    }
  }
}

function isEmptyBuffer(buf) {
  return !buf || buf.filter(function (request) { return _.isObj(request) }).length === 0
}
