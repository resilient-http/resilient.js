var _ = require('../utils')
var ResilientError = require('../error')

module.exports = ServiceResolve

function ServiceResolve (resilient) {
  var middleware = resilient._middleware
  var options = resilient.options('discovery')

  function isCacheEnabled () {
    return options.get('cacheEnabled')
  }

  function getCache () {
    return resilient.cache.get('servers')
  }

  function emit (name, data) {
    resilient.emit('servers:' + name, data, resilient)
  }

  function saveServers (res, next) {
    var data = res.data
    emit('refresh', data)
    resilient.setServers(data)
    refreshCache(data)
    next(null, res)
  }

  function errorHandler (err, next) {
    if (isCacheEnabled()) {
      resolveFromCache(err, next)
    } else {
      resolveWithError(err, next)
    }
  }

  function resolveFromCache (err, next) {
    var cache = getCache()
    if (hasValidCache(cache)) {
      next(null, { status: 200, _cache: true, data: cache.data })
    } else {
      resolveWithError(err, next)
    }
  }

  function hasValidCache (cache) {
    var expires = options.get('cacheExpiration')
    return cache && _.isArr(cache.data) && (_.now() - cache.time) > expires || false
  }

  function refreshCache (data) {
    if (isCacheEnabled()) {
      emit('cache', data)
      resilient.cache.set('servers', data)
    }
  }

  function handleResponse (err, res, done) {
    if (err) {
      errorHandler(err, done)
    } else if (isValidResponse(res)) {
      saveServers(res, done)
    } else {
      done(new ResilientError(1004, res))
    }
  }

  return function defineServers (done) {
    return function handler (err, res) {
      middleware.run('discovery', 'in')(err, res, function (mErr) {
        handleResponse(err || mErr, res, done)
      })
    }
  }
}

function isValidResponse (res) {
  var valid = false
  if (res) {
    if (_.isArr(res.data) && res.data.length) {
      valid = true
    } else if (typeof res.data === 'string') {
      valid = parseAsJSON(res)
    }
  }
  return valid
}

function parseAsJSON (res) {
  try {
    res.data = JSON.parse(res.data)
    return true
  } catch (e) {
    return false
  }
}

function resolveWithError (err, next) {
  var error = new ResilientError(err.status, err || { status: 1000 })
  return next(error)
}
