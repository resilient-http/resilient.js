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
        options = defineRequestOptions(server, options)
        handler = requestHandler(server, operation, options, resolveRequest(cb), requestNextServer)
        sendRequest(resilient, options, handler, buf)
      } else {
        handleMissingServers(servers, options, previousError, cb)
      }
    }

    requestNextServer()
  }

  function handleMissingServers(servers, options, previousResponse, cb) {
    var retry = null
    var previousResponse = previousResponse()

    if (shouldOmitRetryCycle(options, getFirstValue(previousResponse))) {
      cb.apply(null, previousResponse)
    } else if (options.retry) {
      retry = waitBeforeRetry(servers, options, cb)
      if (options.discoverBeforeRetry && resilient.hasDiscoveryServers()) {
        updateAndRetry(resilient, retry)
      } else {
        retry()
      }
    } else {
      cb(new ResilientError(1000, getFirstValue(previousResponse)))
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

function requestHandler(server, operation, options, resolve, nextServer) {
  var start = _.now()
  return function requestReporter(err, res) {
    var latency = _.now() - start
    if (shouldOmitFallbackOnErrorCode(options, err || res)) {
      server.reportError(operation, latency)
      resolve(err, res)
    } else if (isErrorResponse(options, err, res)) {
      server.reportError(operation, latency)
      if (shouldOmitFallbackOnMethod(options)) {
        resolve(err, res)
      } else {
        nextServer(memoizeReponse(err, res))
      }
    } else {
      server.report(operation, latency)
      resolve(err, res)
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

function resolveRequest(cb) {
  var mapAndResolve = http.mapResponse(cb)
  return function (err, res) {
    var resolution = err || res
    var body = resolution ? resolution.body || resolution.data : null
    mapAndResolve(err, res, body)
  }
}

function defineRequestOptions(server, options) {
  options.url = _.join(server.url, options.basePath, options.path)
  options.timeout = getTimeout(options)
  return options
}

function getTimeout(options) {
  var timeout = options.timeout
  var timeouts = options.timeouts
  var method = options.method
  if (_.isObj(timeouts)) {
    timeout = timeouts[method] || timeouts[method.toLowerCase()] || timeout
  }
  return timeout
}

function memoizeReponse(err, res) {
  return function (cb) {
    return [ err, res ]
  }
}

function getFirstValue(arr) {
  return arr.filter(function (v) { return v != null }).slice(0).shift()
}

function updateAndRetry(resilient, onRetry) {
  resilient._updating = false
  Requester.DiscoveryResolver.update(resilient, null, onRetry)
}

function shouldOmitRetryCycle(options, err) {
  return shouldOmitOnErrorCode(options.omitRetryOnErrorCodes, err ? err.status : null)
    || shouldOmitOnMethod(options.omitRetryOnMethods, options.method)
}

function shouldOmitFallbackOnMethod(options) {
  var methods = options.omitFallbackOnMethods
  return shouldOmitOnMethod(methods, options.method)
}

function shouldOmitFallbackOnErrorCode(options, err) {
  var codes = options.omitFallbackOnErrorCodes
  return err && shouldOmitOnErrorCode(codes, err.status)
}

function shouldOmitOnMethod(methods, method) {
  return _.isArr(methods) && methods.length
    && matchHttpMethod(methods, method)
}

function shouldOmitOnErrorCode(codes, status) {
  return status
    && _.isArr(codes) && codes.length
    && !!~codes.indexOf(status)
    && status >= 300
}

function matchHttpMethod(methods, method) {
  return methods
    .filter(function (m) { return typeof m === 'string' })
    .map(function (m) { return m.toUpperCase().trim() })
    .filter(function (m) { return typeof method === 'string' && m === method.toUpperCase() })
    .length > 0
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

function getHttpClient(resilient) {
  return typeof resilient._httpClient === 'function' ? resilient._httpClient : http
}
