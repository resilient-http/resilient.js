var _ = require('./utils')
var resolver = require('./resolver')
var http = require('./http')

module.exports = Client

function Client(resilient) {
  this._resilient = resilient
}

Client.prototype.send = function (path, options, cb, method) {
  var args = normalizeArgs.call(this, path, options, cb, method)
  requester.apply(this, args)
  return this
}

Client.prototype.get = function (path, options, cb) {
  return this.send(path, options, cb, 'GET')
}

Client.prototype.post = function (path, options, cb) {
  return this.send(path, options, cb, 'POST')
}

Client.prototype.put = function (path, options, cb) {
  return this.send(path, options, cb, 'PUT')
}

Client.prototype.delete = Client.prototype.del = function (path, options, cb) {
  return this.send(path, options, cb, 'DELETE')
}

Client.prototype.patch = function (path, options, cb) {
  return this.send(path, options, cb, 'PATCH')
}

Client.prototype.head = function (path, options, cb) {
  return this.send(path, options, cb, 'HEAD')
}

function requester(options, cb) {
  this._resilient.emit('request:start', options, this._resilient)
  return isFullUrlSchema(options)
    ? plainHttpRequest(this._resilient, options, cb)
    : resolver(this._resilient, options, cb)
}

function normalizeArgs(path, options, cb, method) {
  if (typeof options === 'function') {
    cb = options
    options = arguments[0]
  }
  options = mergeHttpOptions(this._resilient, _.isObj(options) ? options : {})
  if (typeof path === 'string') options.path = path
  if (typeof method === 'string') options.method = method
  if (typeof cb !== 'function') cb = _.noop
  return [ options, wrapCallback(this._resilient, cb) ]
}

function wrapCallback(resilient, cb) {
  return _.once(function finalRequestHandler(err, res) {
    resilient.emit('request:finish', err, res, resilient)
    cb(err, res)
  })
}

function mergeHttpOptions(resilient, options) {
  var defaults = resilient.options('service').get()
  if (options.timeout) options.$timeout = options.timeout
  return _.merge(defaults, options)
}

function isFullUrlSchema(options) {
  return options && (_.isURI(options.path) || _.isURI(options.url)) || false
}

function plainHttpRequest(resilient, options, cb) {
  if (options.path) {
    options.url = options.path
    options.path = null
  }
  return (resilient._httpClient || http).call(null, options, cb)
}
