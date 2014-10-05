var http = require('./http')
var Servers = require('./servers')
var Options = require('./options')
var defaults = require('./defaults')

var ResilientError = require('./error')

var VERSION = '0.1.0'

module.exports = Resilient

Resilient.VERSION = VERSION
Resilient.defaults = defaults

function Resilient(options) {
  var serversStore = {}
  var optionsStore = Options.define(options)
  var isUpdating = false
  var queueBuf = []

  function setRequestArgs(path, options, cb) {
    if (typeof options === 'function') {
      cb = options
      options = arguments[0]
    }
    options = _.extend(optionsStore.get('service').get(), options)
    options.path = options.path || path
    return [ options, cb ]
  }

  function hasServers(type) {
    var servers = optionsStore.get(type).servers()
    return servers && !servers.empty() || false
  }

  function defineServers(data) {
    var servers = optionsStore.get('service').servers()
    if (servers) {
      servers.set(data)
    } else {
      optionsStore.get('service').servers(data)
    }
  }

  function ResilientClient(path, options, cb) {
    var args = setRequestArgs.apply(null, arguments)
    service(request.apply(null, args))
  }

  function service(done) {
    var servers = optionsStore.get('service').servers()
    if (!servers) {
      if (hasServers('discovery')) {
        updateServers(done)
      } else {
        done(new ResilientError(1002))
      }
    } else {
      getServers(done)
    }
  }

  function request(options, cb) {
    return function (err) {
      var servers = optionsStore.get('service').servers()
      if (err) {
        cb(err)
      } else if (servers.empty()) {
        cb(new ResilientError(1003))
      } else {
        requester(servers, options, cb)
      }
    }
  }

  function getServers(cb) {
    var servers = optionsStore.get('service').servers()
    if (optionsStore.get('discovery').servers() && servers.lastUpdate() > optionsStore.get('service').get('refresh')) {
      updateServers(cb)
    } else {
      cb(null, servers)
    }
  }

  function updateServers(cb) {
    var options = optionsStore.get('discovery').get()
    if (isUpdating) {
      queueBuf.push(cb)
    } else {
      options.path = addTimeStamp(options.path)
      if (options.parallel) {
        var buf = []
        var servers = optionsStore.get('discovery').servers().sort()
        servers.slice(0, 3).forEach(function (server, index) {
          server = [ server ]
          if (index === 2 && servers.length > 3) {
            server = server.concat(servers.slice(3))
          }
          requester(new Servers(server), options, function (err, res) {
            if (err) {
              buf.splice(buf.indexOf(err.request), 1)
            } else {
              onUpdateServers(cb, buf)(err, res)
            }
          }, buf)
        })
      } else {
        isUpdating = true
        requester(optionsStore.get('discovery').servers(), options, onUpdateServers(cb))
      }
    }
  }

  function addTimeStamp(path) {
    path = path || ''
    path += path.indexOf('?') === -1 ? '?' : '&'
    path += _.now() + Math.floor(Math.random() * 10000)
    return path
  }

  function onUpdateServers(cb, buf) {
    return function (err, res) {
      isUpdating = false
      if (err) {
        cb(err)
      } else {
        if (_.isArr(res.data)) {
          if (res.data.length) {
            defineServers(res.data)
            cb(null, res)
          } else {
            cb(new ResilientError(1004))
          }
        } else {
          cb(new ResilientError(1001, err))
        }
      }
      queueBuf.forEach(function dispatch(cb) {
        cb(err, res)
      })
      if (buf) {
        buf.forEach(function (client) {
          if (client.xhr) {
            if (client.xhr.readyState !== 4) client.xhr.abort()
          } else {
            client.abort()
          }
        })
        buf = null
      }
    }
  }

  function delay(fn, ms) {
    setTimeout(fn, ms)
  }

  function handleMissingServers(request, cb) {
    // to do: get from cache
    var store = optionsStore.get('discovery').get()
    if (optionsStore.get('discovery').servers() && store && store.retry) {
      delay(function () {
        console.log(optionsStore.clone())
        var options = _.extend({}, optionsStore.getRaw())
        _.extend(options.discovery, { retry: store.retry - 1 })
        isUpdating = false
        // to do: change
        //ResilientClient(null, options, cb)
        console.log('RETRY! >', options)
        cb(new ResilientError(1000))
      }, store.retryDelay)
    } else {
      cb(new ResilientError(1000, request))
    }
  }

  function requester(servers, options, cb, buf) {
    var operation = getOperation(options.method)
    var servers = servers.sort(operation)
    var request = null
    options = _.clone(options)

    function performRequest() {
      var server = servers.shift()
      if (!server) {
        handleMissingServers(request, cb)
      } else {
        var handler = requestHandler(server, operation, cb, performRequest)
        options.url = _.join(server.url, options.path)
        try {
          request = http(options, handler)
        } catch (err) {
          handler(err)
        }
        if (buf) buf.push(request)
      }
    }

    performRequest()
  }

  function requestHandler(server, operation, cb, next) {
    var start = _.now()
    return function (err, res) {
      var latency = _.now() - start
      if (isUnavailableStatus(err, res)) {
        server.report(operation, 'error', latency)
        next()
      } else {
        server.report(operation, 'request', latency)
        cb(err, res)
      }
    }
  }

  function getOperation(method) {
    return !method || method.toUpperCase() === 'GET' ? 'read' : 'write'
  }

  function handler(cb, args) {
    return function resolver(err, res) {
      if (err && isUnavailable(err)) {
        return ResilientClient.apply(null, args)
      }
      cb(err, res)
    }
  }

  function clientFactory(method) {
    return function (path, options, cb) {
      options = options || {}
      options.method = method
      ResilientClient(path, options, cb)
    }
  }

  ResilientClient.get = clientFactory('GET')
  ResilientClient.post = clientFactory('POST')
  ResilientClient.put = clientFactory('PUT')
  ResilientClient.del = clientFactory('DELETE')
  ResilientClient.patch = clientFactory('PATCH')
  ResilientClient.head = clientFactory('HEAD')

  ResilientClient.setOptions = function (key, options) {
    if (_.isObj(key)) {
      options = setOptions(key)
    } else if (options[key] && _.isObj(options)) {
      options[key] = _.extend(options[key], options)
    }
  }

  ResilientClient.setDiscoveryOptions = function (options) {
    this.setOptions('discovery', options)
  }

  ResilientClient.setClientOptions = function (options) {
    this.setOptions('service', options)
  }

  ResilientClient.getOptions = function (type) {
    return type ? options[type] : options
  }

  ResilientClient.setServers = function (servers, type) {
    if (_.isArr(servers)) {
      ResilientClient.setOptions(type || 'service', { servers: servers })
    }
  }

  ResilientClient.setDiscoveryServers = function (servers) {
    ResilientClient.setServers(servers, 'discovery')
  }

  ResilientClient.updateServers = function (cb) {
    updateServers(cb)
    return this
  }

  ResilientClient.getDiscoveryServers = function (cb) {
    zupdateServers(cb)
    return this
  }

  return ResilientClient
}
