/*! resilient - v0.4.0 - MIT License - https://github.com/resilient-http/resilient.js */
(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.resilient = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var _ = require('./utils')

module.exports = Cache

function Cache () {
  this.store = Object.create(null)
}

Cache.prototype.flush = function (key) {
  if (key) {
    this.store[key] = null
  } else {
    this.store = _.emptyObject()
  }
}

Cache.prototype.get = function (key) {
  return key ? this.store[key] : _.clone(this.store)
}

Cache.prototype.set = function (key, data) {
  if (key) {
    this.store[key] = { data: data, time: _.now() }
  }
}

Cache.prototype.time = function (key) {
  var value = this.store[key]
  return value ? value.time : null
}

Cache.prototype.exists = function (key) {
  var value = this.store[key]
  return _.isObj(value) && (
    (_.isArr(value.data) && value.data.length > 0) ||
    _.isObj(value.data)) ||
    false
}

},{"./utils":20}],2:[function(require,module,exports){
var _ = require('./utils')
var resolver = require('./resolver')
var http = require('./http')

module.exports = Client

function Client (resilient) {
  this._resilient = resilient
}

Client.prototype.get = function (path, options, cb) {
  return this.send(path, options, cb, 'GET')
}

Client.prototype.post = function (path, options, cb) {
  return this.send(path, options, cb, 'POST')
}

Client.prototype.put = function (path, options, cb) {
  return this.send(path, options, cb, 'PUT')
}

Client.prototype.del =
Client.prototype.delete = function (path, options, cb) {
  return this.send(path, options, cb, 'DELETE')
}

Client.prototype.patch = function (path, options, cb) {
  return this.send(path, options, cb, 'PATCH')
}

Client.prototype.head = function (path, options, cb) {
  return this.send(path, options, cb, 'HEAD')
}

Client.prototype.send = function (path, options, cb, method) {
  var args = normalizeArgs.call(this, path, options, cb, method)
  var opts = args[0]
  var callback = args[1]

  var promise = new Promise(function (resolve, reject) {
    this._resilient.emit('request:start', opts, this._resilient)

    requester.apply(this, [opts, function (err, res) {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
      // Always resolve the callback
      callback(err, res)
    }])
  }.bind(this))

  // If a callback is passed, subscribe to then/catch to avoid node +6.6 stdout warnings
  if (callback !== _.noop) {
    promise.then(callback).catch(callback)
  }

  return promise
}

function requester (options, cb) {
  if (isFullUrlSchema(options)) {
    return plainHttpRequest(this._resilient, options, cb)
  } else {
    return resolver(this._resilient, options, cb)
  }
}

function normalizeArgs (path, options, cb, method) {
  if (typeof options === 'function') {
    cb = options
    options = arguments[0]
  }

  options = mergeHttpOptions(this._resilient, _.isObj(options) ? options : _.emptyObject())

  if (typeof path === 'string') options.path = path
  if (typeof method === 'string') options.method = method
  if (typeof cb !== 'function') cb = _.noop

  return [ options, wrapCallback(this._resilient, cb) ]
}

function wrapCallback (resilient, cb) {
  return once(function finalRequestHandler (err, res) {
    resilient.emit('request:finish', err, res, resilient)
    cb(err, res)
  })
}

function mergeHttpOptions (resilient, options) {
  var defaults = resilient.options('service').get()

  if (options.timeout) {
    options.$timeout = options.timeout
  }

  return _.merge(defaults, options)
}

function isFullUrlSchema (options) {
  return options && ((_.isURI(options.path) || _.isURI(options.url))) || false
}

function plainHttpRequest (resilient, options, cb) {
  if (options.path) {
    options.url = options.path
    options.path = null
  }

  return (resilient._httpClient || http)(options, cb)
}

function once (fn) {
  var called = false
  return function () {
    if (called === false) {
      called = true
      fn.apply(null, arguments)
    }
  }
}

},{"./http":7,"./resolver":13,"./utils":20}],3:[function(require,module,exports){
var defaults = module.exports = Object.create(null)

defaults.service = {
  method: 'GET',
  timeout: 10 * 1000,
  timeouts: null,
  servers: null,
  retry: 0,
  waitBeforeRetry: 50,
  discoverBeforeRetry: true,
  promiscuousErrors: false,
  omitRetryWhen: null,
  omitFallbackWhen: null,
  omitRetryOnMethods: null,
  omitFallbackOnMethods: null,
  omitRetryOnErrorCodes: null,
  omitFallbackOnErrorCodes: null
}

defaults.balancer = {
  enable: true,
  random: false,
  roundRobin: false,
  roundRobinSize: 3,
  balanceStrategy: null,
  disableWeight: false,
  weight: {
    success: 15,
    error: 20,
    latency: 0.001
  }
}

defaults.discovery = {
  servers: null,
  method: 'GET',
  retry: 3,
  parallel: true,
  waitBeforeRetry: 1000,
  timeout: 2 * 1000,
  cacheEnabled: true,
  cacheExpiration: 60 * 15 * 1000,
  promiscuousErrors: true,
  refreshInterval: 60 * 2 * 1000,
  enableRefreshServers: true,
  enableSelfRefresh: false,
  forceRefreshOnStart: true,
  refreshServersInterval: 60 * 5 * 1000,
  refreshServers: null,
  refreshOptions: null,
  refreshPath: null,
  omitRetryWhen: null,
  omitFallbackWhen: null,
  omitRetryOnMethods: null,
  omitFallbackOnMethods: null,
  omitRetryOnErrorCodes: null,
  omitFallbackOnErrorCodes: null
}

defaults.resilientOptions = [
  'servers',
  'retry',
  'timeouts',
  '$timeout',
  'parallel',
  'cacheEnabled',
  'cacheExpiration',
  'refreshInterval',
  'refreshServers',
  'refreshOptions',
  'refreshPath',
  'waitBeforeRetry',
  'promiscuousErrors',
  'omitRetryWhen',
  'omitFallbackWhen',
  'omitRetryOnMethods',
  'omitFallbackOnMethods',
  'omitRetryOnErrorCodes',
  'omitFallbackOnErrorCodes',
  'enableRefreshServers',
  'refreshServersInterval',
  'discoverBeforeRetry',
  'enableSelfRefresh',
  'forceRefreshOnStart'
]

},{}],4:[function(require,module,exports){
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

},{"./error":5,"./requester":11,"./servers":18,"./utils":20}],5:[function(require,module,exports){
module.exports = ResilientError

var MESSAGES = {
  1000: 'All requests failed. No servers available',
  1001: 'Cannot update discovery servers. Empty or invalid response body',
  1002: 'Missing discovery servers. Cannot resolve the server',
  1003: 'Cannot resolve servers. Missing data',
  1004: 'Discovery server response is invalid or empty',
  1005: 'Missing servers during retry process',
  1006: 'Internal unexpected error',
  1007: 'Middleware error'
}

function ResilientError (status, error) {
  if (error instanceof Error) {
    Error.call(this)
    this.error = error
    if (error.code) this.code = error.code
    if (error.stack) this.stack = error.stack
  } else if (error) {
    this.request = error
  }
  this.status = status
  this.message = MESSAGES[this.status]

  if (status === 1007 && error) {
    this.message += ': ' + (error.message || error)
  }
}

ResilientError.prototype = Object.create(Error.prototype)

ResilientError.MESSAGES = MESSAGES

},{}],6:[function(require,module,exports){
module.exports = Evaluator

function Evaluator () {
  this.strategies = []
}

Evaluator.prototype.add = function (strategy) {
  if (typeof strategy === 'function') {
    this.strategies.push(strategy)
  }
}

Evaluator.prototype.eval = function (err, res) {
  return this.strategies.some(function (strategy) {
    return strategy(err, res)
  })
}

},{}],7:[function(require,module,exports){
var _ = require('./utils')

var IS_BROWSER = typeof window === 'object' && window
var JSON_MIME = /application\/json/i
var http = resolveModule()

module.exports = HttpClient

function HttpClient () {
  return http.apply(null, arguments)
}

HttpClient.VERSION = http.VERSION
HttpClient.mapResponse = mapResponse

function mapResponse (cb) {
  return function (err, res, body) {
    if (res && res.statusCode) {
      res.status = res.statusCode
    }
    if (body) {
      try {
        (err || res).data = isJSONContent(err || res) ? JSON.parse(body) : body
      } catch (e) {
        err = e
      }
    }
    cb(err, res)
  }
}

function isJSONContent (res) {
  return typeof res.body === 'string' &&
    JSON_MIME.test(res.headers['content-type'])
}

function mapOptions (options) {
  if (typeof options === 'string') {
    options = { url: options }
  } else {
    options = options || {}
  }

  if (options.params) options.qs = options.params
  if (options.data) mapRequestBody(options)
  if (!IS_BROWSER) defineUserAgent(options)

  return options
}

function defineUserAgent (options) {
  options.headers = options.headers || {}

  if (!options.headers['User-Agent']) {
    options.headers['User-Agent'] = getUserAgent()
  }
}

function getUserAgent () {
  return 'resilient-http ' + HttpClient.LIBRARY_VERSION + ' (node)'
}

function mapRequestBody (options) {
  var body = options.data || options.body

  if (body && _.isObj(body) || _.isArr(body)) {
    options.json = true
    options.data = null
  }

  options.body = body
}

function resolveModule () {
  if (IS_BROWSER) {
    return require('lil-http')
  } else {
    return requestWrapper(require('request'))
  }
}

function requestWrapper (request) {
  return function requester (options, cb) {
    return request(mapOptions(options), mapResponse(cb))
  }
}

},{"./utils":20,"lil-http":31,"request":22}],8:[function(require,module,exports){
var http = require('./http')
var Client = require('./client')
var Options = require('./options')
var defaults = require('./defaults')
var Resilient = require('./resilient')

module.exports = Resilient

Resilient.VERSION = '0.4.0'
Resilient.CLIENT_VERSION = http.VERSION
Resilient.defaults = defaults
Resilient.Options = Options
Resilient.Client = Client
Resilient.request = http
http.LIBRARY_VERSION = Resilient.VERSION

// Force globalization in browsers
if (typeof window !== 'undefined' && typeof require === 'function') {
  window.resilient = Resilient
}

},{"./client":2,"./defaults":3,"./http":7,"./options":10,"./resilient":12}],9:[function(require,module,exports){
var _ = require('./utils')
var midware = require('midware')

var hooks = ['in', 'out']

module.exports = Middleware

function Middleware () {
  this.pool = createPool()
}

Middleware.prototype.use = function (resilient, args) {
  var pool = this.pool
  var middlewares = _.toArr(args)

  middlewares
    .filter(_.isFn)
    .map(passArgs(resilient))
    .forEach(register(pool))
}

Middleware.prototype.run = function (type, hook) {
  return this.pool[type][hook].run
}

function createPool () {
  return {
    discovery: hooksMiddleware(),
    service: hooksMiddleware()
  }
}

function hooksMiddleware () {
  return { 'in': midware(), 'out': midware() }
}

function passArgs (resilient) {
  return function (mw) {
    var type = mw.type || 'service'
    var opts = resilient.options(type)
    return { type: type, handler: mw(opts, resilient) }
  }
}

function register (pool) {
  return function (mw) {
    var hook = 'in'
    var handler = mw.handler

    if (_.isFn(handler)) {
      if (handler.hook === 'out') {
        hook = 'out'
      }
      pool[mw.type][hook](handler)
    }

    if (_.isObj(handler)) {
      hooks
        .filter(function (key) {
          return _.isFn(handler[key])
        })
        .forEach(function (key) {
          pool[mw.type][key](handler[key])
        })
    }
  }
}

},{"./utils":20,"midware":32}],10:[function(require,module,exports){
var _ = require('./utils')
var defaults = require('./defaults')
var Servers = require('./servers')

module.exports = Options

function Options (options, type) {
  this.store = type ? _.clone(defaults[type]) : Object.create(null)
  this.set(options)
}

Options.prototype.get = function (key) {
  return key ? this.store[key] : _.clone(this.store)
}

Options.prototype.http = function () {
  return _.omit(this.store, defaults.resilientOptions)
}

Options.prototype.clone = function () {
  return Options.define(getRaw(this.store))
}

Options.prototype.servers = function (servers) {
  return servers ? this.setServers(servers) : this.store.servers
}

Options.prototype.setServers = function (servers) {
  if (this.store.servers) {
    this.store.servers.set(servers)
  } else {
    this.store.servers = new Servers(servers)
  }
}

Options.prototype.set = function (key, value) {
  if (_.isObj(key)) {
    _.each(key, _.bind(this, this.set))
  } else if (value !== undefined) {
    if (key === 'servers') {
      this.setServers(value)
    } else {
      if (key === 'refreshServers') {
        value = new Servers(value)
      }
      this.store[key] = value
    }
  }
}

Options.define = function (options, defaultOptions) {
  var store = new Options()
  var opts = options || {}

  Object.keys(defaultOptions || defaults)
    .filter(function (key) {
      return key !== 'resilientOptions'
    })
    .forEach(function (type) {
      store.set(type, new Options(opts[type], type))
    })

  return store
}

function getRaw (options) {
  var buf = {}
  _.each(options, function (key, value) {
    if (value instanceof Options) {
      buf[key] = value.get()
    }
  })
  return buf
}

},{"./defaults":3,"./servers":18,"./utils":20}],11:[function(require,module,exports){
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
  var getTime = _.timer()
  return function requestReporter (err, res) {
    var latency = getTime()
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

},{"./defaults":3,"./error":5,"./http":7,"./utils":20}],12:[function(require,module,exports){
var EventBus = require('lil-event')
var _ = require('./utils')
var Sync = require('./sync')
var Cache = require('./cache')
var Client = require('./client')
var Options = require('./options')
var Middleware = require('./middleware')
var Evaluator = require('./evaluator')
var DiscoveryResolver = require('./resolvers/discovery')

module.exports = Resilient

function Resilient (options) {
  if (!(this instanceof Resilient)) return new Resilient(options)
  this.cache = new Cache()
  this._sync = new Sync()
  this._client = new Client(this)
  this._middleware = new Middleware()
  this._failStrategies = new Evaluator()
  this._options = Options.define(options)
}

Resilient.prototype = Object.create(EventBus.prototype)

Resilient.prototype.servers = function (type) {
  var options = this.options(type || 'service')
  return options ? options.servers() : null
}

Resilient.prototype.setServers = function (list, type) {
  this.options(type || 'service').servers(list)
  return this
}

Resilient.prototype.serversURL = function (type) {
  var servers = this.servers(type)
  return servers ? servers.urls() : null
}

Resilient.prototype.discoveryServers = function (list) {
  if (_.isArr(list)) {
    this.options('discovery').servers(list)
  } else {
    return this.servers('discovery')
  }
}

Resilient.prototype.hasDiscoveryServers = function () {
  var servers = this.discoveryServers()
  return _.isObj(servers) && servers.exists() || false
}

Resilient.prototype.resetScore =
Resilient.prototype.resetStats = function (type) {
  var servers = this.options(type || 'service').servers()
  if (servers) {
    servers.resetStats()
  }
  return this
}

Resilient.prototype.latestServers =
Resilient.prototype.getUpdatedServers = function (options, cb) {
  cb = typeof options === 'function' ? options : cb

  if (this.discoveryServers()) {
    this.discoverServers(options, cb)
  } else if (this.servers('service')) {
    cb(null, this.servers('service').urls())
  } else {
    cb(new Error('Missing servers'))
  }

  return this
}

Resilient.prototype.discoverServers = function (options, cb) {
  return updateServers(this, 'fetch', options, cb)
}

Resilient.prototype.updateServers = function (options, cb) {
  return updateServers(this, 'update', options, cb)
}

function updateServers (resilient, method, options, cb) {
  if (typeof options === 'function') { cb = options; options = null }
  DiscoveryResolver[method](resilient, options, cb || _.noop)
  return resilient
}

Resilient.prototype.options = function (type, options) {
  if (type && _.isObj(options)) {
    var store = this._options.get(type)
    if (store instanceof Options) {
      store.set(options)
    }
    return
  }

  if (_.isObj(type)) {
    this._options = Options.define(type)
    return
  }

  return this._options.get(type)
}

Resilient.prototype.discoveryOptions = function (options) {
  if (options) {
    this.options('discovery', options)
  } else {
    return this.options('discovery').get()
  }
}

Resilient.prototype.serviceOptions = function (options) {
  if (options) {
    this.options('service', options)
  } else {
    return this.options('service').get()
  }
}

Resilient.prototype.httpOptions = function (type) {
  var options = this.options(type || 'service')
  if (options) return options.http()
}

Resilient.prototype.useHttpClient = function (client) {
  if (typeof client === 'function') {
    this._httpClient = client
  }
  return this
}

Resilient.prototype.restoreHttpClient = function () {
  this._httpClient = null
  return this
}

Resilient.prototype.serversUpdated = function () {
  var updated = this.servers().lastUpdate()
  var refresh = this.options('discovery').get('refreshInterval') || 0
  return updated < refresh
}

Resilient.prototype.balancer = function (options) {
  if (options) {
    this.options('balancer', options)
  } else {
    return this.options('balancer')
  }
}

Resilient.prototype.send =
Resilient.prototype.request = function (path, options, cb) {
  return this._client.send(path, options, cb)
}

Resilient.prototype.mock = function (mockFn) {
  this.useHttpClient(function (options, cb) {
    _.delay(function () { mockFn(options, cb) })
  })
  return this
}

Resilient.prototype.unmock = function () {
  this.restoreHttpClient()
  return this
}

Resilient.prototype.use = function () {
  this._middleware.use(this, arguments)
  return this
}

Resilient.prototype.http =
Resilient.prototype.client = function () {
  return this._client
}

Resilient.prototype.failStrategy =
Resilient.prototype.addFailStrategy = function (strategy) {
  this._failStrategies.add(strategy)
  return this
}

;['get', 'post', 'put', 'del', 'delete', 'head', 'patch']
  .forEach(function defineMethodProxy (verb) {
    Resilient.prototype[verb] = function (path, options, cb) {
      return this._client[verb](path, options, cb)
    }
  })

},{"./cache":1,"./client":2,"./evaluator":6,"./middleware":9,"./options":10,"./resolvers/discovery":14,"./sync":19,"./utils":20,"lil-event":30}],13:[function(require,module,exports){
var _ = require('./utils')
var Servers = require('./servers')
var Requester = require('./requester')
var ResilientError = require('./error')
var ServersDiscovery = require('./discovery')
var DiscoveryResolver = require('./resolvers/discovery')

module.exports = Resolver

function Resolver (resilient, options, cb) {
  cb = wrapHandler(cb)

  var sync = resilient._sync
  var middleware = resilient._middleware

  try {
    resolve(resolver)
  } catch (err) {
    cb(new ResilientError(1006, err))
  }

  function resolve (next) {
    if (hasDiscoveryServersOutdated()) {
      updateDiscoveryServers(next)
    } else if (hasValidServiceServers()) {
      next()
    } else if (hasDiscoveryServers()) {
      updateServiceServers(next)
    } else {
      next(new ResilientError(1002))
    }
  }

  function updateDiscoveryServers (next) {
    var options = discoveryOptions()
    var servers = getRefreshServers(options)
    var refreshOptions = getRefreshOptions(options)

    if (sync.locked('discovering')) {
      sync.enqueue('discovering', onRefreshServers(options, next))
    } else {
      sync.lock('discovering')
      ServersDiscovery(resilient, refreshOptions, servers)(onRefreshServers(options, next))
    }
  }

  function onRefreshServers (options, next) {
    return function (err, res) {
      sync.unlock('discovering')
      sync.dequeue('discovering').forEach(function (cb) { cb(err, res) })

      middleware.run('discovery', 'in')(err, res, function (mErr) {
        if (err || mErr) {
          next(new ResilientError(err ? 1001 : 1007, err || mErr))
        } else if (res && res.data) {
          refreshDiscoveryServers(res.data, options)
          updateServiceServers(next)
        } else {
          next(new ResilientError(1004, err))
        }
      })
    }
  }

  function discoveryOptions () {
    return resilient.options('discovery')
  }

  function refreshDiscoveryServers (data, options) {
    resilient.emit('discovery:refresh', data, resilient)
    options.servers(data)
  }

  function updateServiceServers (next) {
    DiscoveryResolver.update(resilient, null, next)
  }

  function hasDiscoveryServersOutdated () {
    var outdated = false
    var options = discoveryOptions()
    var servers = options.get('servers')

    if (canUpdateDiscoveryServers(options)) {
      if (servers && servers.exists()) {
        if (options.get('forceRefreshOnStart')) {
          outdated = servers.updated === 0
        }
        if (!outdated) {
          outdated = servers.lastUpdate() > options.get('refreshServersInterval')
        }
      } else {
        outdated = true
      }
    }

    return outdated
  }

  function hasDiscoveryServers () {
    return resilient.hasDiscoveryServers()
  }

  function hasValidServiceServers () {
    var servers = resilient.servers()
    return servers && servers.exists() && serversAreUpdated(servers) || false
  }

  function serversAreUpdated (servers) {
    var interval = discoveryOptions().get('refreshInterval')
    if (hasDiscoveryServers()) {
      return servers.lastUpdate() < interval
    }
    return true
  }

  function resolver (err, res) {
    err ? cb(err) : handleResolution(res)
  }

  function handleResolution (res) {
    var servers = resilient.servers()
    var requester = Requester(resilient)

    if (res && res._cache) {
      servers = new Servers(res.data)
    } else if (!hasValidServiceServers()) {
      return cb(new ResilientError(1003))
    }

    middleware.run('service', 'out')(servers, options, function (err) {
      if (err) {
        cb(new ResilientError(1007, err))
      } else {
        requester(servers, options, cb)(null)
      }
    })
  }

  function wrapHandler (cb) {
    return function (err, res) {
      middleware.run('service', 'in')(err, res, function (mErr) {
        if (err || mErr) {
          cb(err || new ResilientError(1007, mErr))
        } else {
          cb(null, res)
        }
      })
    }
  }
}

function canUpdateDiscoveryServers (options) {
  var refreshServers = options.get('refreshServers')
  return options.get('enableRefreshServers') &&
    (options.get('enableSelfRefresh') ||
    (refreshServers && refreshServers.exists()))
}

function getRefreshServers (options) {
  var type = options.get('enableSelfRefresh')
    ? 'servers'
    : 'refreshServers'
  return options.get(type)
}

function getRefreshOptions (options) {
  var defaultOptions = _.omit(options.get(), ['servers', 'refreshOptions'])
  var refreshOptions = _.merge(defaultOptions, options.get('refreshOptions'), { discoverBeforeRetry: false })
  var basePath = getRefreshBasePath(options.get())
  if (basePath) refreshOptions.basePath = basePath
  return refreshOptions
}

function getRefreshBasePath (options) {
  return options && (options.refreshPath ||
    (_.isObj(options.refreshOptions) &&
    options.refreshOptions.basePath)) ||
    false
}

},{"./discovery":4,"./error":5,"./requester":11,"./resolvers/discovery":14,"./servers":18,"./utils":20}],14:[function(require,module,exports){
var ResilientError = require('../error')
var Requester = require('../requester')
var ServersDiscovery = require('../discovery')
var ServiceResolve = require('./service')

module.exports = DiscoveryResolver

Requester.DiscoveryResolver = DiscoveryResolver

function DiscoveryResolver (resilient, options, servers) {
  var sync = resilient._sync

  function resolver (resolve) {
    return function (err, res) {
      sync.unlock('updating')
      sync.dequeue('updating').forEach(function (cb) { cb(err, res) })
      resolve(err, res)
    }
  }

  function updateServers (cb) {
    sync.lock('updating')
    ServersDiscovery(resilient, options, servers)(resolver(cb))
  }

  return function resolve (cb) {
    if (sync.locked('updating')) {
      sync.enqueue('updating', cb)
    } else {
      updateServers(cb)
    }
  }
}

DiscoveryResolver.update = function (resilient, options, cb) {
  DiscoveryResolver(resilient, options)(ServiceResolve(resilient)(cb))
}

DiscoveryResolver.fetch = function (resilient, options, cb) {
  DiscoveryResolver(resilient, options)(fetchHandler(cb))
}

function fetchHandler (cb) {
  return function (err, res) {
    if (err) {
      cb(err)
    } else if (res && res.data) {
      cb(null, res.data)
    } else {
      cb(new ResilientError(1001, res))
    }
  }
}

},{"../discovery":4,"../error":5,"../requester":11,"./service":15}],15:[function(require,module,exports){
var _ = require('../utils')
var ResilientError = require('../error')

module.exports = ServiceResolve

function ServiceResolve (resilient) {
  var middleware = resilient._middleware
  var options = resilient.options('discovery')

  function isCacheEnabled () {
    return options.get('cacheEnabled')
  }

  function getCache () {
    return resilient.cache.get('servers')
  }

  function emit (name, data) {
    resilient.emit('servers:' + name, data, resilient)
  }

  function saveServers (res, next) {
    var data = res.data
    emit('refresh', data)
    resilient.setServers(data)
    refreshCache(data)
    next(null, res)
  }

  function errorHandler (err, next) {
    if (isCacheEnabled()) {
      resolveFromCache(err, next)
    } else {
      resolveWithError(err, next)
    }
  }

  function resolveFromCache (err, next) {
    var cache = getCache()
    if (hasValidCache(cache)) {
      next(null, { status: 200, _cache: true, data: cache.data })
    } else {
      resolveWithError(err, next)
    }
  }

  function hasValidCache (cache) {
    var expires = options.get('cacheExpiration')
    return cache && _.isArr(cache.data) && (_.now() - cache.time) > expires || false
  }

  function refreshCache (data) {
    if (isCacheEnabled()) {
      emit('cache', data)
      resilient.cache.set('servers', data)
    }
  }

  function handleResponse (err, res, done) {
    if (err) {
      errorHandler(err, done)
    } else if (isValidResponse(res)) {
      saveServers(res, done)
    } else {
      done(new ResilientError(1004, res))
    }
  }

  return function defineServers (done) {
    return function handler (err, res) {
      middleware.run('discovery', 'in')(err, res, function (mErr) {
        handleResponse(err || mErr, res, done)
      })
    }
  }
}

function isValidResponse (res) {
  var valid = false
  if (res) {
    if (_.isArr(res.data) && res.data.length) {
      valid = true
    } else if (typeof res.data === 'string') {
      valid = parseAsJSON(res)
    }
  }
  return valid
}

function parseAsJSON (res) {
  try {
    res.data = JSON.parse(res.data)
    return true
  } catch (e) {
    return false
  }
}

function resolveWithError (err, next) {
  var error = new ResilientError(err.status, err || { status: 1000 })
  return next(error)
}

},{"../error":5,"../utils":20}],16:[function(require,module,exports){
module.exports = roundRobinSerie

function roundRobinSerie (arr, size) {
  var max = +size < 2 ? 2 : size
  var rounds = roundRobin(max, arr).shift()
  return [].concat.apply([], rounds)
}

function roundRobin (n, ps) {
  var k
  var j
  var i
  var rs = [] // rs = round array

  if (!ps) {
    ps = []
    for (k = 1; k <= n; k += 1) ps.push(k)
  } else {
    ps = ps.slice()
  }
  if (n % 2 === 1) {
    ps.push(-1) // so we can match algorithm for even numbers
    n += 1
  }
  for (j = 0; j < n - 1; j += 1) {
    rs[j] = [] // create inner match array for round j
    for (i = 0; i < n / 2; i += 1) {
      if (ps[i] !== -1 && ps[n - 1 - i] !== -1) {
        rs[j].push([ps[i], ps[n - 1 - i]]) // insert pair as a match
      }
    }
    ps.splice(1, 0, ps.pop()) // permutate for next round
  }
  return rs
}

},{}],17:[function(require,module,exports){
require('console.table')
var balancerOptions = require('./defaults').balancer

module.exports = Server

function Server (url, index) {
  this.url = url
  this.index = index + 1
  this.resetStats()
}

Server.prototype.report = function (operation, latency, type) {
  var stats = this.stats(operation)
  if (stats) {
    stats[type || 'request'] += 1
    stats.latency = calculateAvgLatency(latency || 0, stats, this.url)
  }
}

Server.prototype.reportError = function (operation, latency) {
  this.report(operation, latency, 'error')
}

Server.prototype.balance = function (operation, options) {
  var stats = this.stats(operation)
  var weight = balancerOptions.weight
  var total = stats.request + stats.error

  return total ? calculateStatsBalance(stats, weight, total, this.index) : 0
}

Server.prototype.stats = function (operation, field) {
  var stats = this.statsStore[operation || 'read']
  if (stats && field) stats = stats[field]
  return stats
}

Server.prototype.resetStats = function () {
  this.statsStore = createServerStats()
}

function createServerStats () {
  return {
    read: createStats(),
    write: createStats()
  }
}

function createStats () {
  return {
    latency: 0,
    error: 0,
    request: 0
  }
}

function calculateStatsBalance (stats, weight, total, index) {
  var success = (stats.request / total) * weight.success
  var error = (stats.error / total) * weight.error
  var latency = (stats.latency * weight.latency)

  return (success + error + latency + index + total).toFixed(2)
}

function calculateAvgLatency (latency, stats) {
  return (latency + stats.latency) / (stats.request + stats.error)
}

},{"./defaults":3,"console.table":25}],18:[function(require,module,exports){
var _ = require('./utils')
var Server = require('./server')
var RoundRobin = require('./roundrobin')

module.exports = Servers

function Servers (servers) {
  this.servers = []
  this.updated = 0
  this.set(servers)
}

Servers.prototype.get = function () {
  return this.servers.slice(0)
}

Servers.prototype.set = function (servers) {
  if (_.isArr(servers)) {
    this.updated = _.now()
    this.servers = mapServers.call(this, servers)
  }
}

Servers.prototype.lastUpdate = function () {
  return _.now() - this.updated
}

Servers.prototype.empty = function () {
  return this.servers.length === 0
}

Servers.prototype.exists = function () {
  return this.size() > 0
}

Servers.prototype.size = function () {
  return this.servers.length
}

Servers.prototype.urls = function () {
  return this.servers.map(function (server) {
    return server.url
  })
}

Servers.prototype.resetStats = function () {
  this.servers.forEach(function (server) {
    server.resetStats()
  })
}

Servers.prototype.sort = function (operation, options) {
  var servers = this.servers.slice(0)
  if (servers.length) {
    if (!options.get('disableWeight')) {
      servers.sort(function (x, y) {
        return x.balance(operation, options) - y.balance(operation, options)
      })
    }
    if (typeof options.get('balanceStrategy') === 'function') {
      servers = options.get('balanceStrategy')(servers)
    } else if (options.get('random')) {
      servers = shuffle(servers)
    } else if (options.get('roundRobin')) {
      servers = roundRobinSort(servers, options)
    }
  }

  var sr = servers.map(function (item) {
    return item.balance(operation, null, true) + ' | ' + item.url
  })

  console.log(sr)
  return servers
}

Servers.prototype.find = function (url) {
  var server = null
  for (var i = 0, l = this.servers.length; i < l; i += 1) {
    if (this.servers[i].url === url) {
      server = this.servers[i]
      break
    }
  }
  return server
}

function isValidURI (uri) {
  if (_.isObj(uri)) uri = uri.url || uri.uri
  return _.isURI(uri)
}

function mapServers (servers) {
  return servers
    .filter(isValidURI)
    .map(_.bind(this, mapServer))
}

function mapServer (data, index) {
  var server
  if (data instanceof Server) {
    server = data
  } else {
    server = this.find(_.isObj(data) ? data.url : data)
    if (!server) server = new Server(data, index)
  }
  return server
}

function shuffle (arr) {
  var array = arr.slice(0)
  for (var i = array.length - 1; i > 0; i -= 1) {
    var j = Math.random() * (i + 1) | 0
    var temp = array[i]
    array[i] = array[j]
    array[j] = temp
  }
  return array
}

function roundRobinSort (servers, options) {
  var size = 0
  if (options && options.get('roundRobin')) {
    var configSize = +options.get('roundRobinSize')
    size = configSize > servers.length ? servers.length : configSize
    if (size > 1) {
      return RoundRobin(servers, size)
    }
  }
  return servers
}

},{"./roundrobin":16,"./server":17,"./utils":20}],19:[function(require,module,exports){
var isArr = require('./utils').isArr

module.exports = Sync

function Sync () {
  this.locks = {}
  this.queues = {}
}

Sync.prototype.locked = function (state) {
  return getSync(this.locks, state)
}

Sync.prototype.lock = function (state) {
  this.locks[state] = true
  return true
}

Sync.prototype.unlock = function (state) {
  this.locks[state] = false
  return false
}

Sync.prototype.enqueue = function (state, task) {
  if (getSync(this.locks, state)) {
    this.push(state, task)
  }
}

Sync.prototype.dequeue = function (state) {
  return (this.queues[state] || []).splice(0)
}

Sync.prototype.push = function (state, task) {
  var queue = this.queues[state]
  if (isArr(queue) === false) {
    queue = this.queues[state] = []
  }
  queue.push(task)
}

function getSync (locks, state) {
  var lock = locks[state]
  if (lock === undefined) {
    lock = locks[state] = false
  }
  return lock
}

},{"./utils":20}],20:[function(require,module,exports){
var _ = exports
var toStr = Object.prototype.toString
var slice = Array.prototype.slice
var hasOwn = Object.prototype.hasOwnProperty
var bind = Function.prototype.bind
var isArrayNative = Array.isArray
var uriRegex = /^http[s]?\:\/\/(.+)/i

exports.noop = function () {}

exports.now = function () {
  return new Date().getTime()
}

exports.timer = function () {
  var startTime = _.now()
  return function getTime () {
    return _.now() - startTime
  }
}

exports.emptyObject = function () {
  return Object.create(null)
}

exports.isObj = function (o) {
  return o && toStr.call(o) === '[object Object]' || false
}

exports.isArr = function (o) {
  return o && isArrayNative
    ? isArrayNative(o)
    : toStr.call(o) === '[object Array]'
}

exports.isFn = function (o) {
  return typeof o === 'function'
}

exports.bind = function (ctx, fn) {
  return bind ? fn.bind(ctx) : function () {
    return fn.apply(ctx, arguments)
  }
}

exports.each = function (obj, fn) {
  var i = null
  var l = 0
  if (_.isArr(obj)) {
    for (i = 0, l = obj.length; i < l; i += 1) fn(obj[i], i)
  } else if (_.isObj(obj)) {
    for (i in obj) if (hasOwn.call(obj, i)) fn(i, obj[i])
  }
}

exports.clone = function (obj) {
  return _.extend({}, obj)
}

exports.omit = function (obj, keys) {
  var key = null
  var buf = {}
  if (_.isObj(obj)) {
    for (key in obj) if (hasOwn.call(obj, key)) {
      if (keys.indexOf(key) === -1) buf[key] = obj[key]
    }
  }
  return buf
}

exports.delay = function (fn, ms) {
  return setTimeout(fn, ms || 1)
}

exports.isURI = function (str) {
  return typeof str === 'string' && uriRegex.test(str)
}

exports.join = function (base) {
  return (base || '') +
  (_.toArr(arguments, 1)
    .filter(notEmpty)
    .join(''))
}

function notEmpty (str) {
  return typeof str === 'string' && str.length > 0
}

exports.toArr = function (args, index) {
  return slice.call(args, +index || 0)
}

exports.extend = objIterator(extender)

exports.merge = objIterator(merger)

function extender (target, key, value) {
  target[key] = value
}

function objIterator (iterator) {
  return function (target) {
    var args = _.toArr(arguments, 1)
    _.each(args, eachArgument(target, iterator))
    return target
  }
}

function eachArgument (target, iterator) {
  return function (obj) {
    if (_.isObj(obj)) {
      _.each(obj, function (key, value) {
        iterator(target, key, value)
      })
    }
  }
}

function merger (target, key, value) {
  if (_.isObj(value) && _.isObj(target[key])) {
    _.merge(target[key], value)
  } else {
    extender(target, key, value)
  }
}

},{}],21:[function(require,module,exports){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS)
			return 62 // '+'
		if (code === SLASH)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

},{}],22:[function(require,module,exports){

},{}],23:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('is-array')

