var _ = require('./utils')
var http = require('./http')
var ResilientError = require('./error')
var resilientOptions = require('./defaults').resilientOptions

module.exports = Requester

function Requester (resilient) {
  return function request (servers, options, cb, buf) {
    var operation = getOperation(options.method)
    var serversList = getServersList(resilient, servers, operation)
    options = _.clone(options)

    return function requestNextServer (previousError) {
      var handler = null
      var server = serversList.shift()

      if (server) {
        options = defineRequestOptions(server, options)
        handler = requestHandler(server, operation, options, resolveRequest(cb), requestNextServer, resilient)
        sendRequest(resilient, options, handler, buf)
      } else {
        handleMissingServers(resilient, servers, options, previousError, cb)
      }
    }
  }
}

function getServersList (resilient, servers, operation) {
  if (resilient.balancer().get('enable')) {
    return servers.sort(operation, resilient.balancer())
  } else {
    return servers.get()
  }
}

function handleMissingServers (resilient, servers, options, getPreviousResponse, cb) {
  var cachedPreviousResponse = getPreviousResponse()
  var responseObj = getFirstValue(cachedPreviousResponse)

  if (shouldOmitRetryCycle(options, responseObj)) {
    cb.apply(null, cachedPreviousResponse)
  } else if (options.retry) {
    retryRequest(resilient, servers, options, cb)
  } else {
    cb(new ResilientError(1000, responseObj))
  }
}

function retryRequest (resilient, servers, options, cb) {
  var onRetry = retrier(resilient, servers, options, cb)
  var retry = waitBeforeRetry(onRetry, options)

  if (options.discoverBeforeRetry) {
    updateDiscoveryServersAndRetry(resilient, retry)
  } else {
    retry()
  }
}

function waitBeforeRetry (retrier, options) {
  return function () {
    _.delay(retrier, options.waitBeforeRetry)
  }
}

function retrier (resilient, servers, options, cb) {
  return function () {
    if (servers.exists()) {
      options.retry -= 1
      resilient.emit('request:retry', options, servers)
      Requester(resilient)(servers, options, cb)()
    } else {
      cb(new ResilientError(1005))
    }
  }
}

function requestHandler (server, operation, options, resolve, nextServer, resilient) {
  var start = _.now()
  return function requestReporter (err, res) {
    var latency = _.now() - start
    resilient.emit('request:incoming', err, res, options, resilient)

    if (shouldOmitFallback(options, err || res)) {
      server.reportError(operation, latency)
      resolve(err, res)
    } else if (isErrorResponse(resilient, options, err, res)) {
      server.reportError(operation, latency)
      resilient.emit('request:fallback', options, err || res)
      nextServer(memoizeResponse(err, res))
    } else {
      server.report(operation, latency)
      resolve(err, res)
    }
  }
}

function memoizeResponse (err, res) {
  return function (cb) {
    return [ err, res ]
  }
}

function sendRequest (resilient, options, handler, buf) {
  resilient.emit('request:outgoing', options, resilient)

  try {
    var request = getHttpClient(resilient)(_.omit(options, resilientOptions), handler)
    if (buf) buf.push(request)
  } catch (err) {
    handler(err)
  }
}

function resolveRequest (cb) {
  var mapAndResolve = http.mapResponse(cb)
  return function (err, res) {
    var resolution = err || res
    var body = resolution ? resolution.body || resolution.data : null
    mapAndResolve(err, res, body)
  }
}

function defineRequestOptions (server, options) {
  options.url = _.join(server.url, options.basePath, options.path)
  options.timeout = getTimeout(options)
  return options
}

function getTimeout (options) {
  var timeout = options.$timeout || options.timeout
  var timeouts = options.timeouts
  var method = options.method

  if (!options.$timeout && _.isObj(timeouts)) {
    timeout = timeouts[method] || timeouts[method.toLowerCase()] || timeout
  }

  return timeout
}

function getFirstValue (arr) {
  return arr.filter(function (v) { return v != null }).pop()
}

function updateDiscoveryServersAndRetry (resilient, onRetry) {
  if (resilient.hasDiscoveryServers()) {
    resilient._sync.unlock('updating')
    Requester.DiscoveryResolver.update(resilient, null, onRetry)
  } else {
    onRetry()
  }
}

function shouldOmitRetryCycle (options, err) {
  return shouldOmitOnErrorCode(options.omitRetryOnErrorCodes, err ? err.status : null) ||
    shouldOmitOnMethod(options.omitRetryOnMethods, options.method) ||
    shouldOmitWhenRules(options.omitRetryWhen, options.method, err)
}

function shouldOmitFallback (options, err) {
  return shouldOmitFallbackOnErrorCode(options, err) ||
    shouldOmitFallbackOnMethod(options) ||
    shouldOmitWhenRules(options.omitFallbackWhen, options.method, err)
}

function shouldOmitFallbackOnMethod (options) {
  var methods = options.omitFallbackOnMethods
  return shouldOmitOnMethod(methods, options.method)
}

function shouldOmitWhenRules (rules, method, res) {
  return _.isArr(rules) &&
    res && res.status &&
    rules.some(ruleFilter(method, res))
}

function ruleFilter (method, err) {
  return function (rule) {
    return _.isObj(rule) &&
      matchRuleMethod(rule, method) &&
      matchRuleStatusCode(rule, err.status)
  }
}

function matchRuleMethod (rule, method) {
  return ((rule.method && rule.method === method) ||
    _.isArr(rule.methods) && matchHttpMethod(rule.methods, method))
}

function matchRuleStatusCode (rule, status) {
  return status && ((rule.code && rule.code === status) ||
    (_.isArr(rule.codes) && shouldOmitOnErrorCode(rule.codes, status)))
}

function shouldOmitFallbackOnErrorCode (options, err) {
  var codes = options.omitFallbackOnErrorCodes
  return err && shouldOmitOnErrorCode(codes, err.status)
}

function shouldOmitOnMethod (methods, method) {
  return _.isArr(methods) && methods.length && matchHttpMethod(methods, method)
}

function shouldOmitOnErrorCode (codes, status) {
  return status && _.isArr(codes) && codes.length &&
    ~codes.indexOf(status) &&
    status >= 300
}

function matchHttpMethod (methods, method) {
  method = (method || 'GET').toUpperCase()
  return methods
    .filter(function (m) { return typeof m === 'string' })
    .map(function (m) { return m.toUpperCase().trim() })
    .some(function (m) { return m === method })
}

function isErrorResponse (resilient, options, err, res) {
  return isUnavailableStatus(err, res) ||
    resilient._failStrategies.eval(err, res) ||
    (options.promiscuousErrors && (isErrorStatus(err || res)))
}

function isUnavailableStatus (err, res) {
  return (err && (err.code !== undefined ||
    (err.status === undefined && res === undefined))) ||
    isInvalidStatus(err || res) ||
    false
}

function isInvalidStatus (res) {
  return checkResponseStatus(429, res)
}

function isErrorStatus (res) {
  return checkResponseStatus(400, res)
}

function checkResponseStatus (code, res) {
  return (res && !res.code && (res.status >= code || res.status === 0)) || false
}

function getOperation (method) {
  return method.toUpperCase() === 'GET' ? 'read' : 'write'
}

function getHttpClient (resilient) {
  return typeof resilient._httpClient === 'function' ? resilient._httpClient : http
}
