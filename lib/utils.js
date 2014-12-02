var _ = exports
var toStr = Object.prototype.toString
var slice = Array.prototype.slice
var hasOwn = Object.prototype.hasOwnProperty
var bind = Function.prototype.bind
var isArrayNative = Array.isArray
var uriRegex = /^http[s]?\:\/\/(.+)/i

_.noop = function noop() {}

_.now = function () {
  return new Date().getTime()
}

_.emptyObject = function () {
  return Object.create(null)
}

_.isObj = function (o) {
  return o && toStr.call(o) === '[object Object]' || false
}

_.isArr = function (o) {
  return o && isArrayNative ? isArrayNative(o) : toStr.call(o) === '[object Array]' || false
}

_.bind = function (ctx, fn) {
  return bind ? fn.bind(ctx) : function () {
    return fn.apply(ctx, arguments)
  }
}

_.each = function (obj, fn) {
  var i, l
  if (_.isArr(obj))
    for (i = 0, l = obj.length; i < l; i += 1) fn(obj[i], i)
  else if (_.isObj(obj))
    for (i in obj) if (hasOwn.call(obj, i)) fn(i, obj[i])
}

_.clone = function (obj) {
  return _.extend({}, obj)
}

_.omit = function (obj, keys) {
  var key, buf = {}
  if (_.isObj(obj)) {
    for (key in obj) if (hasOwn.call(obj, key)) {
      if (keys.indexOf(key) === -1) buf[key] = obj[key]
    }
  }
  return buf
}

_.delay = function (fn, ms) {
  return setTimeout(fn, ms || 1)
}

_.isURI = function (str) {
  return typeof str === 'string' && uriRegex.test(str)
}

_.join = function (base) {
  return (base || '') + (slice.call(arguments, 1)
    .filter(function (part) { return typeof part === 'string' && part.length > 0 })
    .join(''))
}

_.extend = objIterator(extender)

_.merge = objIterator(merger)

function extender(target, key, value) {
  target[key] = value
}

function objIterator(iterator) {
  return function (target) {
    _.each(slice.call(arguments, 1), iterateEachArgument(target, iterator))
    return target
  }
}

function iterateEachArgument(target, iterator) {
  return function (obj) {
    if (_.isObj(obj)) {
      _.each(obj, function (key, value) {
        iterator(target, key, value)
      })
    }
  }
}

function merger(target, key, value) {
  if (_.isObj(value) && _.isObj(target[key])) {
    _.merge(target[key], value)
  } else {
    extender(target, key, value)
  }
}