exports.Buffer = Buffer
exports.SlowBuffer = Buffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192 // not used by this implementation

var kMaxLength = 0x3fffffff

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Note:
 *
 * - Implementation must support adding new properties to `Uint8Array` instances.
 *   Firefox 4-29 lacked support, fixed in Firefox 30+.
 *   See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *  - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *  - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *    incorrect length in some situations.
 *
 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they will
 * get the Object implementation, which is slower but will work correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = (function () {
  try {
    var buf = new ArrayBuffer(0)
    var arr = new Uint8Array(buf)
    arr.foo = function () { return 42 }
    return 42 === arr.foo() && // typed array instances can be augmented
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        new Uint8Array(1).subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
})()

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (subject, encoding, noZero) {
  if (!(this instanceof Buffer))
    return new Buffer(subject, encoding, noZero)

  var type = typeof subject

  // Find the length
  var length
  if (type === 'number')
    length = subject > 0 ? subject >>> 0 : 0
  else if (type === 'string') {
    if (encoding === 'base64')
      subject = base64clean(subject)
    length = Buffer.byteLength(subject, encoding)
  } else if (type === 'object' && subject !== null) { // assume object is array-like
    if (subject.type === 'Buffer' && isArray(subject.data))
      subject = subject.data
    length = +subject.length > 0 ? Math.floor(+subject.length) : 0
  } else
    throw new TypeError('must start with number, buffer, array or string')

  if (this.length > kMaxLength)
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
      'size: 0x' + kMaxLength.toString(16) + ' bytes')

  var buf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Preferred: Return an augmented `Uint8Array` instance for best performance
    buf = Buffer._augment(new Uint8Array(length))
  } else {
    // Fallback: Return THIS instance of Buffer (created by `new`)
    buf = this
    buf.length = length
    buf._isBuffer = true
  }

  var i
  if (Buffer.TYPED_ARRAY_SUPPORT && typeof subject.byteLength === 'number') {
    // Speed optimization -- use set if we're copying from a typed array
    buf._set(subject)
  } else if (isArrayish(subject)) {
    // Treat array-ish objects as a byte array
    if (Buffer.isBuffer(subject)) {
      for (i = 0; i < length; i++)
        buf[i] = subject.readUInt8(i)
    } else {
      for (i = 0; i < length; i++)
        buf[i] = ((subject[i] % 256) + 256) % 256
    }
  } else if (type === 'string') {
    buf.write(subject, 0, encoding)
  } else if (type === 'number' && !Buffer.TYPED_ARRAY_SUPPORT && !noZero) {
    for (i = 0; i < length; i++) {
      buf[i] = 0
    }
  }

  return buf
}

