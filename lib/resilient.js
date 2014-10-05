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
