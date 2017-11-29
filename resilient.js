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
    error: 50,
    latency: 35
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

},{"./utils":20,"lil-http":23,"request":21}],8:[function(require,module,exports){
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

},{"./utils":20,"midware":24}],10:[function(require,module,exports){
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

},{"./cache":1,"./client":2,"./evaluator":6,"./middleware":9,"./options":10,"./resolvers/discovery":14,"./sync":19,"./utils":20,"lil-event":22}],13:[function(require,module,exports){
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
var balancerOptions = require('./defaults').balancer

module.exports = Server

function Server (url) {
  this.url = url
  this.resetStats()
}

Server.prototype.report = function (operation, latency, type) {
  var stats = this.stats(operation)
  if (stats) {
    stats[type || 'request'] += 1
    stats.latency = calculateAvgLatency(latency || 0, stats)
  }
}

Server.prototype.reportError = function (operation, latency) {
  this.report(operation, latency, 'error')
}

Server.prototype.balance = function (operation, options) {
  var stats = this.stats(operation)
  var weight = balancerOptions.weight
  var total = stats.request + stats.error
  return total ? calculateStatsBalance(stats, weight, total) : 0
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

function calculateStatsBalance (stats, weight, total) {
  return round(
    ((((stats.request * 100 / total) * weight.success) +
    ((stats.error * 100 / total) * weight.error)) +
    (stats.latency * weight.latency)) / 100)
}

function calculateAvgLatency (latency, stats) {
  return round((latency + stats.latency) / (stats.request + stats.error))
}

function round (number) {
  return +((number * 100) / 100).toFixed(2)
}

},{"./defaults":3}],18:[function(require,module,exports){
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

function mapServer (data) {
  var server
  if (data instanceof Server) {
    server = data
  } else {
    server = this.find(_.isObj(data) ? data.url : data)
    if (!server) server = new Server(data)
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

},{}],22:[function(require,module,exports){
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

},{}],24:[function(require,module,exports){
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

},{}]},{},[8])(8)
});