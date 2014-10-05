/*! resilient - v0.1 - MIT License - https://github.com/resilient-http/resilient.js */
!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.resilient=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*! lil-http - v0.1 - MIT License - https://github.com/lil-js/http */
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
  var VERSION = '0.1.7'
  var toStr = Object.prototype.toString
  var slicer = Array.prototype.slice
  var hasOwn = Object.prototype.hasOwnProperty
  var origin = location.origin
  var originRegex = /^(http[s]?:\/\/[a-z0-9\-\.\:]+)[\/]?/i
  var hasDomainRequest = typeof XDomainRequest !== 'undefined'

  var defaults = {
    method: 'GET',
    timeout: 30 * 1000,
    auth: null,
    headers: null,
    async: true,
    withCredentials: false,
    responseType: 'text'
  }

  function isObj(o) {
    return o && toStr.call(o) === '[object Object]'
  }

  function isArr(o) {
    return o && toStr.call(o) === '[object Array]'
  }

  function extend(target) {
    var i, l, x, cur, args = slicer.call(arguments).slice(1)
    for (i = 0, l = args.length; i < l; i += 1) {
      cur = args[i]
      for (x in cur) if (hasOwn.call(cur, x)) target[x] = cur[x]
    }
    return target
  }

  function setHeaders(xhr, headers) {
    if (isObj(headers)) {
      headers['Content-Type'] = headers['Content-Type'] || http.defaultContent
      for (var field in headers) {
        xhr.setRequestHeader(field, headers[field])
      }
    }
  }

  function getHeaders(xhr) {
    var map = {}, headers = xhr.getAllResponseHeaders().split('\n')
    headers.forEach(function (header) {
      if (header) {
        header = header.split(':')
        map[header[0].trim()] = (header[1] || '').trim()
      }
    })
    return map
  }

  function parseData(xhr) {
    var data, contentType = xhr.getResponseHeader('Content-Type')
    if (xhr.responseType === 'text') {
      data = xhr.responseText
      if (contentType === 'application/json' && data) data = JSON.parse(data)
    } else {
      data = xhr.response
    }
    return data
  }

  function buildResponse(xhr) {
    return {
      xhr: xhr,
      status: xhr.status,
      data: parseData(xhr),
      headers: getHeaders(xhr)
    }
  }

  function buildErrorResponse(xhr, error) {
    var response = new Error(error.message)
    extend(response, buildResponse(xhr))
    response.error = error
    response.stack = error.stack
    return response
  }

  function onError(xhr, cb) {
    var called = false
    return function (err) {
      if (!called) {
        cb(buildErrorResponse(xhr, err), null)
        called = true
      }
    }
  }

  function onLoad(xhr, cb) {
    return function () {
      if (xhr.readyState === 4) {
        if (xhr.status >= 200 && xhr.status < 400) {
          cb(null, buildResponse(xhr))
        } else {
          cb(buildResponse(xhr), null)
        }
      }
    }
  }

  function isCrossOrigin(url) {
    var match = url.match(originRegex)
    return match && match[1] === origin
  }

  function createClient(config) {
    var xhr = null
    var method = (config.method || 'GET').toUpperCase()
    var auth = config.auth || {}
    var url = config.url

    if (hasDomainRequest && isCrossOrigin(url)) {
      xhr = new XDomainRequest()
    } else {
      xhr = new XMLHttpRequest()
    }

    xhr.open(method, url, config.async, auth.user, auth.password)
    xhr.withCredentials = config.withCredentials
    xhr.responseType = config.responseType
    xhr.timeout = config.timeout
    setHeaders(xhr, config.headers)
    return xhr
  }

  function updateProgress(xhr, cb) {
    return function (ev) {
      if (evt.lengthComputable) {
        cb(ev, evt.loaded / evt.total)
      } else {
        cb(ev)
      }
    }
  }

  function request(config, cb, progress) {
    var xhr = createClient(config)
    var data = isObj(config.data) || isArr(config.data) ? JSON.stringify(config.data) : config.data
    var errorHandler = onError(xhr, cb)

    xhr.onload = onLoad(xhr, cb)
    xhr.onerror = errorHandler
    xhr.ontimeout = errorHandler
    xhr.onabort = errorHandler
    if (typeof progress === 'function') xhr.onprogress = updateProgress(xhr, progress)

    try {
      xhr.send(data)
    } catch (e) {
      errorHandler(e)
    }

    return { xhr: xhr, config: config }
  }

  function requestFactory(method) {
    return function (url, options, cb, progress) {
      var i, l, cur = null
      var config = extend({}, defaults, { method: method })
      var args = slicer.call(arguments)

      for (i = 0, l = args.length; i < l; i += 1) {
        cur = args[i]
        if (typeof cur === 'function') {
          cb = cur
          if (cb !== cur) progress = cur
        } else if (isObj(cur)) {
          extend(config, cur)
        } else if (typeof cur === 'string' && !config.url) {
          config.url = cur
        }
      }

      if (typeof cb !== 'function')
        throw new TypeError('callback function argument is required')

      return request(config, cb, progress)
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

Cache.prototype.set = function (key, data) {
  if (key && data) {
    this.store[key] = { data: data, time: _.now() }
  }
}

},{"./utils":16}],3:[function(require,module,exports){
var _ = require('./utils')
var resolver = require('./resolver')
var http = require('./http')

module.exports = Client

function Client(resilient) {
  this._resilient = resilient
}

Client.prototype.send = function (path, options, cb, method) {
  var args = normalizeArgs.call(this, path, options, cb, method)
  if (isFullUrl(args[0])) {
    return plainHttp.apply(null, args)
  } else {
    return resolver.apply(null, [ this._resilient ].concat(args))
  }
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

Client.prototype.del = function (path, options, cb) {
  return this.send(path, options, cb, 'DELETE')
}

Client.prototype.patch = function (path, options, cb) {
  return this.send(path, options, cb, 'PATCH')
}

Client.prototype.head = function (path, options, cb) {
  return this.send(path, options, cb, 'HEAD')
}

function normalizeArgs(path, options, cb, method) {
  if (typeof options === 'function') {
    cb = options
    options = arguments[1]
  }
  options = mergeHttpOptions.call(this, options)
  if (typeof path === 'string') options.path = path
  if (typeof method === 'string') options.method = method
  if (typeof cb !== 'function') cb = _.noop
  return [ options, cb ]
}

function mergeHttpOptions(options) {
  var defaults = this._resilient.getHttpOptions()
  return _.extend(defaults, options)
}

function isFullUrl(options) {
  return options && (_.isURI(options.path) || _.isURI(options.url)) || false
}

function plainHttp(options, cb) {
  options.url = options.path
  return http.call(null, options, cb)
}

},{"./http":8,"./resolver":13,"./utils":16}],4:[function(require,module,exports){
var defaults = module.exports = {}

defaults.service = {
  method: 'GET',
  timeout: 2 * 1000,
  servers: null,
  retry: 0,
  updateOnRetry: true,
  refresh: 60 * 1000
}

defaults.balancer = {
  enable: true,
  weight: {
    request: 25,
    error: 50,
    latency: 25
  }
}

defaults.discovery = {
  servers: null,
  method: 'GET',
  cache: true,
  retry: 0,
  retryWait: 1000,
  timeout: 2 * 1000,
  parallel: false,
  updateOnRetry: false,
  cacheExpiration: 60 * 10 * 1000
}

defaults.resilientOptions = [
  'servers',
  'retry',
  'retryWait',
  'parallel',
  'cacheExpiration',
  'cache',
  'refresh',
  'updateOnRetry'
]

},{}],5:[function(require,module,exports){
var _ = require('./utils')
var ResilientError = require('./error')
var Servers = require('./servers')
var Requester = require('./requester')
var DiscoveryServers = require('./discovery-servers')

module.exports = DiscoveryResolver

function DiscoveryResolver(resilient) {
  function getOptions() {
    return resilient.getOptions('discovery')
  }

  function getServers() {
    return getOptions().servers()
  }

  function isUpdating() {
    return resilient._updating
  }

  function hasDiscoveryServers() {
    var servers = getServers()
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
      Requester(resilient)(getServers(), options, onUpdateServers(cb))
    }
  }

  function updateServersInParallel(options, cb) {
    var buf = [], servers = getServers().sort()
    servers.slice(0, 3).forEach(function (server, index) {
      server = [ server ]
      if (index === 2 && servers.length > 3) {
        server = server.concat(servers.slice(3))
      }
      options.retry = 0
      Requester(resilient)(new Servers(server), options, onUpdateInParallel(index, buf, cb), buf)
    })
  }

  function onUpdateInParallel(index, buf, cb) {
    return function (err, res) {
      if (err) buf[index] = null
      if (res || isEmptyBuffer(buf)) {
        onUpdateServers(cb, buf)(err, res)
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

DiscoveryResolver.update = function (resilient, cb) {
  DiscoveryResolver(resilient)
    (DiscoveryServers(resilient)
      (cb))
}

DiscoveryResolver.fetch = function (resilient, cb) {
  DiscoveryResolver(resilient)(function (err, res) {
    if (err) cb(err)
    else {
      if (res && res.data) cb(null, res.data)
      else cb(new ResilientError(1001, res))
    }
  })
}

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

},{"./discovery-servers":6,"./error":7,"./requester":11,"./servers":15,"./utils":16}],6:[function(require,module,exports){
var _ = require('./utils')
var ResilientError = require('./error')

module.exports = DiscoveryServers

function DiscoveryServers(resilient) {
  function defineServers(cb) {
    return function (err, res) {
      if (!err && isValidResponse(res)) {
        setServers(res, cb)
      } else {
        handlerError(err, cb)
      }
    }
  }

  function setServers(res, cb) {
    if (res.data.length) {
      resilient.setServers(res.data)
      refreshCache(res.data)
      cb(null, res)
    } else {
      cb(new ResilientError(1004, res))
    }
  }

  function handlerError(err, cb) {
    if (isCacheEnabled()) {
      getFromCache(err, cb)
    } else {
      resolveWithError(err, cb)
    }
  }

  function getFromCache(err, cb) {
    var expiration, cache = getCache()
    if (cache && _.isArr(cache.data)) {
      expiration = resilient.getOptions('discovery').cacheExpiration
      if ((_.now() - cache.time) > expiration) {
        //resilient.setServers(cache.data)
        cb(null, { status: 200, _cache: true, data: cache.data })
      } else {
        resilient._cache.flush('discovery')
        resolveWithError(err, cb)
      }
    } else {
      resolveWithError(err, cb)
    }
  }

  function refreshCache(data) {
    if (isCacheEnabled()) {
      resilient._cache.set('discovery', data)
    }
  }

  function isCacheEnabled() {
    return resilient.getOptions('discovery').cache
  }

  function getCache() {
    return resilient._cache.get('discovery')
  }

  return defineServers
}

function resolveWithError(err, cb) {
  err = err || { status: 1000 }
  return cb(new ResilientError(err.status, err))
}

function isValidResponse(res) {
  return res && _.isArr(res.data) || false
}

},{"./error":7,"./utils":16}],7:[function(require,module,exports){
module.exports = ResilientError

var MESSAGES = {
  1000: 'All requests failed. No servers available',
  1001: 'Cannot update discovery servers. Empty or invalid response body',
  1002: 'Missing discovery servers. Cannot resolve the server',
  1003: 'Cannot resolve servers. Missing data',
  1004: 'Discovery server response is invalid or empty',
  1005: 'Missing discovery servers during retry process',
  1006: 'Internal state error'
}

function ResilientError(status, error) {
  if (error instanceof Error) {
    Error.call(this, error)
    this.error = error
    if (error.code) this.code = error.code
    if (error.stack) this.stack = error.stack
  } else if (error) {
    this.request = error
  }
  this.status = status || 1000
  this.message = MESSAGES[this.status]
}

ResilientError.prototype = Object.create(Error.prototype)

ResilientError.MESSAGES = MESSAGES

},{}],8:[function(require,module,exports){
var http = resolveModule()

module.exports = client

function client() {
  return http.apply(null, arguments)
}

function resolveModule() {
  if (typeof window === 'object' && window) {
    return require('../bower_components/lil-http/http')
  } else {
    return requestWrapper(require('request'))
  }
}

function requestWrapper(request) {
  return function (options, cb) {
    if (options && options.data) {
      options.body = options.data
    }
    return request.call(null, options, mapResponse(cb))
  }
}

function mapResponse(cb) {
  return function (err, res, body) {
    if (res) {
      res.status = res.statusCode
      if (body) {
        res.data = isJSONContent(res) ? JSON.parse(body) : body
      }
    }
    cb(err, res)
  }
}

function isJSONContent(res) {
  return res.headers['content-type'] === 'application/json'
}

},{"../bower_components/lil-http/http":1,"request":17}],9:[function(require,module,exports){
var Resilient = require('./resilient')
var Options = require('./options')
var defaults = require('./defaults')
var Servers = require('./servers')
var http = require('./http')

module.exports = ResilientFactory

function ResilientFactory(options) {
  return new Resilient(options)
}

ResilientFactory.VERSION = '0.1.0-beta.0'
ResilientFactory.defaults = defaults
ResilientFactory.Options = Options
ResilientFactory.Servers = Servers
ResilientFactory.request = http

},{"./defaults":4,"./http":8,"./options":10,"./resilient":12,"./servers":15}],10:[function(require,module,exports){
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

Options.prototype.getRaw = function () {
  var buf = {}, options = this.get()
  if (options) {
    _.each(options, function (key, value) {
      if (value instanceof Options) {
        buf[key] = value.get()
      }
    })
  }
  return buf
}

Options.prototype.set = function (key, value) {
  if (_.isObj(key)) {
    _.each(key, _.bind(this, this.set))
  } else if (value !== undefined) {
    if (key === 'servers') {
      this.setServers(value)
    } else {
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
  return Options.define(this.getRaw())
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

},{"./defaults":4,"./servers":15,"./utils":16}],11:[function(require,module,exports){
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
      if (options.updateOnRetry) {
        resilient._updating = false
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
      var discovery = resilient.discoveryServers()
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

},{"./discovery-servers":6,"./error":7,"./http":8,"./utils":16}],12:[function(require,module,exports){
var _ = require('./utils')
var Options = require('./options')
var Client = require('./client')
var Cache = require('./cache')
var DiscoveryResolver = require('./discovery-resolver')

var VERBS = ['get', 'post', 'put', 'del', 'head', 'patch']

module.exports = Resilient

function Resilient(options) {
  this._queue = []
  this._updating = false
  this._client = new Client(this)
  this._cache = new Cache()
  this.setOptions(options)
}

Resilient.prototype.setOptions = function (type, options) {
  var store = null
  if (type && _.isObj(options)) {
    store = this.options.get(type)
    if (store instanceof Options) store.set(options)
  } else {
    this.options = Options.define(type)
  }
}

Resilient.prototype.setDiscoveryOptions = function (options) {
  this.setOptions('discovery', options)
  return this
}

Resilient.prototype.setServiceOptions = function (options) {
  this.setOptions('service', options)
  return this
}

Resilient.prototype.getOptions = function (type) {
  return type ? this.options.get(type) : this.options
}

Resilient.prototype.getHttpOptions = function (type) {
  var options = this.options.get(type || 'service')
  if (options) return options.http()
}

Resilient.prototype.getServers = function (type) {
  var options = this.options.get(type || 'service')
  if (options) return options.servers()
}

Resilient.prototype.discoveryServers = function (list) {
  if (_.isArr(list)) {
    this.options.get('discovery').servers(list)
  } else {
    return this.getServers('discovery')
  }
}

Resilient.prototype.setServers = function (list) {
  this.options.get('service').servers(list)
  return this
}

Resilient.prototype.discoverServers = function (cb) {
  DiscoveryResolver.fetch(this, cb)
  return this
}

Resilient.prototype.updateServers = function (cb) {
  DiscoveryResolver.update(this, cb || _.noop)
  return this
}

Resilient.prototype.flushCache = function () {
  this._cache.flush()
  return this
}

Resilient.prototype.areServersUpdated = function () {
  return this.getServers('service').lastUpdate() < (this.getOptions('service').get('refresh') || 0)
}

Resilient.prototype.balancer = function () {
  return this.getOptions('balancer')
}

Resilient.prototype.send = Resilient.prototype.http = function (path, options, cb) {
  return this._client.send(path, options, cb)
}

VERBS.forEach(defineMethodProxy)

function defineMethodProxy(verb) {
  Resilient.prototype[verb] = function (path, options, cb) {
    return this._client[verb](path, options, cb)
  }
}

},{"./cache":2,"./client":3,"./discovery-resolver":5,"./options":10,"./utils":16}],13:[function(require,module,exports){
var _ = require('./utils')
var ResilientError = require('./error')
var Requester = require('./requester')
var DiscoveryResolver = require('./discovery-resolver')
var Servers = require('./servers')

module.exports = Resolver

function Resolver(resilient, options, cb) {
  try {
    resolve(resolver)
  } catch (err) {
    cb(new ResilientError(1006, err))
  }

  function resolve(next) {
    if (hasServers()) {
      next()
    } else {
      if (hasServers('discovery')) {
        DiscoveryResolver.update(resilient, next)
      } else {
        next(new ResilientError(1002))
      }
    }
  }

  function hasServers(type) {
    var servers, valid = false
    type = type || 'service'
    servers = resilient.getServers(type)
    if (servers && servers.exists()) {
      valid = type !== 'discovery' ? isUpToDate(servers, type) : true
    }
    return valid
  }

  function isUpToDate(servers, type) {
    return servers.lastUpdate() < (resilient.getOptions(type).get('refresh') || 0)
  }

  function resolver(err, res) {
    if (err) {
      cb(err)
    } else {
      handleResolution(res)
    }
  }

  function handleResolution(res) {
    var servers = resilient.getServers()
    if (res && res._cache) {
      servers = new Servers(res.data)
    } else if (!hasServers()) {
      return cb(new ResilientError(1003))
    }
    Requester(resilient)(servers, options, cb)
  }
}

},{"./discovery-resolver":5,"./error":7,"./requester":11,"./servers":15,"./utils":16}],14:[function(require,module,exports){
var _ = require('./utils')
var defaults = require('./defaults')

module.exports = Server

function Server(url, options) {
  this.url = url
  this.setStats()
  this.setOptions(options)
}

Server.prototype.report = function (operation, latency, type) {
  var stats = this.getStats(operation)
  if (stats) {
    stats[type || 'request'] += 1
    if (latency) {
      stats.latency = calculateAvgLatency(latency, stats)
    }
  }
}

Server.prototype.reportError = function (operation, latency) {
  this.report(operation, latency, 'error')
}

Server.prototype.getBalance = function (operation) {
  var stats = this.getStats(operation)
  var total = stats.request + stats.error
  var weight = this.options.weight
  var balance = total === 0 ? 0 : round(
    (((stats.request * 100 / total) * weight.request) +
    ((stats.error * 100 / total) * weight.error) +
    (stats.latency * weight.latency)) / 100)
  return balance
}

Server.prototype.getStats = function (operation, field) {
  var stats = this.stats[operation || 'read']
  if (stats && field) stats = stats[field]
  return stats
}

Server.prototype.setOptions = function (options) {
  this.options = _.extend({}, defaults.balancer, options)
}

Server.prototype.setStats = function (stats) {
  this.stats = stats || {
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

function calculateAvgLatency(latency, stats) {
  return round((latency + stats.latency) / (stats.request + stats.error))
}

function round(number) {
  return Math.round(number * 100) / 100
}

},{"./defaults":4,"./utils":16}],15:[function(require,module,exports){
var _ = require('./utils')
var Server = require('./server')

module.exports = Servers

function Servers(servers) {
  this.servers = []
  this.updated = 0
  this.set(servers)
}

Servers.prototype.sort = function (operation) {
  return this.servers.slice(0).sort(function (x, y) {
    return x.getBalance(operation) - y.getBalance(operation)
  })
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
  return this.servers.length > 0
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

},{"./server":14,"./utils":16}],16:[function(require,module,exports){
var _ = exports
var toStr = Object.prototype.toString
var slice = Array.prototype.slice
var hasOwn = Object.prototype.hasOwnProperty
var bind = Function.prototype.bind
var isArrayNative = Array.isArray
var uriRegex = /^http[s]?\:\/\/(.+)/i

_.noop = function () {}

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

_.extend = function (target) {
  var args = slice.call(arguments, 1)
  _.each(args, function (obj) {
    if (_.isObj(obj)) {
      _.each(obj, function (key, value) {
        target[key] = value
      })
    }
  })
  return target
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

},{}],17:[function(require,module,exports){

},{}]},{},[9])(9)
});