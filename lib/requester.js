var _ = require('./utils')
var http = require('./http')
var ResilientError = require('./error')
var Servers = require('./servers')

module.exports = Requester

function Requester(resilient, options, cb) {

  resolve(onResolve)

  function onResolve(err) {
    if (err) {
      cb(err)
    } else if (!hasServers()) {
      cb(new ResilientError(1003))
    } else {
      requester(getServers(), getHttpOptions(options), cb)
    }
  }

  function getHttpOptions(options) {
    var defaults = resilient.options.get('service').http()
    return _.extend(defaults, options)
  }

  // Requester (to do: isolate)

  function handleMissingServers(error, cb) {
    // to do: get from cache
    var options = getOptions('discovery').get()
    if (options.retry) {
      delay(retry(servers, options, cb), options.retryWait)
    } else {
      cb(new ResilientError(1000, error))
    }
  }

  function retry(servers, options, cb) {
    return function () {
      resilient._updating = false
      if (hasServers('discovery')) {
        options = _.extend({}, options, { retry: options.retry - 1 })
        requester(servers, options, cb)
      } else {
        cb(new ResilientError(1005))
      }
    }
  }

  function requester(servers, options, cb, buf) {
    var operation = getOperation(options.method)
    var servers = _.isArr(servers) ? servers : servers.sort(operation)
    var request = null
    options = _.clone(options)

    function next(previousError) {
      var handler, server = servers.shift()
      if (server) {
        handler = requestHandler(server, operation, cb, next)
        options.url = _.join(server.url, options.basePath, options.path)
        try {
          request = http(options, handler)
          if (buf) buf.push(request)
        } catch (err) {
          handler(err)
        }
      } else {
        handleMissingServers(previousError, cb)
      }
    }

    next()
  }

  function requestHandler(server, operation, cb, next) {
    var start = _.now()
    return function (err, res) {
      var latency = _.now() - start
      if (isUnavailableStatus(err, res)) {
        server.report(operation, 'error', latency)
        next(err)
      } else {
        server.report(operation, 'request', latency)
        cb(null, res)
      }
    }
  }

  // Resolver

  function getOptions(type) {
    return resilient.options.get(type || 'service')
  }

  function getServers(type) {
    return getOptions(type).servers()
  }

  function hasServers(type) {
    var servers, valid = false
    servers = getServers(type)
    if (servers && servers.exists()) {
      if (type !== 'discovery') {
        valid = servers.lastUpdate() < (getOptions(type).get('refresh') || 0)
      } else {
        valid = true
      }
    }
    return valid
  }

  function resolve(next) {
    if (hasServers()) {
      next()
    } else {
      if (hasServers('discovery')) {
        updateServers(next)
      } else {
        next(new ResilientError(1002))
      }
    }
  }

  function updateServersInParallel(options, cb) {
    var buf = [], servers = getOptions('discovery').servers().sort()

    servers.slice(0, 3).forEach(function (server, index) {
      server = [ server ]
      if (index === 2 && servers.length > 3) {
        server = server.concat(servers.slice(3))
      }
      requester(new Servers(server), options, onUpdate, buf)
    })

    function onUpdate(err, res) {
      if (err && err.request) {
        buf.splice(buf.indexOf(err.request), 1)
      } else {
        onUpdateServers(cb, buf)(err, res)
      }
    }
  }

  function updateServers(cb) {
    var options = getOptions('discovery').get()
    if (resilient._updating) {
      resilient._queue.push(cb)
    } else {
      options.path = addTimeStamp(options.path)
      if (options.parallel) {
        updateServersInParallel(options, cb)
      } else {
        resilient._updating = true
        requester(getServers('discovery'), options, onUpdateServers(cb))
      }
    }
  }

  function onUpdateServers(cb, buf) {
    return function (err, res) {
      resilient._updating = false
      resilient._queue.forEach(function (cb) { cb(err, res) })
      resilient._queue.splice(0)
      if (buf) closeBufferedRequests(buf)
      if (err) cb(err)
      else defineServers(res, cb)
    }
  }

  function defineServers(res, cb) {
    if (_.isArr(res.data)) {
      if (res.data.length) {
        saveServers(res.data)
        cb(null, res)
      } else {
        cb(new ResilientError(1004, res))
      }
    } else {
      cb(new ResilientError(1001, res))
    }
  }

  function saveServers(data) {
    var servers = getServers()
    if (servers) servers.set(data)
    else getOptions().servers(data)
  }

  function closeBufferedRequests(buf) {
    buf.forEach(function (client) {
      if (client.xhr) {
        if (client.xhr.readyState !== 4) client.xhr.abort()
      } else {
        try { client.abort() } catch (e) {}
      }
    })
    buf.splice(0)
  }

}

function getOperation(method) {
  return !method || method.toUpperCase() === 'GET' ? 'read' : 'write'
}

function isUnavailableStatus(err, res) {
  if (err) {
    return err.code !== undefined || isInvalidStatus(err)
  } else if (res) {
    return isInvalidStatus(res)
  }
}

function isInvalidStatus(res) {
  return res.status >= 429 || res.status === 0
}

function addTimeStamp(path) {
  path = path || ''
  path += path.indexOf('?') === -1 ? '?' : '&'
  path += _.now() + Math.floor(Math.random() * 10000)
  return path
}
