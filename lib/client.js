var _ = require('./utils')
var resolver = require('./resolver')
var http = require('./http')

module.exports = Client

function Client(resilient) {
  this._resilient = resilient
}

Client.prototype.send = function (path, options, cb, method) {
  var args = normalizeArgs.call(this, path, options, cb, method)
  this._resilient.emit('request:start', args[0], this._resilient)
  requester.apply(this, args)
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

Client.prototype.del = function (path, options, cb) {
  return this.send(path, options, cb, 'DELETE')
}

Client.prototype.patch = function (path, options, cb) {
  return this.send(path, options, cb, 'PATCH')
}

Client.prototype.head = function (path, options, cb) {
  return this.send(path, options, cb, 'HEAD')
}

function requester(options, cb) {
  if (isFullUrl(options)) {
    return plainHttpRequest(options, cb)
  } else {
    return resolver(this._resilient, options, cb)
  }
}

function normalizeArgs(path, options, cb, method) {
  if (typeof options === 'function') {
    cb = options
    options = arguments[0]
  }
  options = mergeHttpOptions.call(this, options)
  if (typeof path === 'string') options.path = path
  if (typeof method === 'string') options.method = method
  if (typeof cb !== 'function') cb = _.noop
  return [ options, wrapCallback(this._resilient, cb) ]
}

function wrapCallback(resilient, cb) {
  return _.once(function (err, res) {
    resilient.emit('request:finish', err, res, resilient)
    cb(err, res)
  })
}

function mergeHttpOptions(options) {
  var defaults = this._resilient.getOptions('service').get()
  return _.merge(defaults, options)
}

function isFullUrl(options) {
  return options && (_.isURI(options.path) || _.isURI(options.url)) || false
}

function plainHttpRequest(options, cb) {
  options.url = options.path
  return http.call(null, options, cb)
}
