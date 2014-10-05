var _ = require('./utils')
var Servers = require('./servers')

module.exports = Cache

function Cache(data) {
  this.set(data)
}

Cache.prototype.get = function (key) {
  return key ? this.store[key] : this.store
}

Cache.prototype.set = function (key, value) {
  var self = this
  if (value) {
    this.store[key] = { data: value, updated: _.now() }
  } else if (_.isObj(key)) {
    Object.keys(_.extend({}, key)).forEach(function (name) {
      self.set(name, key[name])
    })
  }
}