Buffer.isBuffer = function (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b))
    throw new TypeError('Arguments must be Buffers')

  var x = a.length
  var y = b.length
  for (var i = 0, len = Math.min(x, y); i < len && a[i] === b[i]; i++) {}
  if (i !== len) {
    x = a[i]
    y = b[i]
  }
  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function (list, totalLength) {
  if (!isArray(list)) throw new TypeError('Usage: Buffer.concat(list[, length])')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (totalLength === undefined) {
    totalLength = 0
    for (i = 0; i < list.length; i++) {
      totalLength += list[i].length
    }
  }

  var buf = new Buffer(totalLength)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

Buffer.byteLength = function (str, encoding) {
  var ret
  str = str + ''
  switch (encoding || 'utf8') {
    case 'ascii':
    case 'binary':
    case 'raw':
      ret = str.length
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = str.length * 2
      break
    case 'hex':
      ret = str.length >>> 1
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8ToBytes(str).length
      break
    case 'base64':
      ret = base64ToBytes(str).length
      break
    default:
      ret = str.length
  }
  return ret
}

// pre-set for values that may exist in the future
Buffer.prototype.length = undefined
Buffer.prototype.parent = undefined

// toString(encoding, start=0, end=buffer.length)
Buffer.prototype.toString = function (encoding, start, end) {
  var loweredCase = false

  start = start >>> 0
  end = end === undefined || end === Infinity ? this.length : end >>> 0

  if (!encoding) encoding = 'utf8'
  if (start < 0) start = 0
  if (end > this.length) end = this.length
  if (end <= start) return ''

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'binary':
        return binarySlice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase)
          throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.equals = function (b) {
  if(!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max)
      str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  return Buffer.compare(this, b)
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new Error('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(byte)) throw new Error('Invalid hex string')
    buf[offset + i] = byte
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  var charsWritten = blitBuffer(utf8ToBytes(string), buf, offset, length)
  return charsWritten
}

function asciiWrite (buf, string, offset, length) {
  var charsWritten = blitBuffer(asciiToBytes(string), buf, offset, length)
  return charsWritten
}

function binaryWrite (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  var charsWritten = blitBuffer(base64ToBytes(string), buf, offset, length)
  return charsWritten
}

function utf16leWrite (buf, string, offset, length) {
  var charsWritten = blitBuffer(utf16leToBytes(string), buf, offset, length, 2)
  return charsWritten
}

Buffer.prototype.write = function (string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length
      length = undefined
    }
  } else {  // legacy
    var swap = encoding
    encoding = offset
    offset = length
    length = swap
  }

  offset = Number(offset) || 0
  var remaining = this.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase()

  var ret
  switch (encoding) {
    case 'hex':
      ret = hexWrite(this, string, offset, length)
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8Write(this, string, offset, length)
      break
    case 'ascii':
      ret = asciiWrite(this, string, offset, length)
      break
    case 'binary':
      ret = binaryWrite(this, string, offset, length)
      break
    case 'base64':
      ret = base64Write(this, string, offset, length)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = utf16leWrite(this, string, offset, length)
      break
    default:
      throw new TypeError('Unknown encoding: ' + encoding)
  }
  return ret
}

