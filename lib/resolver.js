var _ = require('./utils')
var ResilientError = require('./error')
var Requester = require('./requester')
var DiscoveryResolver = require('./discovery-resolver')
var ServersDiscovery = require('./servers-discovery')
var Servers = require('./servers')

module.exports = Resolver

function Resolver(resilient, options, cb) {
  try {
    resolve(resolver)
  } catch (err) {
    cb(new ResilientError(1006, err))
  }

  function resolve(next) {
    if (hasDiscoveryServersOutdated()) {
      updateDiscoveryServers(next)
    } else if (hasValidServers()) {
      next()
    } else if (hasDiscoveryServers()) {
      updateServers(next)
    } else {
      next(new ResilientError(1002))
    }
  }

  function updateServers(next) {
    DiscoveryResolver.update(resilient, null, next)
  }

  function updateDiscoveryServers(next) {
    var options = resilient.getOptions('discovery')
    var servers = getRefreshServers(options)
    var refreshOptions = getRefreshOptions(options)
    ServersDiscovery(resilient, refreshOptions, servers)(onRefreshServers(options, next))
  }

  function onRefreshServers(options, next) {
    return function (err, res) {
      if (err) {
        next(new ResilientError(1001, err))
      } else if (res && res.data) {
        options.servers(res.data)
        if (!hasValidServers()) {
          updateServers(next)
        } else {
          next()
        }
      } else {
        next(new ResilientError(1004, err))
      }
    }
  }

  function hasDiscoveryServersOutdated() {
    var outdate = false
    var options = resilient.getOptions('discovery')
    var servers = options.get('servers')
    var refreshServers = options.get('refreshServers')
    if (options.get('enableRefreshServers')) {
      if (options.get('useDiscoveryServersToRefresh') || (refreshServers && refreshServers.exists())) {
        if (servers && servers.exists()) {
          outdate = servers.lastUpdate() > options.get('refreshServersInterval')
        } else {
          outdate = true
        }
      }
    }
    return outdate
  }

  function hasValidServers() {
    var servers = resilient.servers('service')
    return servers && servers.exists() && serversAreUpdated(servers) || false
  }

  function serversAreUpdated(servers) {
    var updated = true
    if (hasDiscoveryServers()) {
      updated = servers.lastUpdate() < resilient.getOptions('discovery').get('refreshInterval')
    }
    return updated
  }

  function hasDiscoveryServers() {
    return resilient.hasDiscoveryServers()
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

function getRefreshServers(options) {
  return options.get('useDiscoveryServersToRefresh') ? options.get('servers') : options.get('refreshServers')
}

function getRefreshOptions(options) {
  var defaultOptions = _.omit(options.get(), ['servers', 'refreshOptions'])
  var refreshOptions = _.merge(defaultOptions, options.get('refreshOptions'), { discoverBeforeRetry: false })
  var basePath = getRefreshBasePath(options.get())
  if (basePath) refreshOptions.basePath = basePath
  return refreshOptions
}

function getRefreshBasePath(options) {
  return options && (options.refreshPath
    || (options.refreshOptions && (options.refreshOptions.basePath)))
    || false
}
