var _ = require('./utils')
var midware = require('midware')

var hooks = ['in', 'out']

module.exports = Middleware

function Middleware () {
  this.pool = createPool()
}

Middleware.prototype.use = function (resilient, args) {
  var pool = this.pool
  var middlewares = _.toArr(args)

  middlewares
    .filter(_.isFn)
    .map(passArgs(resilient))
    .forEach(register(pool))
}

Middleware.prototype.run = function (type, hook) {
  return this.pool[type][hook].run
}

function createPool () {
  return {
    discovery: hooksMiddleware(),
    service: hooksMiddleware()
  }
}

function hooksMiddleware () {
  return { 'in': midware(), 'out': midware() }
}

function passArgs (resilient) {
  return function (mw) {
    var type = mw.type || 'service'
    var opts = resilient.options(type)
    return { type: type, handler: mw(opts, resilient) }
  }
}

function register (pool) {
  return function (mw) {
    var hook = 'in'
    var handler = mw.handler

    if (_.isFn(handler)) {
      if (handler.hook === 'out') {
        hook = 'out'
      }
      pool[mw.type][hook](handler)
    }

    if (_.isObj(handler)) {
      hooks
        .filter(function (key) {
          return _.isFn(handler[key])
        })
        .forEach(function (key) {
          pool[mw.type][key](handler[key])
        })
    }
  }
}