Buffer.prototype.toJSON = function () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function binarySlice (buf, start, end) {
  return asciiSlice(buf, start, end)
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len;
    if (start < 0)
      start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0)
      end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start)
    end = start

  if (Buffer.TYPED_ARRAY_SUPPORT) {
    return Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    var newBuf = new Buffer(sliceLen, undefined, true)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
    return newBuf
  }
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0)
    throw new RangeError('offset is not uint')
  if (offset + ext > length)
    throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUInt8 = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
      ((this[offset + 1] << 16) |
      (this[offset + 2] << 8) |
      this[offset + 3])
}

Buffer.prototype.readInt8 = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80))
    return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)

  return (this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16) |
      (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
      (this[offset + 1] << 16) |
      (this[offset + 2] << 8) |
      (this[offset + 3])
}

Buffer.prototype.readFloatLE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('buffer must be a Buffer instance')
  if (value > max || value < min) throw new TypeError('value is out of bounds')
  if (offset + ext > buf.length) throw new TypeError('index out of range')
}

Buffer.prototype.writeUInt8 = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = value
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; i++) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
  } else objectWriteUInt16(this, value, offset, true)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = value
  } else objectWriteUInt16(this, value, offset, false)
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; i++) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = value
  } else objectWriteUInt32(this, value, offset, true)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = value
  } else objectWriteUInt32(this, value, offset, false)
  return offset + 4
}

