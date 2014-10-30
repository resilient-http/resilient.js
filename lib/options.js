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
    if (key === 'servers' || key === 'refreshServers') {
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
