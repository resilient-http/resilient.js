var _ = require('./utils')
var ResilientError = require('./error')

module.exports = DiscoveryServers

function DiscoveryServers(resilient) {
  function defineServers(cb) {
    return function (err, res) {
      if (err) {
        handlerError(err, cb)
      } else if (isValidResponse(res)) {
        saveServers(res, cb)
      } else {
        cb(new ResilientError(1004, res))
      }
    }
  }

  function saveServers(res, cb) {
    var data = res.data
    emit('refresh', data)
    resilient.setServers(data)
    refreshCache(data)
    cb(null, res)
  }

  function handlerError(err, cb) {
    if (isCacheEnabled()) {
      resolveFromCache(err, cb)
    } else {
      resolveWithError(err, cb)
    }
  }

  function resolveFromCache(err, cb) {
    var cache = getCache()
    if (hasValidCache(cache)) {
      cb(null, { status: 200, _cache: true, data: cache.data })
    } else {
      resolveWithError(err, cb)
    }
  }

  function hasValidCache(cache) {
    var valid = false, expires = resilient.getOptions('discovery').cacheExpiration
    return cache && _.isArr(cache.data) && (_.now() - cache.time) > expires || false
  }

  function refreshCache(data) {
    if (isCacheEnabled()) {
      emit('cache', data)
      resilient._cache.set('discovery', data)
    }
  }

  function isCacheEnabled() {
    return resilient.getOptions('discovery').cache
  }

  function getCache() {
    return resilient._cache.get('discovery')
  }

  function emit(name, data) {
    resilient.emit('discovery.' + name, data, resilient)
  }

  return defineServers
}

function resolveWithError(err, cb) {
  err = err || { status: 1000 }
  return cb(new ResilientError(err.status, err))
}

function isValidResponse(res) {
  return (res
    && _.isArr(res.data)
    && res.data.length > 0) || false
}
