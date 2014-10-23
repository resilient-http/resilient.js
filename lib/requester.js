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

    function next(previousError) {
      var server = serversList.shift()
      if (server) {
        options.url = _.join(server.url, options.basePath, options.path)
        sendRequest(resilient, options, requestHandler(server, operation, options, cb, next), buf)
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
      if (options.discoverBeforeRetry && resilient.hasDiscoveryServers()) {
        Requester.DiscoveryResolver.update(resilient, retry)
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
      if (servers.exists()) {
        options.retry -= 1
        request(servers, options, cb)
      } else {
        cb(new ResilientError(1005))
      }
    }
  }

  function requestHandler(server, operation, options, cb, next) {
    var start = _.now()
    return function (err, res) {
      var latency = _.now() - start
      if (isErrorResponse(options, err, res)) {
        server.reportError(operation, latency)
        next(err)
      } else {
        server.report(operation, latency)
        resolve(res, cb)
      }
    }
  }

  function isErrorResponse(options, err, res) {
    return (options.promiscuousErrors && isErrorStatus(err || res)) || isUnavailableStatus(err, res)
  }

  function resolve(res, cb) {
    http.mapResponse(cb)(null, res, res.body)
  }

  function getOptions(type) {
    return resilient.options.get(type || 'service')
  }

  return request
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

function getHttpClient(resilient) {
  return resilient._httpClient ? resilient._httpClient : http
}

function isUnavailableStatus(err, res) {
  return (err && err.code !== undefined) || res == undefined || isInvalidStatus(err || res) || false
}

function isInvalidStatus(res) {
  return checkResponseStatus(429, res)
}

function isErrorStatus(res) {
  return checkResponseStatus(400, res)
}

function checkResponseStatus(code, res) {
  return res && (res.code || res.status >= code || res.status === 0) || false
}

function getOperation(method) {
  return !method || method.toUpperCase() === 'GET' ? 'read' : 'write'
}

function mapResponse(res) {
  if (res && res.body && !res.data) res.data = res.body
  return res
}
