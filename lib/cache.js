var _ = require('./utils')

module.exports = Cache

function Cache () {
  this.store = Object.create(null)
}

Cache.prototype.flush = function (key) {
  if (key) {
    this.store[key] = null
  } else {
    this.store = _.emptyObject()
  }
}

Cache.prototype.get = function (key) {
  return key ? this.store[key] : _.clone(this.store)
}

Cache.prototype.set = function (key, data) {
  if (key) {
    this.store[key] = { data: data, time: _.now() }
  }
}

Cache.prototype.time = function (key) {
  var value = this.store[key]
  return value ? value.time : null
}

Cache.prototype.exists = function (key) {
  var value = this.store[key]
  return _.isObj(value) && (
    (_.isArr(value.data) && value.data.length > 0) ||
    _.isObj(value.data)) ||
    false
}
