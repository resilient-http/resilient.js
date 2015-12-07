var _ = exports
var toStr = Object.prototype.toString
var slice = Array.prototype.slice
var hasOwn = Object.prototype.hasOwnProperty
var bind = Function.prototype.bind
var isArrayNative = Array.isArray
var uriRegex = /^http[s]?\:\/\/(.+)/i

exports.noop = function () {}

exports.now = function () {
  return new Date().getTime()
}

exports.emptyObject = function () {
  return Object.create(null)
}

exports.isObj = function (o) {
  return o && toStr.call(o) === '[object Object]' || false
}

exports.isArr = function (o) {
  return o && isArrayNative
    ? isArrayNative(o)
    : toStr.call(o) === '[object Array]'
}

exports.isFn = function (o) {
  return typeof o === 'function'
}

exports.bind = function (ctx, fn) {
  return bind ? fn.bind(ctx) : function () {
    return fn.apply(ctx, arguments)
  }
}

exports.each = function (obj, fn) {
  var i = null
  var l = 0
  if (_.isArr(obj)) {
    for (i = 0, l = obj.length; i < l; i += 1) fn(obj[i], i)
  } else if (_.isObj(obj)) {
    for (i in obj) if (hasOwn.call(obj, i)) fn(i, obj[i])
  }
}

exports.clone = function (obj) {
  return _.extend({}, obj)
}

exports.omit = function (obj, keys) {
  var key = null
  var buf = {}
  if (_.isObj(obj)) {
    for (key in obj) if (hasOwn.call(obj, key)) {
      if (keys.indexOf(key) === -1) buf[key] = obj[key]
    }
  }
  return buf
}

exports.delay = function (fn, ms) {
  return setTimeout(fn, ms || 1)
}

exports.isURI = function (str) {
  return typeof str === 'string' && uriRegex.test(str)
}

exports.join = function (base) {
  return (base || '') +
  (_.toArr(arguments, 1)
    .filter(notEmpty)
    .join(''))
}

function notEmpty (str) {
  return typeof str === 'string' && str.length > 0
}

exports.toArr = function (args, index) {
  return slice.call(args, +index || 0)
}

exports.extend = objIterator(extender)

exports.merge = objIterator(merger)

function extender (target, key, value) {
  target[key] = value
}

function objIterator (iterator) {
  return function (target) {
    var args = _.toArr(arguments, 1)
    _.each(args, eachArgument(target, iterator))
    return target
  }
}

function eachArgument (target, iterator) {
  return function (obj) {
    if (_.isObj(obj)) {
      _.each(obj, function (key, value) {
        iterator(target, key, value)
      })
    }
  }
}

function merger (target, key, value) {
  if (_.isObj(value) && _.isObj(target[key])) {
    _.merge(target[key], value)
  } else {
    extender(target, key, value)
  }
}
