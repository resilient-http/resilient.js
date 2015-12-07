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
