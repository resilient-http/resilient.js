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
var requester = require('./requester')

module.exports = Client

function Client(resilient) {
  this._resilient = resilient
}

Client.prototype.send = function (path, options, cb, method) {
  var args = normalizeArgs.call(this, path, options, cb, method)
  return requester.apply(null, [ this._resilient ].concat(args))
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
  options = _.extend(httpDefaults.call(this), options)
  if (typeof path === 'string') options.path = path
  if (typeof method === 'string') options.method = method
  return [ options, cb ]
}

function httpDefaults() {
  return this._resilient.options.get('service').http()
}

},{"./requester":8,"./utils":12}],3:[function(require,module,exports){
var defaults = module.exports = {}

defaults.service = {
  method: 'GET',
  timeout: 2 * 1000,
  servers: null,
  cache: true,
  refresh: 60 * 1000,
  cacheExpiration: 60 * 10 * 1000
}

defaults.balancer = {
  enable: true,
  roundRobin: false,
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
  cacheExpiration: 60 * 10 * 1000
}

defaults.resilientOptions = [
  'servers',
  'retry',
  'retryWait',
  'parallel',
  'cacheExpiration',
  'cache'
]

},{}],4:[function(require,module,exports){
module.exports = ResilientError

var MESSAGES = {
  1000: 'All requests failed. No servers available',
  1001: 'Cannot update discovery servers. Empty or invalid response body',
  1002: 'Missing discovery servers. Cannot resolve the server',
  1003: 'The server list is empty',
  1004: 'Discovery server response is invalid or empty',
  1005: 'Missing discovery servers during retry process'
}

function ResilientError(status, error) {
  if (error instanceof Error) {
    Error.call(this, error)
    this.error = error
    this.code = error.code
  } else if (error) {
    this.request = error
  }
  this.status = status || 1000
  this.message = MESSAGES[this.status]
}

ResilientError.prototype = Object.create(Error.prototype)

ResilientError.MESSAGES = MESSAGES

},{}],5:[function(require,module,exports){
var http = resolveModule()

module.exports = client

function client() {
  return http.apply(null, arguments)
}

function resolveModule() {
  if (typeof window === 'object') {
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

},{"../bower_components/lil-http/http":1,"request":13}],6:[function(require,module,exports){
var Resilient = require('./resilient')
var Client = require('./client')
var Options = require('./options')
var defaults = require('./defaults')

module.exports = ResilientFactory

function ResilientFactory(options) {
  return new Resilient(options)
}

Resilient.VERSION = '0.1.0'
Resilient.defaults = defaults
Resilient.Client = Client
Resilient.Resilient = Resilient
Resilient.Options = Options

},{"./client":2,"./defaults":3,"./options":7,"./resilient":9}],7:[function(require,module,exports){
var _ = require('./utils')
var defaults = require('./defaults')
var Servers = require('./servers')

module.exports = Options

function Options(options, type) {
  this.store = type ? _.clone(defaults[type]) : {}
  this.set(options)
}

Options.prototype.get = function (key) {
  var data = null
  if (key)
    data = this.store[key]
  else
    data = _.clone(this.store)
  return data
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
      this.store[key] = new Servers(value)
    } else {
      this.store[key] = value
    }
  }
}

Options.prototype.http = function () {
  return _.omit(this.store, defaults.resilientOptions)
}

Options.prototype.servers = function (servers) {
  return servers ? this.set('servers', servers) : this.store.servers
}

Options.prototype.clone = function () {
  return Options.define(this.getRaw())
}

Options.define = function (options, defaultOptions) {
  var store = new Options()
  options = _.isObj(options) ? options : {}
  defaultOptions = _.clone(defaultOptions || defaults)
  Object.keys(defaultOptions).forEach(function (type) {
    if (type !== 'resilientOptions') {
      store.set(type, new Options(options[type], type))
    }
  })
  return store
}

},{"./defaults":3,"./servers":11,"./utils":12}],8:[function(require,module,exports){
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

},{"./error":4,"./http":5,"./servers":11,"./utils":12}],9:[function(require,module,exports){
var _ = require('./utils')
var Options = require('./options')
var Client = require('./client')

var VERBS = ['get', 'post', 'put', 'del', 'head', 'patch']

module.exports = Resilient

function Resilient(options) {
  this._queue = []
  this._updating = false
  this._client = new Client(this)
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

Resilient.prototype.setClientOptions = function (options) {
  this.setOptions('client', options)
  return this
}

Resilient.prototype.getOptions = function (type) {
  return type ? this.options.get(type) : this.options
}

Resilient.prototype.getDefaults = function (type) {
  return this.options.get(type || 'service').http()
}

Resilient.prototype.getServers = function () {
  return this.options.get('service').servers()
}

Resilient.prototype.updateServers = function () {
  // to do
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

},{"./client":2,"./options":7,"./utils":12}],10:[function(require,module,exports){
var _ = require('./utils')

module.exports = Server

function Server(url, options) {
  this.url = url
  this.setStats()
  this.setOptions(options)
}

Server.prototype.defaults = {
  weight: {
    request: 25,
    error: 50,
    latency: 25
  }
}

Server.prototype.report = function (operation, type, latency) {
  var stats = this.getStats(operation)
  if (stats) {
    stats[type] += 1
    if (latency) {
      stats.latency = calculateAvgLatency(latency, stats)
    }
  }
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
  this.options = _.extend({}, this.defaults, options)
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

},{"./utils":12}],11:[function(require,module,exports){
var _ = require('./utils')
var Server = require('./server')
var uriRegex = /^http[s]?\:\/\/(.+)/i

module.exports = Servers

function Servers(servers, options) {
  this.servers = []
  this.updated = 0
  this.options = options
  if (_.isArr(servers)) this.set(servers)
}

Servers.prototype.bestAvailable = function (operation) {
  var i, l, servers = this.servers
  var server = servers[0]
  for (i = 1, l = servers.length; i < l; i += 1) {
    if (servers[i].getBalance(operation) < server.getBalance(operation)) {
      server = servers[i]
    }
  }
  return server
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
  this.updated = _.now()
  this.servers = servers
    .filter(isValidURI)
    .map(mapServer(this))
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
  return typeof uri === 'string' && uriRegex.test(uri)
}

function mapServer(self) {
  return function (data) {
    var server
    if (data instanceof Server) {
      server = data
    } else {
      server = self.find(_.isObj(data) ? data.url : data)
      if (!server) server = new Server(data)
    }
    return server
  }
}

},{"./server":10,"./utils":12}],12:[function(require,module,exports){
var _ = exports
var toStr = Object.prototype.toString
var slice = Array.prototype.slice
var hasOwn = Object.prototype.hasOwnProperty
var isArrayNative = Array.isArray
var bind = Function.prototype.bind

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

_.pick = function (obj, keys) {
  var buf = {}
  if (_.isObj(obj)) {
    Object.keys(obj)
      .filter(function (key) {
        return keys.indexOf(key) !== -1
      })
      .forEach(function (key) {
        return buf[key] = obj[key]
      })
  }
  return buf
}

_.delay = function (fn, ms) {
  setTimeout(fn, ms || 1)
}

_.join = function (base) {
  return (base || '') + (slice.call(arguments, 1)
    .filter(function (part) { return typeof part === 'string' && part.length > 0 })
    .join(''))
}


},{}],13:[function(require,module,exports){

},{}]},{},[6])(6)
});