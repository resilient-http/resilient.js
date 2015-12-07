var _ = require('./utils')
var Servers = require('./servers')
var Requester = require('./requester')
var ResilientError = require('./error')
var ServersDiscovery = require('./discovery')
var DiscoveryResolver = require('./resolvers/discovery')

module.exports = Resolver

function Resolver (resilient, options, cb) {
  cb = wrapHandler(cb)

  var sync = resilient._sync
  var middleware = resilient._middleware

  try {
    resolve(resolver)
  } catch (err) {
    cb(new ResilientError(1006, err))
  }

  function resolve (next) {
    if (hasDiscoveryServersOutdated()) {
      updateDiscoveryServers(next)
    } else if (hasValidServiceServers()) {
      next()
    } else if (hasDiscoveryServers()) {
      updateServiceServers(next)
    } else {
      next(new ResilientError(1002))
    }
  }

  function updateDiscoveryServers (next) {
    var options = discoveryOptions()
    var servers = getRefreshServers(options)
    var refreshOptions = getRefreshOptions(options)

    if (sync.locked('discovering')) {
      sync.enqueue('discovering', onRefreshServers(options, next))
    } else {
      sync.lock('discovering')
      ServersDiscovery(resilient, refreshOptions, servers)(onRefreshServers(options, next))
    }
  }

  function onRefreshServers (options, next) {
    return function (err, res) {
      sync.unlock('discovering')
      sync.dequeue('discovering').forEach(function (cb) { cb(err, res) })

      middleware.run('discovery', 'in')(err, res, function (mErr) {
        if (err || mErr) {
          next(new ResilientError(err ? 1001 : 1007, err || mErr))
        } else if (res && res.data) {
          refreshDiscoveryServers(res.data, options)
          updateServiceServers(next)
        } else {
          next(new ResilientError(1004, err))
        }
      })
    }
  }

  function discoveryOptions () {
    return resilient.options('discovery')
  }

  function refreshDiscoveryServers (data, options) {
    resilient.emit('discovery:refresh', data, resilient)
    options.servers(data)
  }

  function updateServiceServers (next) {
    DiscoveryResolver.update(resilient, null, next)
  }

  function hasDiscoveryServersOutdated () {
    var outdated = false
    var options = discoveryOptions()
    var servers = options.get('servers')

    if (canUpdateDiscoveryServers(options)) {
      if (servers && servers.exists()) {
        if (options.get('forceRefreshOnStart')) {
          outdated = servers.updated === 0
        }
        if (!outdated) {
          outdated = servers.lastUpdate() > options.get('refreshServersInterval')
        }
      } else {
        outdated = true
      }
    }

    return outdated
  }

  function hasDiscoveryServers () {
    return resilient.hasDiscoveryServers()
  }

  function hasValidServiceServers () {
    var servers = resilient.servers()
    return servers && servers.exists() && serversAreUpdated(servers) || false
  }

  function serversAreUpdated (servers) {
    var interval = discoveryOptions().get('refreshInterval')
    if (hasDiscoveryServers()) {
      return servers.lastUpdate() < interval
    }
    return true
  }

  function resolver (err, res) {
    err ? cb(err) : handleResolution(res)
  }

  function handleResolution (res) {
    var servers = resilient.servers()
    var requester = Requester(resilient)

    if (res && res._cache) {
      servers = new Servers(res.data)
    } else if (!hasValidServiceServers()) {
      return cb(new ResilientError(1003))
    }

    middleware.run('service', 'out')(servers, options, function (err) {
      if (err) {
        cb(new ResilientError(1007, err))
      } else {
        requester(servers, options, cb)(null)
      }
    })
  }

  function wrapHandler (cb) {
    return function (err, res) {
      middleware.run('service', 'in')(err, res, function (mErr) {
        if (err || mErr) {
          cb(err || new ResilientError(1007, mErr))
        } else {
          cb(null, res)
        }
      })
    }
  }
}

function canUpdateDiscoveryServers (options) {
  var refreshServers = options.get('refreshServers')
  return options.get('enableRefreshServers') &&
    (options.get('enableSelfRefresh') ||
    (refreshServers && refreshServers.exists()))
}

function getRefreshServers (options) {
  var type = options.get('enableSelfRefresh')
    ? 'servers'
    : 'refreshServers'
  return options.get(type)
}

function getRefreshOptions (options) {
  var defaultOptions = _.omit(options.get(), ['servers', 'refreshOptions'])
  var refreshOptions = _.merge(defaultOptions, options.get('refreshOptions'), { discoverBeforeRetry: false })
  var basePath = getRefreshBasePath(options.get())
  if (basePath) refreshOptions.basePath = basePath
  return refreshOptions
}

function getRefreshBasePath (options) {
  return options && (options.refreshPath ||
    (_.isObj(options.refreshOptions) &&
    options.refreshOptions.basePath)) ||
    false
}
