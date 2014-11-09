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
  } else if (typeof type === 'string') {
    return this._options.get(type)
  } else {
    return this._options.get()
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

var VERBS = ['get', 'post', 'put', 'del', 'delete', 'head', 'patch']
VERBS.forEach(defineMethodProxy)

function defineMethodProxy(verb) {
  Resilient.prototype[verb] = function (path, options, cb) {
    return this._client[verb](path, options, cb)
  }
}

function updateServers(resilient, method, options, cb) {
  if (typeof options === 'function') {
    cb = options
    options = null
  }
  DiscoveryResolver[method](resilient, options, cb || _.noop)
  return resilient
}
