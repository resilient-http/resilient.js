var _ = require('./utils')
var ResilientError = require('./error')
var Requester = require('./requester')
var DiscoveryResolver = require('./discovery-resolver')
var DiscoveryServers = require('./discovery-servers')

module.exports = Resolver

function Resolver(resilient, options, cb) {
  try {
    resolve(nextResolve)
  } catch (err) {
    cb(new ResilientError(1006, err))
  }

  function resolve(next) {
    if (hasServers()) {
      next()
    } else {
      if (hasServers('discovery')) {
        DiscoveryResolver(resilient)
          (DiscoveryServers(resilient)
            (next))
      } else {
        next(new ResilientError(1002))
      }
    }
  }

  function hasServers(type) {
    var servers, valid = false
    type = type || 'service'
    servers = resilient.getServers(type)
    if (servers && servers.exists()) {
      if (type !== 'discovery') {
        valid = servers.lastUpdate() < (resilient.getOptions(type).get('refresh') || 0)
      } else {
        valid = true
      }
    }
    return valid
  }

  function nextResolve(err) {
    if (err) {
      cb(err)
    } else if (!hasServers()) {
      // to do: resolve from cache
      cb(new ResilientError(1003))
    } else {
      Requester(resilient)(resilient.getServers(), options, cb)
    }
  }
}