Buffer.prototype.writeInt8 = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = value
  return offset + 1
}

Buffer.prototype.writeInt16LE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
  } else objectWriteUInt16(this, value, offset, true)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = value
  } else objectWriteUInt16(this, value, offset, false)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else objectWriteUInt32(this, value, offset, true)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = value
  } else objectWriteUInt32(this, value, offset, false)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (value > max || value < min) throw new TypeError('value is out of bounds')
  if (offset + ext > buf.length) throw new TypeError('index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert)
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert)
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function (target, target_start, start, end) {
  var source = this

  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (!target_start) target_start = 0

  // Copy 0 bytes; we're done
  if (end === start) return
  if (target.length === 0 || source.length === 0) return

  // Fatal error conditions
  if (end < start) throw new TypeError('sourceEnd < sourceStart')
  if (target_start < 0 || target_start >= target.length)
    throw new TypeError('targetStart out of bounds')
  if (start < 0 || start >= source.length) throw new TypeError('sourceStart out of bounds')
  if (end < 0 || end > source.length) throw new TypeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length)
    end = this.length
  if (target.length - target_start < end - start)
    end = target.length - target_start + start

  var len = end - start

  if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < len; i++) {
      target[i + target_start] = this[i + start]
    }
  } else {
    target._set(this.subarray(start, start + len), target_start)
  }
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (end < start) throw new TypeError('end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  if (start < 0 || start >= this.length) throw new TypeError('start out of bounds')
  if (end < 0 || end > this.length) throw new TypeError('end out of bounds')

  var i
  if (typeof value === 'number') {
    for (i = start; i < end; i++) {
      this[i] = value
    }
  } else {
    var bytes = utf8ToBytes(value.toString())
    var len = bytes.length
    for (i = start; i < end; i++) {
      this[i] = bytes[i % len]
    }
  }

  return this
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1) {
        buf[i] = this[i]
      }
      return buf.buffer
    }
  } else {
    throw new TypeError('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function (arr) {
  arr.constructor = Buffer
  arr._isBuffer = true

  // save reference to original Uint8Array get/set methods before overwriting
  arr._get = arr.get
  arr._set = arr.set

  // deprecated, will be removed in node 0.13+
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.equals = BP.equals
  arr.compare = BP.compare
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

var INVALID_BASE64_RE = /[^+\/0-9A-z]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function isArrayish (subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
      subject && typeof subject === 'object' &&
      typeof subject.length === 'number'
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    var b = str.charCodeAt(i)
    if (b <= 0x7F) {
      byteArray.push(b)
    } else {
      var start = i
      if (b >= 0xD800 && b <= 0xDFFF) i++
      var h = encodeURIComponent(str.slice(start, i+1)).substr(1).split('%')
      for (var j = 0; j < h.length; j++) {
        byteArray.push(parseInt(h[j], 16))
      }
    }
  }
  return byteArray
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(str)
}

function blitBuffer (src, dst, offset, length, unitSize) {
  if (unitSize) length -= length % unitSize;
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length))
      break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

},{"base64-js":21,"ieee754":28,"is-array":29}],24:[function(require,module,exports){
(function (Buffer){
var clone = (function() {
'use strict';

/**
 * Clones (copies) an Object using deep copying.
 *
 * This function supports circular references by default, but if you are certain
 * there are no circular references in your object, you can save some CPU time
 * by calling clone(obj, false).
 *
 * Caution: if `circular` is false and `parent` contains circular references,
 * your program may enter an infinite loop and crash.
 *
 * @param `parent` - the object to be cloned
 * @param `circular` - set to true if the object to be cloned may contain
 *    circular references. (optional - true by default)
 * @param `depth` - set to a number if the object is only to be cloned to
 *    a particular depth. (optional - defaults to Infinity)
 * @param `prototype` - sets the prototype to be used when cloning an object.
 *    (optional - defaults to parent prototype).
*/
function clone(parent, circular, depth, prototype) {
  var filter;
  if (typeof circular === 'object') {
    depth = circular.depth;
    prototype = circular.prototype;
    filter = circular.filter;
    circular = circular.circular
  }
  // maintain two arrays for circular references, where corresponding parents
  // and children have the same index
  var allParents = [];
  var allChildren = [];

  var useBuffer = typeof Buffer != 'undefined';

  if (typeof circular == 'undefined')
    circular = true;

  if (typeof depth == 'undefined')
    depth = Infinity;

  // recurse this function so we don't reset allParents and allChildren
  function _clone(parent, depth) {
    // cloning null always returns null
    if (parent === null)
      return null;

    if (depth == 0)
      return parent;

    var child;
    var proto;
    if (typeof parent != 'object') {
      return parent;
    }

    if (clone.__isArray(parent)) {
      child = [];
    } else if (clone.__isRegExp(parent)) {
      child = new RegExp(parent.source, __getRegExpFlags(parent));
      if (parent.lastIndex) child.lastIndex = parent.lastIndex;
    } else if (clone.__isDate(parent)) {
      child = new Date(parent.getTime());
    } else if (useBuffer && Buffer.isBuffer(parent)) {
      child = new Buffer(parent.length);
      parent.copy(child);
      return child;
    } else {
      if (typeof prototype == 'undefined') {
        proto = Object.getPrototypeOf(parent);
        child = Object.create(proto);
      }
      else {
        child = Object.create(prototype);
        proto = prototype;
      }
    }

    if (circular) {
      var index = allParents.indexOf(parent);

      if (index != -1) {
        return allChildren[index];
      }
      allParents.push(parent);
      allChildren.push(child);
    }

    for (var i in parent) {
      var attrs;
      if (proto) {
        attrs = Object.getOwnPropertyDescriptor(proto, i);
      }

      if (attrs && attrs.set == null) {
        continue;
      }
      child[i] = _clone(parent[i], depth - 1);
    }

    return child;
  }

  return _clone(parent, depth);
}

/**
 * Simple flat clone using prototype, accepts only objects, usefull for property
 * override on FLAT configuration object (no nested props).
 *
 * USE WITH CAUTION! This may not behave as you wish if you do not know how this
 * works.
 */
clone.clonePrototype = function clonePrototype(parent) {
  if (parent === null)
    return null;

  var c = function () {};
  c.prototype = parent;
  return new c();
};

// private utility functions

function __objToStr(o) {
  return Object.prototype.toString.call(o);
};
clone.__objToStr = __objToStr;

function __isDate(o) {
  return typeof o === 'object' && __objToStr(o) === '[object Date]';
};
clone.__isDate = __isDate;

function __isArray(o) {
  return typeof o === 'object' && __objToStr(o) === '[object Array]';
};
clone.__isArray = __isArray;

function __isRegExp(o) {
  return typeof o === 'object' && __objToStr(o) === '[object RegExp]';
};
clone.__isRegExp = __isRegExp;

function __getRegExpFlags(re) {
  var flags = '';
  if (re.global) flags += 'g';
  if (re.ignoreCase) flags += 'i';
  if (re.multiline) flags += 'm';
  return flags;
};
clone.__getRegExpFlags = __getRegExpFlags;

return clone;
})();

if (typeof module === 'object' && module.exports) {
  module.exports = clone;
}

}).call(this,require("buffer").Buffer)
},{"buffer":23}],25:[function(require,module,exports){
(function () {
  'use strict';

  function setupConsoleTable() {
    if (typeof console === 'undefined') {
      throw new Error('Weird, console object is undefined');
    }
    if (typeof console.table === 'function') {
      // if it is not OUR function, overwrite it
      if (console.table === consoleTable) {
        return;
      }
    }

    function isType(t, x) {
      return typeof x === t;
    }

    var isString = isType.bind(null, 'string');

    function isArrayOf(isTypeFn, a) {
      return Array.isArray(a) &&
        a.every(isTypeFn);
    }

    var isArrayOfStrings = isArrayOf.bind(null, isString);
    var isArrayOfArrays = isArrayOf.bind(null, Array.isArray);

    var Table = require('easy-table');

    function arrayToString(arr) {
      var t = new Table();
      arr.forEach(function (record) {
        if (typeof record === 'string' ||
          typeof record === 'number') {
          t.cell('item', record);
        } else {
          // assume plain object
          Object.keys(record).forEach(function (property) {
            t.cell(property, record[property]);
          });
        }
        t.newRow();
      });
      return t.toString();
    }

    function printTableWithColumnTitles(titles, items) {
      var t = new Table();
      items.forEach(function (item) {
        item.forEach(function (value, k) {
          t.cell(titles[k], value);
        });
        t.newRow();
      });
      var str = t.toString();
      console.log(str);
    }

    function printTitleTable(title, arr) {
      var str = arrayToString(arr);
      var rowLength = str.indexOf('\n');
      if (rowLength > 0) {
        if (title.length > rowLength) {
          rowLength = title.length;
        }
        console.log(title);
        var sep = '-', k, line = '';
        for (k = 0; k < rowLength; k += 1) {
          line += sep;
        }
        console.log(line);
      }
      console.log(str);
    }

    function objectToArray(obj) {
      var keys = Object.keys(obj);
      return keys.map(function (key) {
        return {
          key: key,
          value: obj[key]
        };
      });
    }

    function objectToString(obj) {
      return arrayToString(objectToArray(obj));
    }

    function consoleTable () {
      var args = Array.prototype.slice.call(arguments);

      if (args.length === 2 &&
        typeof args[0] === 'string' &&
        Array.isArray(args[1])) {

        return printTitleTable(args[0], args[1]);
      }

      if (args.length === 2 &&
        isArrayOfStrings(args[0]) &&
        isArrayOfArrays(args[1])) {
        return printTableWithColumnTitles(args[0], args[1]);
      }

      args.forEach(function (k) {
        if (typeof k === 'string') {
          return console.log(k);
        } else if (Array.isArray(k)) {
          console.log(arrayToString(k));
        } else if (typeof k === 'object') {
          console.log(objectToString(k));
        }
      });
    }
    console.table = consoleTable;
  }

  setupConsoleTable();
}());

},{"easy-table":27}],26:[function(require,module,exports){
var clone = require('clone');

module.exports = function(options, defaults) {
  options = options || {};

  Object.keys(defaults).forEach(function(key) {
    if (typeof options[key] === 'undefined') {
      options[key] = clone(defaults[key]);
    }
  });

  return options;
};
},{"clone":24}],27:[function(require,module,exports){
var wcwidth

try {
  wcwidth = require('wcwidth')
} catch(e) {}

module.exports = Table

function Table() {
  this.rows = []
  this.row = {__printers : {}}
}

/**
 * Push the current row to the table and start a new one
 *
 * @returns {Table} `this`
 */

Table.prototype.newRow = function() {
  this.rows.push(this.row)
  this.row = {__printers : {}}
  return this
}

/**
 * Write cell in the current row
 *
 * @param {String} col          - Column name
 * @param {Any} val             - Cell value
 * @param {Function} [printer]  - Printer function to format the value
 * @returns {Table} `this`
 */

Table.prototype.cell = function(col, val, printer) {
  this.row[col] = val
  this.row.__printers[col] = printer || string
  return this
}

/**
 * String to separate columns
 */

Table.prototype.separator = '  '

function string(val) {
  return val === undefined ? '' : ''+val
}

function length(str) {
  var s = str.replace(/\u001b\[\d+m/g, '')
  return wcwidth == null ? s.length : wcwidth(s)
}

/**
 * Default printer
 */

Table.string = string

/**
 * Create a printer which right aligns the content by padding with `ch` on the left
 *
 * @param {String} ch
 * @returns {Function}
 */

Table.leftPadder = leftPadder

function leftPadder(ch) {
  return function(val, width) {
    var str = string(val)
    var len = length(str)
    var pad = width > len ? Array(width - len + 1).join(ch) : ''
    return pad + str
  }
}

/**
 * Printer which right aligns the content
 */

var padLeft = Table.padLeft = leftPadder(' ')

/**
 * Create a printer which pads with `ch` on the right
 *
 * @param {String} ch
 * @returns {Function}
 */

Table.rightPadder = rightPadder

function rightPadder(ch) {
  return function padRight(val, width) {
    var str = string(val)
    var len = length(str)
    var pad = width > len ? Array(width - len + 1).join(ch) : ''
    return str + pad
  }
}

var padRight = rightPadder(' ')

/**
 * Create a printer for numbers
 *
 * Will do right alignment and optionally fix the number of digits after decimal point
 *
 * @param {Number} [digits] - Number of digits for fixpoint notation
 * @returns {Function}
 */

Table.number = function(digits) {
  return function(val, width) {
    if (val == null) return ''
    if (typeof val != 'number')
      throw new Error(''+val + ' is not a number')
    var str = digits == null ? val+'' : val.toFixed(digits)
    return padLeft(str, width)
  }
}

function each(row, fn) {
  for(var key in row) {
    if (key == '__printers') continue
    fn(key, row[key])
  }
}

/**
 * Get list of columns in printing order
 *
 * @returns {string[]}
 */

Table.prototype.columns = function() {
  var cols = {}
  for(var i = 0; i < 2; i++) { // do 2 times
    this.rows.forEach(function(row) {
      var idx = 0
      each(row, function(key) {
        idx = Math.max(idx, cols[key] || 0)
        cols[key] = idx
        idx++
      })
    })
  }
  return Object.keys(cols).sort(function(a, b) {
    return cols[a] - cols[b]
  })
}

/**
 * Format just rows, i.e. print the table without headers and totals
 *
 * @returns {String} String representaion of the table
 */

Table.prototype.print = function() {
  var cols = this.columns()
  var separator = this.separator
  var widths = {}
  var out = ''

  // Calc widths
  this.rows.forEach(function(row) {
    each(row, function(key, val) {
      var str = row.__printers[key].call(row, val)
      widths[key] = Math.max(length(str), widths[key] || 0)
    })
  })

  // Now print
  this.rows.forEach(function(row) {
    var line = ''
    cols.forEach(function(key) {
      var width = widths[key]
      var str = row.hasOwnProperty(key)
        ? ''+row.__printers[key].call(row, row[key], width)
        : ''
      line += padRight(str, width) + separator
    })
    line = line.slice(0, -separator.length)
    out += line + '\n'
  })

  return out
}

/**
 * Format the table
 *
 * @returns {String}
 */

Table.prototype.toString = function() {
  var cols = this.columns()
  var out = new Table()

  // copy options
  out.separator = this.separator

  // Write header
  cols.forEach(function(col) {
    out.cell(col, col)
  })
  out.newRow()
  out.pushDelimeter(cols)

  // Write body
  out.rows = out.rows.concat(this.rows)

  // Totals
  if (this.totals && this.rows.length) {
    out.pushDelimeter(cols)
    this.forEachTotal(out.cell.bind(out))
    out.newRow()
  }

  return out.print()
}

/**
 * Push delimeter row to the table (with each cell filled with dashs during printing)
 *
 * @param {String[]} [cols]
 * @returns {Table} `this`
 */

Table.prototype.pushDelimeter = function(cols) {
  cols = cols || this.columns()
  cols.forEach(function(col) {
    this.cell(col, undefined, leftPadder('-'))
  }, this)
  return this.newRow()
}

/**
 * Compute all totals and yield the results to `cb`
 *
 * @param {Function} cb - Callback function with signature `(column, value, printer)`
 */

Table.prototype.forEachTotal = function(cb) {
  for(var key in this.totals) {
    var aggr = this.totals[key]
    var acc = aggr.init
    var len = this.rows.length
    this.rows.forEach(function(row, idx) {
      acc = aggr.reduce.call(row, acc, row[key], idx, len)
    })
    cb(key, acc, aggr.printer)
  }
}

/**
 * Format the table so that each row represents column and each column represents row
 *
 * @param {Object} [opts]
 * @param {String} [ops.separator] - Column separation string
 * @param {Function} [opts.namePrinter] - Printer to format column names
 * @returns {String}
 */

Table.prototype.printTransposed = function(opts) {
  opts = opts || {}
  var out = new Table
  out.separator = opts.separator || this.separator
  this.columns().forEach(function(col) {
    out.cell(0, col, opts.namePrinter)
    this.rows.forEach(function(row, idx) {
      out.cell(idx+1, row[col], row.__printers[col])
    })
    out.newRow()
  }, this)
  return out.print()
}

/**
 * Sort the table
 *
 * @param {Function|string[]} [cmp] - Either compare function or a list of columns to sort on
 * @returns {Table} `this`
 */

Table.prototype.sort = function(cmp) {
  if (typeof cmp == 'function') {
    this.rows.sort(cmp)
    return this
  }

  var keys = Array.isArray(cmp) ? cmp : this.columns()

  var comparators = keys.map(function(key) {
    var order = 'asc'
    var m = /(.*)\|\s*(asc|des)\s*$/.exec(key)
    if (m) {
      key = m[1]
      order = m[2]
    }
    return function (a, b) {
      return order == 'asc'
        ? compare(a[key], b[key])
        : compare(b[key], a[key])
    }
  })

  return this.sort(function(a, b) {
    for (var i = 0; i < comparators.length; i++) {
      var order = comparators[i](a, b)
      if (order != 0) return order
    }
    return 0
  })
}

function compare(a, b) {
  if (a === b) return 0
  if (a === undefined) return 1
  if (b === undefined) return -1
  if (a === null) return 1
  if (b === null) return -1
  if (a > b) return 1
  if (a < b) return -1
  return compare(String(a), String(b))
}

/**
 * Add a total for the column
 *
 * @param {String} col - column name
 * @param {Object} [opts]
 * @param {Function} [opts.reduce = sum] - reduce(acc, val, idx, length) function to compute the total value
 * @param {Function} [opts.printer = padLeft] - Printer to format the total cell
 * @param {Any} [opts.init = 0] - Initial value for reduction
 * @returns {Table} `this`
 */

Table.prototype.total = function(col, opts) {
  opts = opts || {}
  this.totals = this.totals || {}
  this.totals[col] = {
    reduce: opts.reduce || Table.aggr.sum,
    printer: opts.printer || padLeft,
    init: opts.init == null ? 0 : opts.init
  }
  return this
}

/**
 * Predefined helpers for totals
 */

Table.aggr = {}

/**
 * Create a printer which formats the value with `printer`,
 * adds the `prefix` to it and right aligns the whole thing
 *
 * @param {String} prefix
 * @param {Function} printer
 * @returns {printer}
 */

Table.aggr.printer = function(prefix, printer) {
  printer = printer || string
  return function(val, width) {
    return padLeft(prefix + printer(val), width)
  }
}

/**
 * Sum reduction
 */

Table.aggr.sum = function(acc, val) {
  return acc + val
}

/**
 * Average reduction
 */

Table.aggr.avg = function(acc, val, idx, len) {
  acc = acc + val
  return idx + 1 == len ? acc/len : acc
}

/**
 * Print the array or object
 *
 * @param {Array|Object} obj - Object to print
 * @param {Function|Object} [format] - Format options
 * @param {Function} [cb] - Table post processing and formating
 * @returns {String}
 */

Table.print = function(obj, format, cb) {
  var opts = format || {}

  format = typeof format == 'function'
    ? format
    : function(obj, cell) {
      for(var key in obj) {
        if (!obj.hasOwnProperty(key)) continue
        var params = opts[key] || {}
        cell(params.name || key, obj[key], params.printer)
      }
    }

  var t = new Table
  var cell = t.cell.bind(t)

  if (Array.isArray(obj)) {
    cb = cb || function(t) { return t.toString() }
    obj.forEach(function(item) {
      format(item, cell)
      t.newRow()
    })
  } else {
    cb = cb || function(t) { return t.printTransposed({separator: ' : '}) }
    format(obj, cell)
    t.newRow()
  }

  return cb(t)
}

/**
 * Same as `Table.print()` but yields the result to `console.log()`
 */

Table.log = function(obj, format, cb) {
  console.log(Table.print(obj, format, cb))
}

/**
 * Same as `.toString()` but yields the result to `console.log()`
 */

Table.prototype.log = function() {
  console.log(this.toString())
}

},{"wcwidth":34}],28:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],29:[function(require,module,exports){

/**
 * isArray
 */

var isArray = Array.isArray;

/**
 * toString
 */

var str = Object.prototype.toString;

/**
 * Whether or not the given `val`
 * is an array.
 *
 * example:
 *
 *        isArray([]);
 *        // > true
 *        isArray(arguments);
 *        // > false
 *        isArray('');
 *        // > false
 *
 * @param {mixed} val
 * @return {bool}
 */

module.exports = isArray || function (val) {
  return !! val && '[object Array]' == str.call(val);
};

},{}],30:[function(require,module,exports){
/*! lil-event - v0.1 - MIT License - https://github.com/lil-js/event */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['exports'], factory)
  } else if (typeof exports === 'object') {
    factory(exports)
    if (typeof module === 'object' && module !== null) {
      module.exports = exports.Event
    }
  } else {
    factory((root.lil = root.lil || {}))
  }
}(this, function (exports) {
  'use strict'
  var VERSION = '0.1.3'
  var slice = Array.prototype.slice
  var hasOwn = Object.prototype.hasOwnProperty

  function Event() {}

  Event.prototype.constructor = Event

  Event.prototype.addListener = Event.prototype.on = function (event, fn, once) {
    if (typeof event !== 'string') throw new TypeError('First argument must be a string')
    if (typeof fn !== 'function') throw new TypeError('Second argument must be a function')
    if (!findListener.call(this, event, fn)) {
      getListeners.call(this, event).push({ fn: fn, once: once || false })
    }
    return this
  }

  Event.prototype.removeListener = Event.prototype.off = function (event, fn) {
    var index
    var listeners = getListeners.call(this, event)
    var listener = findListener.call(this, event, fn)
    if (listener) {
      index = listeners.indexOf(listener)
      if (index >= 0) listeners.splice(index, 1)
    }
    return this
  }

  Event.prototype.addOnceListener = Event.prototype.once = function (event, fn, once) {
    this.addListener(event, fn, true)
    return this
  }

  Event.prototype.emit = Event.prototype.fire = function (event) {
    var i, l, listener, args = slice.call(arguments).slice(1)
    var listeners = getListeners.call(this, event)
    if (event) {
      for (i = 0, l = listeners.length; i < l; i += 1) {
        listener = listeners[i]
        if (listener.once) listeners.splice(i, 1)
        listener.fn.apply(null, args)
      }
    }
    return this
  }

  Event.prototype.removeAllListeners = Event.prototype.offAll = function (event) {
    if (event && hasOwn.call(this._events, event)) {
      this._events[event].splice(0)
    }
    return this
  }

  function findListener(event, fn) {
    var i, l, listener, listeners = getListeners.call(this, event)
    for (i = 0, l = listeners.length; i < l; i += 1) {
      listener = listeners[i]
      if (listener.fn === fn) return listener
    }
  }

  function getListeners(event, fn) {
    var events = getEvents.call(this)
    return hasOwn.call(events, event) ? events[event] : (events[event] = [])
  }

  function getEvents() {
    return this._events || (this._events = {})
  }

  Event.VERSION = VERSION
  exports.Event = Event
}))
},{}],23:[function(require,module,exports){
/*! lil-http - v0.1.17 - MIT License - https://github.com/lil-js/http */
;(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['exports'], factory)
  } else if (typeof exports === 'object') {
    factory(exports)
    if (typeof module === 'object' && module !== null) {
      module.exports = exports = exports.http
    }
  } else {
    factory((root.lil = root.lil || {}))
  }
}(this, function (exports) {
  'use strict'

  var VERSION = '0.1.17'
  var toStr = Object.prototype.toString
  var slicer = Array.prototype.slice
  var hasOwn = Object.prototype.hasOwnProperty
  var hasBind = typeof Function.prototype.bind === 'function'
  var origin = location.origin
  var originRegex = /^(http[s]?:\/\/[a-z0-9\-\.\:]+)[\/]?/i
  var jsonMimeRegex = /application\/json/
  var hasDomainRequest = typeof XDomainRequest !== 'undefined'
  var noop = function () {}

  var defaults = {
    method: 'GET',
    timeout: 30 * 1000,
    auth: null,
    data: null,
    headers: null,
    withCredentials: false,
    responseType: 'text'
  }

  function isObj (o) {
    return o && toStr.call(o) === '[object Object]' || false
  }

  function assign (target) {
    var i, l, x, cur, args = slicer.call(arguments).slice(1)
    for (i = 0, l = args.length; i < l; i += 1) {
      cur = args[i]
      for (x in cur) if (hasOwn.call(cur, x)) target[x] = cur[x]
    }
    return target
  }

  function once (fn) {
    var called = false
    return function () {
      if (called === false) {
        called = true
        fn.apply(null, arguments)
      }
    }
  }

  function setHeaders (xhr, headers) {
    if (!isObj(headers)) return

    // Set default content type
    headers['Content-Type'] = headers['Content-Type'] ||
      headers['content-type'] ||
      http.defaultContent

    var buf = Object.keys(headers).reduce(function (buf, field) {
      var lowerField = field.toLowerCase()

      // Remove duplicated headers
      if (lowerField !== field) {
        if (hasOwn.call(headers, lowerField)) {
          delete headers[lowerField]
          delete buf[lowerField]
        }
      }

      buf[field] = headers[field]
      return buf
    }, {})

    Object.keys(buf).forEach(function (field) {
      xhr.setRequestHeader(field, buf[field])
    })
  }

  function getHeaders (xhr) {
    var headers = {}, rawHeaders = xhr.getAllResponseHeaders().trim().split('\n')
    rawHeaders.forEach(function (header) {
      var split = header.trim().split(':')
      var key = split.shift().trim()
      var value = split.join(':').trim()
      headers[key] = value
    })
    return headers
  }

  function isJSONResponse (xhr) {
    return jsonMimeRegex.test(xhr.getResponseHeader('Content-Type'))
  }

  function encodeParams (params) {
    return Object.getOwnPropertyNames(params).filter(function (name) {
      return params[name] !== undefined
    }).map(function (name) {
      var value = (params[name] === null) ? '' : params[name]
      return encodeURIComponent(name) + (value ? '=' + encodeURIComponent(value) : '')
    }).join('&').replace(/%20/g, '+')
  }

  function parseData (xhr) {
    var data = null
    if (xhr.responseType === 'text') {
      data = xhr.responseText
      if (isJSONResponse(xhr) && data) data = JSON.parse(data)
    } else {
      data = xhr.response
    }
    return data
  }

  function getStatus (status) {
    return status === 1223 ? 204 : status // IE9 fix
  }

  function buildResponse (xhr) {
    var response = {
      xhr: xhr,
      status: getStatus(xhr.status),
      statusText: xhr.statusText,
      data: null,
      headers: {}
    }
    if (xhr.readyState === 4) {
      response.data = parseData(xhr)
      response.headers = getHeaders(xhr)
    }
    return response
  }

  function buildErrorResponse (xhr, error) {
    var response = buildResponse(xhr)
    response.error = error
    if (error.stack) response.stack = error.stack
    return response
  }

  function cleanReferences (xhr) {
    xhr.onreadystatechange = xhr.onerror = xhr.ontimeout = null
  }

  function isValidResponseStatus (xhr) {
    var status = getStatus(xhr.status)
    return status >= 200 && status < 300 || status === 304
  }

  function onError (xhr, cb) {
    return once(function (err) {
      cb(buildErrorResponse(xhr, err), null)
    })
  }

  function onLoad (config, xhr, cb) {
    return function (ev) {
      if (xhr.readyState === 4) {
        cleanReferences(xhr)
        if (isValidResponseStatus(xhr)) {
          cb(null, buildResponse(xhr))
        } else {
          onError(xhr, cb)(ev)
        }
      }
    }
  }

  function isCrossOrigin (url) {
    var match = url.match(originRegex)
    return match && match[1] === origin
  }

  function getURL (config) {
    var url = config.url
    if (isObj(config.params)) {
      url += (url.indexOf('?') === -1 ? '?' : '&') + encodeParams(config.params)
    }
    return url
  }

  function XHRFactory (url) {
    if (hasDomainRequest && isCrossOrigin(url)) {
      return new XDomainRequest()
    } else {
      return new XMLHttpRequest()
    }
  }

  function createClient (config) {
    var method = (config.method || 'GET').toUpperCase()
    var auth = config.auth
    var url = getURL(config)

    if (!url || typeof url !== 'string') {
      throw new TypeError('Missing required request URL')
    }

    var xhr = XHRFactory(url)
    if (auth) {
      xhr.open(method, url, true, auth.user, auth.password)
    } else {
      xhr.open(method, url)
    }
    xhr.withCredentials = config.withCredentials
    xhr.responseType = config.responseType
    xhr.timeout = config.timeout
    setHeaders(xhr, config.headers)
    return xhr
  }

  function updateProgress (xhr, cb) {
    return function (ev) {
      if (ev.lengthComputable) {
        cb(ev, ev.loaded / ev.total)
      } else {
        cb(ev)
      }
    }
  }

  function hasContentTypeHeader (config) {
    return config && isObj(config.headers)
    && (config.headers['content-type'] || config.headers['Content-Type'])
    || false
  }

  function buildPayload (xhr, config) {
    var data = config.data
    if (isObj(config.data) || Array.isArray(config.data)) {
      if (hasContentTypeHeader(config) === false) {
        xhr.setRequestHeader('Content-Type', 'application/json')
      }
      data = JSON.stringify(config.data)
    }
    return data
  }

  function timeoutResolver (cb, timeoutId) {
    return function () {
      clearTimeout(timeoutId)
      cb.apply(null, arguments)
    }
  }

  function request (config, cb, progress) {
    var xhr = createClient(config)
    var data = buildPayload(xhr, config)
    var errorHandler = onError(xhr, cb)

    if (hasBind) {
      xhr.ontimeout = errorHandler
    } else {
      var timeoutId = setTimeout(function abort () {
        if (xhr.readyState !== 4) {
          xhr.abort()
        }
      }, config.timeout)
      cb = timeoutResolver(cb, timeoutId)
      errorHandler = onError(xhr, cb)
    }

    xhr.onreadystatechange = onLoad(config, xhr, cb)
    xhr.onerror = errorHandler
    if (typeof progress === 'function') {
      xhr.onprogress = updateProgress(xhr, progress)
    }

    try {
      xhr.send(data || null)
    } catch (e) {
      errorHandler(e)
    }

    return { xhr: xhr, config: config }
  }

  function requestFactory (method) {
    return function (url, options, cb, progress) {
      var i, l, cur = null
      var config = assign({}, defaults, { method: method })
      var args = slicer.call(arguments)

      for (i = 0, l = args.length; i < l; i += 1) {
        cur = args[i]
        if (typeof cur === 'function') {
          if (args.length === (i + 1) && typeof args[i - 1] === 'function') {
            progress = cur
          } else {
            cb = cur
          }
        } else if (isObj(cur)) {
          assign(config, cur)
        } else if (typeof cur === 'string' && !config.url) {
          config.url = cur
        }
      }

      return request(config, cb || noop, progress)
    }
  }

  function http (config, data, cb, progress) {
    return requestFactory('GET').apply(null, arguments)
  }

  http.VERSION = VERSION
  http.defaults = defaults
  http.defaultContent = 'text/plain'
  http.get = requestFactory('GET')
  http.post = requestFactory('POST')
  http.put = requestFactory('PUT')
  http.patch = requestFactory('PATCH')
  http.head = requestFactory('HEAD')
  http.delete = http.del = requestFactory('DELETE')

  return exports.http = http
}))

},{}],32:[function(require,module,exports){
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['exports'], factory)
  } else if (typeof exports === 'object') {
    factory(exports)
    if (typeof module === 'object' && module !== null) {
      module.exports = exports = exports.midware
    }
  } else {
    factory(root)
  }
}(this, function (exports) {
  'use strict'

  function midware(ctx) {
    var calls = use.stack = []
    ctx = ctx || null
       
    function use() {
      toArray(arguments)
      .filter(function (fn) {
        return typeof fn === 'function'
      })
      .forEach(function (fn) {
        calls.push(fn)
      })
      return ctx
    }

    use.run = function run() {
      var done, args = toArray(arguments)
      
      if (typeof args[args.length - 1] === 'function') {
        done = args.pop()
      }
      
      if (!calls.length) {
        if (done) done.call(ctx)
        return
      }
      
      var stack = calls.slice()
      args.push(next)
      
      function runNext() {
        var fn = stack.shift()
        fn.apply(ctx, args)
      }

      function next(err, end) {
        if (err || end || !stack.length) {
          stack = null
          if (done) done.call(ctx, err, end)
        } else {
          runNext()
        }
      }

      runNext()
    }

    use.remove = function (name) {
      for (var i = 0, l = calls.length; i < l; i += 1) {
        var fn = calls[i]
        if (fn === name || fn.name === name) {
          calls.splice(i, 1)
          break
        }
      }
    }

    use.flush = function () {
      calls.splice(0)
    }

    return use
  }

  function toArray(nargs) {
    var args = new Array(nargs.length)
    for (var i = 0, l = args.length; i < l; i += 1) {
      args[i] = nargs[i]
    }
    return args
  }
  
  midware.VERSION = '0.1.7'
  exports.midware = midware
}))

},{}],33:[function(require,module,exports){
module.exports = [
    [ 0x0300, 0x036F ], [ 0x0483, 0x0486 ], [ 0x0488, 0x0489 ],
    [ 0x0591, 0x05BD ], [ 0x05BF, 0x05BF ], [ 0x05C1, 0x05C2 ],
    [ 0x05C4, 0x05C5 ], [ 0x05C7, 0x05C7 ], [ 0x0600, 0x0603 ],
    [ 0x0610, 0x0615 ], [ 0x064B, 0x065E ], [ 0x0670, 0x0670 ],
    [ 0x06D6, 0x06E4 ], [ 0x06E7, 0x06E8 ], [ 0x06EA, 0x06ED ],
    [ 0x070F, 0x070F ], [ 0x0711, 0x0711 ], [ 0x0730, 0x074A ],
    [ 0x07A6, 0x07B0 ], [ 0x07EB, 0x07F3 ], [ 0x0901, 0x0902 ],
    [ 0x093C, 0x093C ], [ 0x0941, 0x0948 ], [ 0x094D, 0x094D ],
    [ 0x0951, 0x0954 ], [ 0x0962, 0x0963 ], [ 0x0981, 0x0981 ],
    [ 0x09BC, 0x09BC ], [ 0x09C1, 0x09C4 ], [ 0x09CD, 0x09CD ],
    [ 0x09E2, 0x09E3 ], [ 0x0A01, 0x0A02 ], [ 0x0A3C, 0x0A3C ],
    [ 0x0A41, 0x0A42 ], [ 0x0A47, 0x0A48 ], [ 0x0A4B, 0x0A4D ],
    [ 0x0A70, 0x0A71 ], [ 0x0A81, 0x0A82 ], [ 0x0ABC, 0x0ABC ],
    [ 0x0AC1, 0x0AC5 ], [ 0x0AC7, 0x0AC8 ], [ 0x0ACD, 0x0ACD ],
    [ 0x0AE2, 0x0AE3 ], [ 0x0B01, 0x0B01 ], [ 0x0B3C, 0x0B3C ],
    [ 0x0B3F, 0x0B3F ], [ 0x0B41, 0x0B43 ], [ 0x0B4D, 0x0B4D ],
    [ 0x0B56, 0x0B56 ], [ 0x0B82, 0x0B82 ], [ 0x0BC0, 0x0BC0 ],
    [ 0x0BCD, 0x0BCD ], [ 0x0C3E, 0x0C40 ], [ 0x0C46, 0x0C48 ],
    [ 0x0C4A, 0x0C4D ], [ 0x0C55, 0x0C56 ], [ 0x0CBC, 0x0CBC ],
    [ 0x0CBF, 0x0CBF ], [ 0x0CC6, 0x0CC6 ], [ 0x0CCC, 0x0CCD ],
    [ 0x0CE2, 0x0CE3 ], [ 0x0D41, 0x0D43 ], [ 0x0D4D, 0x0D4D ],
    [ 0x0DCA, 0x0DCA ], [ 0x0DD2, 0x0DD4 ], [ 0x0DD6, 0x0DD6 ],
    [ 0x0E31, 0x0E31 ], [ 0x0E34, 0x0E3A ], [ 0x0E47, 0x0E4E ],
    [ 0x0EB1, 0x0EB1 ], [ 0x0EB4, 0x0EB9 ], [ 0x0EBB, 0x0EBC ],
    [ 0x0EC8, 0x0ECD ], [ 0x0F18, 0x0F19 ], [ 0x0F35, 0x0F35 ],
    [ 0x0F37, 0x0F37 ], [ 0x0F39, 0x0F39 ], [ 0x0F71, 0x0F7E ],
    [ 0x0F80, 0x0F84 ], [ 0x0F86, 0x0F87 ], [ 0x0F90, 0x0F97 ],
    [ 0x0F99, 0x0FBC ], [ 0x0FC6, 0x0FC6 ], [ 0x102D, 0x1030 ],
    [ 0x1032, 0x1032 ], [ 0x1036, 0x1037 ], [ 0x1039, 0x1039 ],
    [ 0x1058, 0x1059 ], [ 0x1160, 0x11FF ], [ 0x135F, 0x135F ],
    [ 0x1712, 0x1714 ], [ 0x1732, 0x1734 ], [ 0x1752, 0x1753 ],
    [ 0x1772, 0x1773 ], [ 0x17B4, 0x17B5 ], [ 0x17B7, 0x17BD ],
    [ 0x17C6, 0x17C6 ], [ 0x17C9, 0x17D3 ], [ 0x17DD, 0x17DD ],
    [ 0x180B, 0x180D ], [ 0x18A9, 0x18A9 ], [ 0x1920, 0x1922 ],
    [ 0x1927, 0x1928 ], [ 0x1932, 0x1932 ], [ 0x1939, 0x193B ],
    [ 0x1A17, 0x1A18 ], [ 0x1B00, 0x1B03 ], [ 0x1B34, 0x1B34 ],
    [ 0x1B36, 0x1B3A ], [ 0x1B3C, 0x1B3C ], [ 0x1B42, 0x1B42 ],
    [ 0x1B6B, 0x1B73 ], [ 0x1DC0, 0x1DCA ], [ 0x1DFE, 0x1DFF ],
    [ 0x200B, 0x200F ], [ 0x202A, 0x202E ], [ 0x2060, 0x2063 ],
    [ 0x206A, 0x206F ], [ 0x20D0, 0x20EF ], [ 0x302A, 0x302F ],
    [ 0x3099, 0x309A ], [ 0xA806, 0xA806 ], [ 0xA80B, 0xA80B ],
    [ 0xA825, 0xA826 ], [ 0xFB1E, 0xFB1E ], [ 0xFE00, 0xFE0F ],
    [ 0xFE20, 0xFE23 ], [ 0xFEFF, 0xFEFF ], [ 0xFFF9, 0xFFFB ],
    [ 0x10A01, 0x10A03 ], [ 0x10A05, 0x10A06 ], [ 0x10A0C, 0x10A0F ],
    [ 0x10A38, 0x10A3A ], [ 0x10A3F, 0x10A3F ], [ 0x1D167, 0x1D169 ],
    [ 0x1D173, 0x1D182 ], [ 0x1D185, 0x1D18B ], [ 0x1D1AA, 0x1D1AD ],
    [ 0x1D242, 0x1D244 ], [ 0xE0001, 0xE0001 ], [ 0xE0020, 0xE007F ],
    [ 0xE0100, 0xE01EF ]
]

},{}],34:[function(require,module,exports){
"use strict"

var defaults = require('defaults')
var combining = require('./combining')

var DEFAULTS = {
  nul: 0,
  control: 0
}

module.exports = function wcwidth(str) {
  return wcswidth(str, DEFAULTS)
}

module.exports.config = function(opts) {
  opts = defaults(opts || {}, DEFAULTS)
  return function wcwidth(str) {
    return wcswidth(str, opts)
  }
}

/*
 *  The following functions define the column width of an ISO 10646
 *  character as follows:
 *  - The null character (U+0000) has a column width of 0.
 *  - Other C0/C1 control characters and DEL will lead to a return value
 *    of -1.
 *  - Non-spacing and enclosing combining characters (general category
 *    code Mn or Me in the
 *    Unicode database) have a column width of 0.
 *  - SOFT HYPHEN (U+00AD) has a column width of 1.
 *  - Other format characters (general category code Cf in the Unicode
 *    database) and ZERO WIDTH
 *    SPACE (U+200B) have a column width of 0.
 *  - Hangul Jamo medial vowels and final consonants (U+1160-U+11FF)
 *    have a column width of 0.
 *  - Spacing characters in the East Asian Wide (W) or East Asian
 *    Full-width (F) category as
 *    defined in Unicode Technical Report #11 have a column width of 2.
 *  - All remaining characters (including all printable ISO 8859-1 and
 *    WGL4 characters, Unicode control characters, etc.) have a column
 *    width of 1.
 *  This implementation assumes that characters are encoded in ISO 10646.
*/

function wcswidth(str, opts) {
  if (typeof str !== 'string') return wcwidth(str, opts)

  var s = 0
  for (var i = 0; i < str.length; i++) {
    var n = wcwidth(str.charCodeAt(i), opts)
    if (n < 0) return -1
    s += n
  }

  return s
}

function wcwidth(ucs, opts) {
  // test for 8-bit control characters
  if (ucs === 0) return opts.nul
  if (ucs < 32 || (ucs >= 0x7f && ucs < 0xa0)) return opts.control

  // binary search in table of non-spacing characters
  if (bisearch(ucs)) return 0

  // if we arrive here, ucs is not a combining or C0/C1 control character
  return 1 +
      (ucs >= 0x1100 &&
       (ucs <= 0x115f ||                       // Hangul Jamo init. consonants
        ucs == 0x2329 || ucs == 0x232a ||
        (ucs >= 0x2e80 && ucs <= 0xa4cf &&
         ucs != 0x303f) ||                     // CJK ... Yi
        (ucs >= 0xac00 && ucs <= 0xd7a3) ||    // Hangul Syllables
        (ucs >= 0xf900 && ucs <= 0xfaff) ||    // CJK Compatibility Ideographs
        (ucs >= 0xfe10 && ucs <= 0xfe19) ||    // Vertical forms
        (ucs >= 0xfe30 && ucs <= 0xfe6f) ||    // CJK Compatibility Forms
        (ucs >= 0xff00 && ucs <= 0xff60) ||    // Fullwidth Forms
        (ucs >= 0xffe0 && ucs <= 0xffe6) ||
        (ucs >= 0x20000 && ucs <= 0x2fffd) ||
        (ucs >= 0x30000 && ucs <= 0x3fffd)));
}

function bisearch(ucs) {
  var min = 0
  var max = combining.length - 1
  var mid

  if (ucs < combining[0][0] || ucs > combining[max][1]) return false

  while (max >= min) {
    mid = Math.floor((min + max) / 2)
    if (ucs > combining[mid][1]) min = mid + 1
    else if (ucs < combining[mid][0]) max = mid - 1
    else return true
  }

  return false
}

},{"./combining":33,"defaults":26}]},{},[8])(8)
});