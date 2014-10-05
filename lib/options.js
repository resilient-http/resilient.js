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
