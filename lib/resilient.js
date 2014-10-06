var _ = require('./utils')
var Options = require('./options')
var Client = require('./client')
var Cache = require('./cache')
var DiscoveryResolver = require('./discovery-resolver')
var EventBus = require('lil-event')

var VERBS = ['get', 'post', 'put', 'del', 'head', 'patch']

module.exports = Resilient

function Resilient(options) {
  this._queue = []
  this._updating = false
  this._client = new Client(this)
  this._cache = new Cache()
  this.setOptions(options)
}

Resilient.prototype = Object.create(EventBus.prototype)

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

Resilient.prototype.client = function () {
  return this._client
}

Resilient.prototype.send = Resilient.prototype.request = function (path, options, cb) {
  return this._client.send(path, options, cb)
}

VERBS.forEach(defineMethodProxy)

function defineMethodProxy(verb) {
  Resilient.prototype[verb] = function (path, options, cb) {
    return this._client[verb](path, options, cb)
  }
}
