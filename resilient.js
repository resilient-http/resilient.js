/*! resilient - v0.2.12 - MIT License - https://github.com/resilient-http/resilient.js */
!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.resilient=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*! lil-http - v0.1.14 - MIT License - https://github.com/lil-js/http */
(function (root, factory) {
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

  var VERSION = '0.1.14'
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

  function isObj(o) {
    return o && toStr.call(o) === '[object Object]' || false
  }

  function assign(target) {
    var i, l, x, cur, args = slicer.call(arguments).slice(1)
    for (i = 0, l = args.length; i < l; i += 1) {
      cur = args[i]
      for (x in cur) if (hasOwn.call(cur, x)) target[x] = cur[x]
    }
    return target
  }

  function once(fn) {
    var called = false
    return function () {
      if (called === false) {
        called = true
        fn.apply(null, arguments)
      }
    }
  }

  function setHeaders(xhr, headers) {
    if (isObj(headers)) {
      headers['Content-Type'] = headers['Content-Type'] || http.defaultContent
      for (var field in headers) if (hasOwn.call(headers, field)) {
        xhr.setRequestHeader(field, headers[field])
      }
    }
  }

  function getHeaders(xhr) {
    var headers = {}, rawHeaders = xhr.getAllResponseHeaders().trim().split('\n')
    rawHeaders.forEach(function (header) {
      var split = header.trim().split(':')
      var key = split.shift().trim()
      var value = split.join(':').trim()
      headers[key] = value
    })
    return headers
  }

  function isJSONResponse(xhr) {
    return jsonMimeRegex.test(xhr.getResponseHeader('Content-Type'))
  }

  function encodeParams(params) {
    return Object.getOwnPropertyNames(params).filter(function (name) {
      return params[name] !== undefined
    }).map(function (name) {
      var value = (params[name] === null) ? '' : params[name]
      return encodeURIComponent(name) + (value ? '=' + encodeURIComponent(value) : '')
    }).join('&').replace(/%20/g, '+')
  }

  function parseData(xhr) {
    var data = null
    if (xhr.responseType === 'text') {
      data = xhr.responseText
      if (isJSONResponse(xhr) && data) data = JSON.parse(data)
    } else {
      data = xhr.response
    }
    return data
  }

  function buildResponse(xhr) {
    var response = {
      xhr: xhr,
      status: xhr.status,
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

  function buildErrorResponse(xhr, error) {
    var response = buildResponse(xhr)
    response.error = error
    if (error.stack) response.stack = error.stack
    return response
  }

  function cleanReferences(xhr) {
    xhr.onreadystatechange = xhr.onerror = xhr.ontimeout = null
  }

  function isValidResponseStatus(xhr) {
    var status = xhr.status = xhr.status === 1223 ? 204 : xhr.status // IE9 fix
    return status >= 200 && status < 300 || status === 304
  }

  function onError(xhr, cb) {
    return once(function (err) {
      cb(buildErrorResponse(xhr, err), null)
    })
  }

  function onLoad(config, xhr, cb) {
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

  function isCrossOrigin(url) {
    var match = url.match(originRegex)
    return match && match[1] === origin
  }

  function getURL(config) {
    var url = config.url
    if (isObj(config.params)) {
      url += (url.indexOf('?') === -1 ? '?' : '&') + encodeParams(config.params)
    }
    return url
  }

  function XHRFactory(url) {
    if (hasDomainRequest && isCrossOrigin(url)) {
      return new XDomainRequest()
    } else {
      return new XMLHttpRequest()
    }
  }

  function createClient(config) {
    var method = (config.method || 'GET').toUpperCase()
    var auth = config.auth
    var url = getURL(config)

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

  function updateProgress(xhr, cb) {
    return function (ev) {
      if (ev.lengthComputable) {
        cb(ev, ev.loaded / ev.total)
      } else {
        cb(ev)
      }
    }
  }

  function hasContentTypeHeader(config) {
    return config && isObj(config.headers)
      && (config.headers['content-type'] || config.headers['Content-Type'])
      || false
  }

  function buildPayload(xhr, config) {
    var data = config.data
    if (isObj(config.data) || Array.isArray(config.data)) {
      if (hasContentTypeHeader(config) === false) {
        xhr.setRequestHeader('Content-Type', 'application/json')
      }
      data = JSON.stringify(config.data)
    }
    return data
  }

  function timeoutResolver(cb, timeoutId) {
    return function () {
      clearTimeout(timeoutId)
      cb.apply(null, arguments)
    }
  }

  function request(config, cb, progress) {
    var xhr = createClient(config)
    var data = buildPayload(xhr, config)
    var errorHandler = onError(xhr, cb)

    if (hasBind) {
      xhr.ontimeout = errorHandler
    } else {
      var timeoutId = setTimeout(function abort() {
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
      xhr.send(data ? data : null)
    } catch (e) {
      errorHandler(e)
    }

    return { xhr: xhr, config: config }
  }

  function requestFactory(method) {
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

  function http(config, data, cb, progress) {
    return requestFactory('GET').apply(null, arguments)
  }

  http.VERSION = VERSION
  http.defaults = defaults
  http.defaultContent = 'text/plain'
  http.get = requestFactory('GET')
  http.post = requestFactory('POST')
  http.put = requestFactory('PUT')
  http.del = requestFactory('DELETE')
  http.patch = requestFactory('PATCH')
  http.head = requestFactory('HEAD')

  return exports.http = http
}))

},{}],2:[function(require,module,exports){
var _ = require('./utils')

module.exports = Cache

function Cache() {
  this.store = {}
}

Cache.prototype.flush = function (key) {
  if (key) {
    this.store[key] = null
  } else {
    this.store = {}
  }
}

Cache.prototype.get = function (key) {
  return key ? this.store[key] : _.clone(this.store)
}

Cache.prototype.time = function (key) {
  if (key && this.store[key]) {
    return this.store[key].time
  }
}

Cache.prototype.exists = function (key) {
  var value = this.store[key]
  return _.isObj(value)
    && ((_.isArr(value.data) && value.data.length > 0)
    || _.isObj(value.data))
    || false
}

Cache.prototype.set = function (key, data) {
  if (key && data) {
    this.store[key] = { data: data, time: _.now() }
  }
}

},{"./utils":18}],3:[function(require,module,exports){
var _ = require('./utils')
var resolver = require('./resolver')
var http = require('./http')

module.exports = Client

function Client(resilient) {
  this._resilient = resilient
}

Client.prototype.send = function (path, options, cb, method) {
  var args = normalizeArgs.call(this, path, options, cb, method)
  requester.apply(this, args)
  return this
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

Client.prototype.delete = Client.prototype.del = function (path, options, cb) {
  return this.send(path, options, cb, 'DELETE')
}

Client.prototype.patch = function (path, options, cb) {
  return this.send(path, options, cb, 'PATCH')
}

Client.prototype.head = function (path, options, cb) {
  return this.send(path, options, cb, 'HEAD')
}

function requester(options, cb) {
  this._resilient.emit('request:start', options, this._resilient)
  return isFullUrlSchema(options)
    ? plainHttpRequest(this._resilient, options, cb)
    : resolver(this._resilient, options, cb)
}

function normalizeArgs(path, options, cb, method) {
  if (typeof options === 'function') {
    cb = options
    options = arguments[0]
  }
  options = mergeHttpOptions(this._resilient, options)
  if (typeof path === 'string') options.path = path
  if (typeof method === 'string') options.method = method
  if (typeof cb !== 'function') cb = _.noop
  return [ options, wrapCallback(this._resilient, cb) ]
}

function wrapCallback(resilient, cb) {
  return _.once(function finalHandler(err, res) {
    resilient.emit('request:finish', err, res, resilient)
    cb(err, res)
  })
}

function mergeHttpOptions(resilient, options) {
  var defaults = resilient.options('service').get()
  return _.merge(defaults, options)
}

function isFullUrlSchema(options) {
  return options && (_.isURI(options.path) || _.isURI(options.url)) || false
}

function plainHttpRequest(resilient, options, cb) {
  if (options.path) {
    options.url = options.path
    options.path = null
  }
  return (resilient._httpClient || http).call(null, options, cb)
}

},{"./http":8,"./resolver":13,"./utils":18}],4:[function(require,module,exports){
var defaults = module.exports = {}

defaults.service = {
  method: 'GET',
  timeout: 10 * 1000,
  servers: null,
  retry: 0,
  retryWait: 50,
  discoverBeforeRetry: true,
  promiscuousErrors: false
}

defaults.balancer = {
  enable: true,
  roundRobin: true,
  roundRobinSize: 3,
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
  retryWait: 1000,
  timeout: 2 * 1000,
  cacheEnabled: true,
  cacheExpiration: 60 * 10 * 1000,
  promiscuousErrors: true,
  refreshInterval: 60 * 1000,
  enableRefreshServers: true,
  refreshServersInterval: 60 * 3 * 1000,
  refreshServers: null,
  refreshOptions: null,
  refreshPath: null,
  useDiscoveryServersToRefresh: false
}

defaults.resilientOptions = [
  'servers',
  'retry',
  'retryWait',
  'parallel',
  'cacheEnabled',
  'cacheExpiration',
  'refreshInterval',
  'refreshServers',
  'refreshOptions',
  'refreshPath',
  'promiscuousErrors',
  'enableRefreshServers',
  'refreshServersInterval',
  'discoverBeforeRetry',
  'useDiscoveryServersToRefresh'
]

},{}],5:[function(require,module,exports){
var _ = require('./utils')
var ResilientError = require('./error')
var Servers = require('./servers')
var Requester = require('./requester')
var DiscoveryServers = require('./discovery-servers')
var ServersDiscovery = require('./servers-discovery')

module.exports = DiscoveryResolver

function DiscoveryResolver(resilient, options, servers) {
  function resolver(cb) {
    return function finish(err, res) {
      dispatchQueue(err, res)
      cb(err, res)
    }
  }

  function updateServers(cb) {
    resilient._updating = true
    ServersDiscovery(resilient, options, servers)(resolver(cb))
  }

  function dispatchQueue(err, res) {
    resilient._updating = false
    resilient._queue.forEach(dispatcher(err, res))
    resilient._queue.splice(0)
  }

  function dispatcher(err, res) {
    return function (cb) {
      try { cb(err, res) } catch (e) {}
    }
  }

  return function resolve(cb) {
    if (resilient._updating) {
      resilient._queue.push(cb)
    } else {
      updateServers(cb)
    }
  }
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

},{"./discovery-servers":6,"./error":7,"./requester":11,"./servers":17,"./servers-discovery":16,"./utils":18}],6:[function(require,module,exports){
var _ = require('./utils')
var ResilientError = require('./error')

module.exports = DiscoveryServers

function DiscoveryServers(resilient) {
  function saveServers(res, cb) {
    var data = res.data
    emit('refresh', data)
    resilient.setServers(data)
    refreshCache(data)
    cb(null, res)
  }

  function handlerError(err, cb) {
    if (isCacheEnabled()) {
      resolveFromCache(err, cb)
    } else {
      resolveWithError(err, cb)
    }
  }

  function resolveFromCache(err, cb) {
    var cache = getCache()
    if (hasValidCache(cache)) {
      cb(null, { status: 200, _cache: true, data: cache.data })
    } else {
      resolveWithError(err, cb)
    }
  }

  function hasValidCache(cache) {
    var valid = false
    var expires = resilient.options('discovery').get('cacheExpiration')
    return cache && _.isArr(cache.data) && (_.now() - cache.time) > expires || false
  }

  function refreshCache(data) {
    if (isCacheEnabled()) {
      emit('cache', data)
      resilient._cache.set('servers', data)
    }
  }

  function isCacheEnabled() {
    return resilient.options('discovery').get('cacheEnabled')
  }

  function getCache() {
    return resilient._cache.get('servers')
  }

  function emit(name, data) {
    resilient.emit('servers:' + name, data, resilient)
  }

  return function defineServers(cb) {
    return function handler(err, res) {
      if (err) {
        handlerError(err, cb)
      } else if (isValidResponse(res)) {
        saveServers(res, cb)
      } else {
        cb(new ResilientError(1004, res))
      }
    }
  }
}

function resolveWithError(err, cb) {
  err = err || { status: 1000 }
  return cb(new ResilientError(err.status, err))
}

function isValidResponse(res) {
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

function parseAsJSON(res) {
  try {
    res.data = JSON.parse(res.data)
    return true
  } catch (e) {
    return false
  }
}

},{"./error":7,"./utils":18}],7:[function(require,module,exports){
module.exports = ResilientError

var MESSAGES = {
  1000: 'All requests failed. No servers available',
  1001: 'Cannot update discovery servers. Empty or invalid response body',
  1002: 'Missing discovery servers. Cannot resolve the server',
  1003: 'Cannot resolve servers. Missing data',
  1004: 'Discovery server response is invalid or empty',
  1005: 'Missing servers during retry process',
  1006: 'Internal unexpected error'
}

function ResilientError(status, error) {
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
}

ResilientError.prototype = Object.create(Error.prototype)

ResilientError.MESSAGES = MESSAGES

},{}],8:[function(require,module,exports){
var _ = require('./utils')
var http = resolveModule()
var JSON_MIME = /application\/json/

module.exports = client

function client() {
  return http.apply(null, arguments)
}

client.VERSION = http.VERSION
client.mapResponse = mapResponse

function resolveModule() {
  if (typeof window === 'object' && window) {
    return require('../bower_components/lil-http/http')
  } else {
    return requestWrapper(require('request'))
  }
}

function requestWrapper(request) {
  return function requester(options, cb) {
    return request(mapOptions(options), mapResponse(cb))
  }
}

function mapResponse(cb) {
  return function (err, res, body) {
    if (res) {
      if (res.statusCode) res.status = res.statusCode
    }
    if (body) {
      (err || res).data = isJSONContent(err || res) ? JSON.parse(body) : body
    }
    cb(err, res)
  }
}

function mapOptions(options) {
  if (typeof options === 'string') options = { url: options }
  options = setUserAgent(options)
  if (options.params) options.qs = options.params
  if (options.data) mapRequestBody(options)
  return options
}

function isJSONContent(res) {
  return typeof res.body === 'string' && JSON_MIME.test(res.headers['content-type'])
}

function setUserAgent(options) {
  options = options || {}
  options.headers = options.headers || {}
  options.headers['User-Agent'] = options.headers['User-Agent'] || getUserAgent()
  return options
}

function getUserAgent() {
  return 'resilient-http ' + client.LIBRARY_VERSION + ' (node)'
}

function mapRequestBody(options) {
  var body = options.data || options.body
  if (body && _.isObj(body) || _.isArr(body)) {
    options.json = true
    options.data = null
  }
  options.body = body
}

},{"../bower_components/lil-http/http":1,"./utils":18,"request":19}],9:[function(require,module,exports){
var Resilient = require('./resilient')
var Options = require('./options')
var Client = require('./client')
var http = require('./http')
var defaults = require('./defaults')

module.exports = ResilientFactory

function ResilientFactory(options) {
  return new Resilient(options)
}

ResilientFactory.VERSION = '0.2.12'
ResilientFactory.CLIENT_VERSION = http.VERSION
ResilientFactory.defaults = defaults
ResilientFactory.Options = Options
ResilientFactory.Client = Client
ResilientFactory.request = http
http.LIBRARY_VERSION = ResilientFactory.VERSION

},{"./client":3,"./defaults":4,"./http":8,"./options":10,"./resilient":12}],10:[function(require,module,exports){
var _ = require('./utils')
var defaults = require('./defaults')
var Servers = require('./servers')

module.exports = Options

function Options(options, type) {
  this.store = type ? _.clone(defaults[type]) : {}
  this.set(options)
}

Options.prototype.get = function (key) {
  return key ? this.store[key] : _.clone(this.store)
}

Options.prototype.set = function (key, value) {
  if (_.isObj(key)) {
    _.each(key, _.bind(this, this.set))
  } else if (value !== undefined) {
    if (key === 'servers') {
      this.setServers(value)
    } else {
      if (key === 'refreshServers') value = new Servers(value)
      this.store[key] = value
    }
  }
}

Options.prototype.http = function () {
  return _.omit(this.store, defaults.resilientOptions)
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

Options.prototype.clone = function () {
  return Options.define(getRaw(this.store))
}

Options.define = function (options, defaultOptions) {
  var store = new Options()
  defaultOptions = _.clone(defaultOptions || defaults)
  Object.keys(defaultOptions).forEach(defineDefaults(options, store))
  return store
}

function defineDefaults(options, store) {
  options = _.isObj(options) ? options : {}
  return function (type) {
    if (type !== 'resilientOptions') {
      store.set(type, new Options(options[type], type))
    }
  }
}

function getRaw(options) {
  var buf = {}
  _.each(options, function (key, value) {
    if (value instanceof Options) {
      buf[key] = value.get()
    }
  })
  return buf
}

},{"./defaults":4,"./servers":17,"./utils":18}],11:[function(require,module,exports){
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

// to do: unify err-res arguments
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

},{"./defaults":4,"./discovery-servers":6,"./error":7,"./http":8,"./utils":18}],12:[function(require,module,exports){
var _ = require('./utils')
var Options = require('./options')
var Client = require('./client')
var Cache = require('./cache')
var DiscoveryResolver = require('./discovery-resolver')
var EventBus = require('lil-event')

module.exports = Resilient

function Resilient(options) {
  this._queue = []
  this._updating = false
  this._client = new Client(this)
  this._cache = new Cache()
  this._httpClient = null
  this._options = Options.define(options)
}

Resilient.prototype = Object.create(EventBus.prototype)

Resilient.prototype.options = function (type, options) {
  var store = null
  if (type && _.isObj(options)) {
    store = this._options.get(type)
    if (store instanceof Options) store.set(options)
  } else if (_.isObj(type)) {
    this._options = Options.define(type)
  } else {
    return this._options.get(type)
  }
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

Resilient.prototype.getHttpOptions = function (type) {
  var options = this.options(type || 'service')
  if (options) return options.http()
}

Resilient.prototype.servers = function (type) {
  var options = this.options(type || 'service')
  if (options) return options.servers()
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

Resilient.prototype.setServers = function (list) {
  this.options('service').servers(list)
  return this
}

Resilient.prototype.getUpdatedServers = Resilient.prototype.latestServers = function (options, cb) {
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

Resilient.prototype.flushCache = function () {
  this._cache.flush()
  return this
}

Resilient.prototype.useHttpClient = function (client) {
  if (typeof client === 'function') {
    this._httpClient = client
  }
}

Resilient.prototype.restoreHttpClient = function () {
  this._httpClient = null
}

Resilient.prototype.areServersUpdated = function () {
  return this.servers('service').lastUpdate() < (this.options('discovery').get('refreshInterval') || 0)
}

Resilient.prototype.balancer = function (options) {
  if (options) {
    this.options('balancer', options)
  } else {
    return this.options('balancer')
  }
}

Resilient.prototype.client = Resilient.prototype.http = function () {
  return this._client
}

Resilient.prototype.send = Resilient.prototype.request = function (path, options, cb) {
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
}

;['get', 'post', 'put', 'del', 'delete', 'head', 'patch'].forEach(defineMethodProxy)

function defineMethodProxy(verb) {
  Resilient.prototype[verb] = function (path, options, cb) {
    return this._client[verb](path, options, cb)
  }
}

function updateServers(resilient, method, options, cb) {
  if (typeof options === 'function') { cb = options; options = null }
  DiscoveryResolver[method](resilient, options, cb || _.noop)
  return resilient
}

},{"./cache":2,"./client":3,"./discovery-resolver":5,"./options":10,"./utils":18,"lil-event":20}],13:[function(require,module,exports){
var _ = require('./utils')
var ResilientError = require('./error')
var Requester = require('./requester')
var DiscoveryResolver = require('./discovery-resolver')
var ServersDiscovery = require('./servers-discovery')
var Servers = require('./servers')

module.exports = Resolver

function Resolver(resilient, options, cb) {
  try {
    resolve(resolver)
  } catch (err) {
    cb(new ResilientError(1006, err))
  }

  function resolve(next) {
    if (hasDiscoveryServersOutdated()) {
      updateDiscoveryServers(next)
    } else if (hasValidServers()) {
      next()
    } else if (hasDiscoveryServers()) {
      updateServersFromDiscovery(next)
    } else {
      next(new ResilientError(1002))
    }
  }

  function updateServersFromDiscovery(next) {
    DiscoveryResolver.update(resilient, null, next)
  }

  function updateDiscoveryServers(next) {
    var options = resilient.options('discovery')
    var servers = getRefreshServers(options)
    var refreshOptions = getRefreshOptions(options)
    ServersDiscovery(resilient, refreshOptions, servers)(onRefreshServers(options, next))
  }

  function onRefreshServers(options, next) {
    return function (err, res) {
      if (err) {
        next(new ResilientError(1001, err))
      } else if (res && res.data) {
        refreshDiscoveryServers(res.data, options, next)
      } else {
        next(new ResilientError(1004, err))
      }
    }
  }

  function refreshDiscoveryServers(data, options, next) {
    resilient.emit('discovery:refresh', data, resilient)
    options.servers(data)
    updateServersFromDiscovery(next)
  }

  function hasDiscoveryServersOutdated(options) {
    var outdated = false
    var options = resilient.options('discovery')
    var servers = options.get('servers')
    var refreshServers = options.get('refreshServers')
    if (options.get('enableRefreshServers')) {
      if (options.get('useDiscoveryServersToRefresh') || (refreshServers && refreshServers.exists())) {
        if (servers && servers.exists()) {
          outdated = servers.lastUpdate() > options.get('refreshServersInterval')
        } else {
          outdated = true
        }
      }
    }
    return outdated
  }

  function hasValidServers() {
    var servers = resilient.servers()
    return servers && servers.exists() && serversAreUpdated(servers) || false
  }

  function serversAreUpdated(servers) {
    var updated = true
    if (hasDiscoveryServers()) {
      updated = servers.lastUpdate() < resilient.options('discovery').get('refreshInterval')
    }
    return updated
  }

  function hasDiscoveryServers() {
    return resilient.hasDiscoveryServers()
  }

  function resolver(err, res) {
    err ? cb(err) : handleResolution(res)
  }

  function handleResolution(res) {
    var servers = resilient.servers()
    if (res && res._cache) {
      servers = new Servers(res.data)
    } else if (!hasValidServers()) {
      return cb(new ResilientError(1003))
    }
    Requester(resilient)(servers, options, cb)
  }
}

function getRefreshServers(options) {
  return options.get('useDiscoveryServersToRefresh') ? options.get('servers') : options.get('refreshServers')
}

function getRefreshOptions(options) {
  var defaultOptions = _.omit(options.get(), ['servers', 'refreshOptions'])
  var refreshOptions = _.merge(defaultOptions, options.get('refreshOptions'), { discoverBeforeRetry: false })
  var basePath = getRefreshBasePath(options.get())
  if (basePath) refreshOptions.basePath = basePath
  return refreshOptions
}

function getRefreshBasePath(options) {
  return options && (options.refreshPath
    || (options.refreshOptions && (options.refreshOptions.basePath)))
    || false
}

},{"./discovery-resolver":5,"./error":7,"./requester":11,"./servers":17,"./servers-discovery":16,"./utils":18}],14:[function(require,module,exports){
module.exports = resolver

function resolver(arr, size) {
  size = size < 2 ? 2 : size
  return roundRobin(size, arr)[getRandom(size)].shift()
}

function roundRobin(n, ps) {
  var k, j, i, rs = [] // rs = round array
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

function getRandom(max) {
  max = max > 0 ? max - 1 : max
  return Math.round(Math.random() * (max - 0) + 0)
}

},{}],15:[function(require,module,exports){
var balancerOptions = require('./defaults').balancer

module.exports = Server

function Server(url) {
  this.url = url
  this.statsStore = createServerStats()
}

Server.prototype.report = function (operation, latency, type) {
  var stats = this.stats(operation)
  if (stats) {
    stats[type || 'request'] += 1
    if (latency > 0) {
      stats.latency = calculateAvgLatency(latency, stats)
    }
  }
}

Server.prototype.reportError = function (operation, latency) {
  this.report(operation, latency, 'error')
}

Server.prototype.balance = function (operation, options) {
  var stats = this.stats(operation)
  var weight = balancerOptions.weight
  var total = stats.request + stats.error
  return total === 0 ? 0 : calculateStatsBalance(stats, weight, total)
}

Server.prototype.stats = function (operation, field) {
  var stats = this.statsStore[operation || 'read']
  if (stats && field) stats = stats[field]
  return stats
}

function createServerStats() {
  return {
    read: createStats(),
    write: createStats()
  }
}

function createStats() {
  return {
    latency: 0,
    error: 0,
    request: 0
  }
}

function getWeightAvg() {
  return (stats.request * 100 / total) * weight.success
}

function calculateStatsBalance(stats, weight, total) {
  return round(
   ((((stats.request * 100 / total) * weight.success) +
   ((stats.error * 100 / total) * weight.error)) +
   (stats.latency * weight.latency)) / 100)
}

function calculateAvgLatency(latency, stats) {
  return round((latency + stats.latency) / (stats.request + stats.error))
}

function round(number) {
  return Math.round(number * 100) / 100
}

},{"./defaults":4}],16:[function(require,module,exports){
var _ = require('./utils')
var ResilientError = require('./error')
var Servers = require('./servers')
var Requester = require('./requester')

module.exports = ServersDiscovery

function ServersDiscovery(resilient, options, servers) {
  function getOptions() {
    return _.merge(resilient.options('discovery').get(), options)
  }

  function getServers() {
    return servers || resilient.servers('discovery')
  }

  function hasDiscoveryServers() {
    var servers = getServers()
    return servers && servers.exists() || false
  }

  function fetchServers(cb) {
    var options = getOptions()
    options.params = addTimeStamp(options)
    if (options.parallel) {
      updateServersInParallel(options, cb)
    } else {
      Requester(resilient)(getServers(), options, onUpdateServers(cb))
    }
  }

  function counter(total) {
    return function decrement(reset) {
      return (total = reset ? -1 : (total - 1))
    }
  }

  function updateServersInParallel(options, cb) {
    var buf = []
    var servers = getServers().sort('read', resilient.balancer())
    var pending = counter(servers.length > 2 ? 3 : servers.length)

    servers.slice(0, 3).forEach(function (server, index) {
      server = [ server ]
      if (index === 2 && servers.length > 3) {
        server = server.concat(servers.slice(3))
      }
      Requester(resilient)(new Servers(server), options, onUpdateInParallel(servers, pending, buf, cb), buf)
    })
  }

  function onUpdateInParallel(servers, counter, buf, cb) {
    return function (err, res) {
      var pending = counter()
      if (!err || pending === 0) {
        counter(true) // reset
        onUpdateServers(cb, buf)(err, res)
      }
    }
  }

  function onUpdateServers(cb, buf) {
    return function (err, res) {
      closePendingRequests(buf)
      cb(err || null, res)
    }
  }

  function updateServers(cb) {
    try {
      fetchServers(cb)
    } catch (err) {
      cb(new ResilientError(1006, err))
    }
  }

  return function resolver(cb) {
    if (hasDiscoveryServers() === false) {
      cb(new ResilientError(1002))
    } else {
      updateServers(cb)
    }
  }
}

function addTimeStamp(options) {
  var time = _.now() + Math.floor(Math.random() * 10000)
  return _.extend(options.params || options.qs || {}, { _time: time })
}

function closePendingRequests(buf) {
  if (buf) {
    if (!isEmptyBuffer(buf)) buf.forEach(closePendingRequest)
    buf.splice(0)
  }
}

function closePendingRequest(client) {
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

function closeClient(client) {
  if (typeof client.abort === 'function') {
    try { client.abort() } catch (e) {}
  }
}

function isEmptyBuffer(buf) {
  return buf.filter(function (request) { return _.isObj(request) }).length === 0
}

},{"./error":7,"./requester":11,"./servers":17,"./utils":18}],17:[function(require,module,exports){
var _ = require('./utils')
var Server = require('./server')
var RoundRobin = require('./roundrobin')

module.exports = Servers

function Servers(servers) {
  this.servers = []
  this.updated = 0
  this.forceUpdate = false
  this.set(servers)
}

Servers.prototype.sort = function (operation, options) {
  var servers = this.servers.slice(0).sort(function (x, y) {
    return x.balance(operation, options) - y.balance(operation, options)
  })
  return roundRobinSort(servers, options)
}

Servers.prototype.find = function (url) {
  var i, l, server = null
  for (i = 0, l = this.servers.length; i < l; i += 1) {
    if (this.servers[i].url === url) {
      server = this.servers[i]
      break
    }
  }
  return server
}

Servers.prototype.get = function () {
  return this.servers.slice(0)
}

Servers.prototype.set = function (servers) {
  if (_.isArr(servers)) {
    this.forceUpdate = true
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

function isValidURI(uri) {
  if (_.isObj(uri)) uri = uri.url || uri.uri
  return _.isURI(uri)
}

function mapServers(servers) {
  return servers
    .filter(isValidURI)
    .map(_.bind(this, mapServer))
}

function mapServer(data) {
  var server
  if (data instanceof Server) {
    server = data
  } else {
    server = this.find(_.isObj(data) ? data.url : data)
    if (!server) server = new Server(data)
  }
  return server
}

function roundRobinSort(servers, options) {
  var size = 0
  if (options && options.roundRobin) {
    size = options.roundRobinSize > servers.length ? servers.length : options.roundRobinSize
    if (size > 1) servers = RoundRobin(servers, size)
  }
  return servers
}

},{"./roundrobin":14,"./server":15,"./utils":18}],18:[function(require,module,exports){
var _ = exports
var toStr = Object.prototype.toString
var slice = Array.prototype.slice
var hasOwn = Object.prototype.hasOwnProperty
var bind = Function.prototype.bind
var isArrayNative = Array.isArray
var uriRegex = /^http[s]?\:\/\/(.+)/i

_.noop = function noop() {}

_.now = function () {
  return new Date().getTime()
}

_.isObj = function (o) {
  return o && toStr.call(o) === '[object Object]' || false
}

_.isArr = function (o) {
  return o && isArrayNative ? isArrayNative(o) : toStr.call(o) === '[object Array]' || false
}

_.bind = function (ctx, fn) {
  return bind ? fn.bind(ctx) : function () {
    return fn.apply(ctx, arguments)
  }
}

_.each = function (obj, fn) {
  var i, l
  if (_.isArr(obj))
    for (i = 0, l = obj.length; i < l; i += 1) fn(obj[i], i)
  else if (_.isObj(obj))
    for (i in obj) if (hasOwn.call(obj, i)) fn(i, obj[i])
}

_.once = function (fn) {
  var called = false
  return function () {
    if (called === false) {
      called = true
      fn.apply(null, arguments)
    }
  }
}

_.clone = function (obj) {
  return _.extend({}, obj)
}

_.omit = function (obj, keys) {
  var key, buf = {}
  if (_.isObj(obj)) {
    for (key in obj) if (hasOwn.call(obj, key)) {
      if (keys.indexOf(key) === -1) buf[key] = obj[key]
    }
  }
  return buf
}

_.delay = function (fn, ms) {
  return setTimeout(fn, ms || 1)
}

_.isURI = function (str) {
  return typeof str === 'string' && uriRegex.test(str)
}

_.join = function (base) {
  return (base || '') + (slice.call(arguments, 1)
    .filter(function (part) { return typeof part === 'string' && part.length > 0 })
    .join(''))
}

_.extend = objIterator(extender)

_.merge = objIterator(merger)

function extender(target, key, value) {
  target[key] = value
}

function objIterator(iterator) {
  return function (target) {
    _.each(slice.call(arguments, 1), iterateEachArgument(target, iterator))
    return target
  }
}

function iterateEachArgument(target, iterator) {
  return function (obj) {
    if (_.isObj(obj)) {
      _.each(obj, function (key, value) {
        iterator(target, key, value)
      })
    }
  }
}

function merger(target, key, value) {
  if (_.isObj(value) && _.isObj(target[key])) {
    _.merge(target[key], value)
  } else {
    extender(target, key, value)
  }
}

},{}],19:[function(require,module,exports){

},{}],20:[function(require,module,exports){
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

},{}]},{},[9])(9)
});