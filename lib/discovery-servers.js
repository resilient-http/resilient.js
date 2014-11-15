var _ = require('./utils')
var ResilientError = require('./error')

module.exports = DiscoveryServers

function DiscoveryServers(resilient) {
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
    var valid = false
    var expires = resilient.options('discovery').get('cacheExpiration')
    return cache && _.isArr(cache.data) && (_.now() - cache.time) > expires || false
  }

  function refreshCache(data) {
    if (isCacheEnabled()) {
      emit('cache', data)
      resilient._cache.set('servers', data)
    }
  }

  function isCacheEnabled() {
    return resilient.options('discovery').get('cache')
  }

  function getCache() {
    return resilient._cache.get('servers')
  }

  function emit(name, data) {
    resilient.emit('servers:' + name, data, resilient)
  }

  return function defineServers(cb) {
    return function handler(err, res) {
      if (err) {
        handlerError(err, cb)
      } else if (isValidResponse(res)) {
        saveServers(res, cb)
      } else {
        cb(new ResilientError(1004, res))
      }
    }
  }
}

function resolveWithError(err, cb) {
  err = err || { status: 1000 }
  return cb(new ResilientError(err.status, err))
}

function isValidResponse(res) {
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

function parseAsJSON(res) {
  try {
    res.data = JSON.parse(res.data)
    return true
  } catch (e) {
    return false
  }
}
