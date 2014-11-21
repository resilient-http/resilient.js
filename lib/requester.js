var _ = require('./utils')
var http = require('./http')
var resilientOptions = require('./defaults').resilientOptions
var ResilientError = require('./error')
var DiscoveryServers = require('./discovery-servers')

module.exports = Requester

function Requester(resilient) {
  function getServersList(servers, operation) {
    if (resilient.balancer().get('enable')) {
      return servers.sort(operation, resilient.balancer())
    } else {
      return servers.get()
    }
  }

  function request(servers, options, cb, buf) {
    var operation = getOperation(options.method)
    var serversList = getServersList(servers, operation)
    options = _.clone(options)

    function requestNextServer(previousError) {
      var handler, server = serversList.shift()
      if (server) {
        options.url = _.join(server.url, options.basePath, options.path)
        handler = requestHandler(server, operation, options, cb, requestNextServer)
        sendRequest(resilient, options, handler, buf)
      } else {
        handleMissingServers(servers, options, previousError, cb)
      }
    }

    requestNextServer()
  }

  function handleMissingServers(servers, options, previousError, cb) {
    var retry = null
    if (options.retry) {
      retry = waitBeforeRetry(servers, options, cb)
      if (options.discoverBeforeRetry && resilient.hasDiscoveryServers()) {
        updateAndRetry(resilient, retry)
      } else {
        retry()
      }
    } else {
      cb(new ResilientError(1000, previousError))
    }
  }

  function waitBeforeRetry(servers, options, cb) {
    return function () {
      _.delay(retry(servers, options, cb), options.retryWait)
    }
  }

  function retry(servers, options, cb) {
    return function () {
      if (servers.exists()) {
        options.retry -= 1
        resilient.emit('request:retry', options, servers)
        request(servers, options, cb)
      } else {
        cb(new ResilientError(1005))
      }
    }
  }

  return request
}

function requestHandler(server, operation, options, cb, nextServer) {
  var start = _.now()
  return function requestReporter(err, res) {
    var latency = _.now() - start
    if (isErrorResponse(options, err, res)) {
      server.reportError(operation, latency)
      nextServer(err)
    } else {
      server.report(operation, latency)
      resolveRequest(err, res, cb)
    }
  }
}

function sendRequest(resilient, options, handler, buf) {
  var request = null
  try {
    request = getHttpClient(resilient)(_.omit(options, resilientOptions), handler)
    if (buf) buf.push(request)
  } catch (err) {
    handler(err)
  }
}

function updateAndRetry(resilient, onRetry) {
  resilient._updating = false
  Requester.DiscoveryResolver.update(resilient, null, onRetry)
}

function resolveRequest(err, res, cb) {
  var resolution = err || res
  var body = resolution ? resolution.body || resolution.data : null
  http.mapResponse(cb)(err, res, body)
}

function getHttpClient(resilient) {
  return typeof resilient._httpClient === 'function' ? resilient._httpClient : http
}

function isErrorResponse(options, err, res) {
  return (options.promiscuousErrors && (isErrorStatus(err || res)))
    || isUnavailableStatus(err, res)
}

function isUnavailableStatus(err, res) {
  return (err
    && (err.code !== undefined
    || (err.status === undefined && res == undefined)))
    || isInvalidStatus(err || res)
    || false
}

function isInvalidStatus(res) {
  return checkResponseStatus(429, res)
}

function isErrorStatus(res) {
  return checkResponseStatus(400, res)
}

function checkResponseStatus(code, res) {
  return (res && !res.code && (res.status >= code || res.status === 0)) || false
}

function getOperation(method) {
  return !method || method.toUpperCase() === 'GET' ? 'read' : 'write'
}
