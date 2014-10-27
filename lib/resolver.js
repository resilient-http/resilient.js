var _ = require('./utils')
var ResilientError = require('./error')
var Requester = require('./requester')
var DiscoveryResolver = require('./discovery-resolver')
var Servers = require('./servers')

module.exports = Resolver

function Resolver(resilient, options, cb) {
  try {
    resolve(resolver)
  } catch (err) {
    cb(new ResilientError(1006, err))
  }

  function resolve(next) {
    if (hasServers()) {
      next()
    } else {
      if (hasServers('discovery')) {
        DiscoveryResolver.update(resilient, next)
      } else {
        next(new ResilientError(1002))
      }
    }
  }

  function hasServers(type) {
    var servers, valid = false
    type = type || 'service'
    servers = resilient.servers(type)
    if (servers && servers.exists()) {
      valid = type !== 'discovery' ? areUpToDate(servers, type) : true
    }
    return valid
  }

  function areUpToDate(servers, type) {
    var updated = true
    var servers = resilient.servers('discovery')
    if (servers && servers.exists()) {
      updated = servers.forceUpdate() || servers.lastUpdate() < resilient.getOptions('discovery').get('refresh')
    }
    return updated
  }

  function resolver(err, res) {
    if (err) {
      cb(err)
    } else {
      handleResolution(res)
    }
  }

  function handleResolution(res) {
    var servers = resilient.servers()
    if (res && res._cache) {
      servers = new Servers(res.data)
    } else if (!hasServers()) {
      return cb(new ResilientError(1003))
    }
    Requester(resilient)(servers, options, cb)
  }
}
