var _ = require('./utils')

module.exports = Cache

function Cache() {
  this.store = {}
}

Cache.prototype.flush = function (key) {
  if (key) {
    this.store[key] = null
  } else {
    this.store = {}
  }
}

Cache.prototype.get = function (key) {
  return key ? this.store[key] : _.clone(this.store)
}

Cache.prototype.time = function (key) {
  if (key && this.store[key]) {
    return this.store[key].time
  }
}

Cache.prototype.exists = function (key) {
  var value = this.store[key]
  return _.isObj(value)
    && ((_.isArr(value.data) && value.data.length > 0)
    || _.isObj(value.data))
    || false
}

Cache.prototype.set = function (key, data) {
  if (key && data) {
    this.store[key] = { data: data, time: _.now() }
  }
}
