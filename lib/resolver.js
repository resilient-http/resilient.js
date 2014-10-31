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
    if (hasValidServers('service')) {
      next()
    } else if (hasValidServers('discovery')) {
      updateDiscoveryServers(next)
    } else {
      next(new ResilientError(1002))
    }
  }

  function updateDiscoveryServers(next) {
    DiscoveryResolver.update(resilient, null, next)
  }

  function hasValidServers(type) {
    var servers = resilient.servers(type)
    var valid = servers && servers.exists() || false
    if (valid && type === 'service') {
      valid = serversAreUpToDate(servers)
    }
    return valid
  }

  function serversAreUpToDate(servers) {
    return resilient.hasDiscoveryServers()
      ? servers.lastUpdate() < resilient.getOptions('discovery').get('refreshInterval')
      : true
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
    } else if (!hasValidServers('service')) {
      return cb(new ResilientError(1003))
    }
    Requester(resilient)(servers, options, cb)
  }
}
