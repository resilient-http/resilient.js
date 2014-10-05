var _ = require('./utils')

module.exports = Cache

function Cache(resilient) {
  this._resilient = resilient
  this.buf = {}
}

Cache.prototype.flush = function () {
  this.buf = {}
}

Cache.prototype.get = function (key) {
  return key ? this.buf[key] : this.buf
}

Cache.prototype.set = function (key, value) {
  var self = this
  if (value) {
    this.buf[key] = { data: value, updated: _.now() }
  } else if (_.isObj(key)) {
    Object.keys(_.extend({}, key)).forEach(function (name) {
      self.set(name, key[name])
    })
  }
}
