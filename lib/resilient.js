var _ = require('./utils')
var Options = require('./options')
var Client = require('./client')
var Cache = require('./cache')

var VERBS = ['get', 'post', 'put', 'del', 'head', 'patch']

module.exports = Resilient

function Resilient(options) {
  this._queue = []
  this._updating = false
  this._client = new Client(this)
  this._cache = new Cache(this)
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

Resilient.prototype.balancer = function (options) {
  return this.getOptions('balancer')
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

Resilient.prototype.getDiscoveryServers = function () {
  return this.getServers('discovery')
}

Resilient.prototype.setDiscoveryServers = function (list) {
  this.options.get('discovery').servers(list)
  return this
}

Resilient.prototype.setServers = function (list) {
  this.options.get('service').servers(list)
  return this
}

Resilient.prototype.flushCache = function () {
  this._cache.flush()
  return this
}

Resilient.prototype.areServersUpdated = function (type) {
  if (type === 'discovery') {
    return true
  } else {
    return this.getServers(type).lastUpdate() < (this.getOptions(type).get('refresh') || 0)
  }
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
