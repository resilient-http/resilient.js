var _ = require('./utils')
var ResilientError = require('./error')

module.exports = DiscoveryServers

function DiscoveryServers(resilient) {
  function defineServers(cb) {
    return function (err, res) {
      if (!err && isValidResponse(res)) {
        setServers(res, cb)
      } else {
        handlerError(err, cb)
      }
    }
  }

  function setServers(res, cb) {
    if (res.data.length) {
      resilient.setServers(res.data)
      refreshCache(res.data)
      cb(null, res)
    } else {
      cb(new ResilientError(1004, res))
    }
  }

  function handlerError(err, cb) {
    if (isCacheEnabled()) {
      getFromCache(err, cb)
    } else {
      resolveWithError(err, cb)
    }
  }

  function getFromCache(err, cb) {
    var expiration, cache = getCache()
    if (cache && _.isArr(cache.data)) {
      expiration = resilient.getOptions('discovery').cacheExpiration
      if ((_.now() - cache.time) > expiration) {
        cb(null, { status: 200, _cache: true, data: cache.data })
      } else {
        resilient._cache.flush('discovery')
        resolveWithError(err, cb)
      }
    } else {
      resolveWithError(err, cb)
    }
  }

  function refreshCache(data) {
    if (isCacheEnabled()) {
      resilient._cache.set('discovery', data)
    }
  }

  function isCacheEnabled() {
    return resilient.getOptions('discovery').cache
  }

  function getCache() {
    return resilient._cache.get('discovery')
  }

  return defineServers
}

function resolveWithError(err, cb) {
  err = err || { status: 1000 }
  return cb(new ResilientError(err.status, err))
}

function isValidResponse(res) {
  return res && _.isArr(res.data) || false
}
