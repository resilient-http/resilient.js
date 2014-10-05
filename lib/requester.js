var _ = require('./utils')
var http = require('./http')
var ResilientError = require('./error')
var DiscoveryServers = require('./discovery-servers')

module.exports = Requester

function Requester(resilient) {
  function getServersList(servers, operation) {
    if (resilient.balancer().enabled) {
      return servers.servers.slice()
    } else {
      return servers.sort(operation)
    }
  }

  function request(servers, options, cb, buf) {
    var operation = getOperation(options.method)
    var serversList = getServersList(servers, operation)
    options = _.clone(options)

    function next(previousError) {
      var handler, server = serversList.shift()
      if (server) {
        handler = requestHandler(server, operation, cb, next)
        options.url = _.join(server.url, options.basePath, options.path)
        sendRequest(options, handler, buf)
      } else {
        handleMissingServers(servers, options, previousError, cb)
      }
    }

    next()
  }

  function handleMissingServers(servers, options, previousError, cb) {
    var retry = null
    if (options.retry) {
      retry = delayRetry(servers, options, cb)
      if (options.retryUpdate) {
        resilient._updating = false
        Requester.DiscoveryResolver(resilient)
          (DiscoveryServers(resilient)
            (retry))
      } else {
        retry()
      }
    } else {
      cb(new ResilientError(1000, previousError))
    }
  }

  function delayRetry(servers, options, cb) {
    return function () {
      _.delay(retry(servers, options, cb), options.retryWait)
    }
  }

  function retry(servers, options, cb) {
    return function () {
      var discovery = resilient.getDiscoveryServers()
      if (discovery && discovery.exists()) {
        options.retry -= 1
        request(servers, options, cb)
      } else {
        cb(new ResilientError(1005))
      }
    }
  }

  function getOptions(type) {
    return resilient.options.get(type || 'service')
  }

  return request
}

function requestHandler(server, operation, cb, next) {
  var start = _.now()
  return function (err, res) {
    var latency = _.now() - start
    if (isUnavailableStatus(err, res) || res == undefined) {
      server.reportError(operation, latency)
      next(err)
    } else {
      server.report(operation, latency)
      cb(null, res)
    }
  }
}

function sendRequest(options, handler, buf) {
  var request = null
  try {
    request = http(options, handler)
    if (buf) buf.push(request)
  } catch (err) {
    handler(err)
  }
  options = buf = null
}

function isUnavailableStatus(err, res) {
  if (err) {
    return err.code !== undefined || isInvalidStatus(err)
  } else if (_.isObj(res)) {
    return isInvalidStatus(res)
  }
}

function isInvalidStatus(res) {
  return res.status >= 429 || res.status === 0
}

function getOperation(method) {
  return !method || method.toUpperCase() === 'GET' ? 'read' : 'write'
}
