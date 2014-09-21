/*! resilient - v0.1 - MIT License - https://github.com/h2non/resilient */
!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.resilient=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*! lil-http - v0.1 - MIT License - https://github.com/lil-js/http */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['exports'], factory)
  } else if (typeof exports === 'object') {
    factory(exports)
    if (typeof module === 'object' && module !== null) {
      module.exports = exports = exports.http
    }
  } else {
    factory((root.lil = root.lil || {}))
  }
}(this, function (exports) {
  var VERSION = '0.1.2'
  var toStr = Object.prototype.toString
  var slicer = Array.prototype.slice
  var origin = location.origin
  var originRegex = /^(http[s]?:\/\/[a-z0-9\-\.\:]+)[\/]?/i

  var defaults = {
    method: 'GET',
    timeout: 30 *  1000,
    auth: null,
    headers: null,
    async: true,
    withCredentials: false,
    responseType: 'text'
  }

  function isObj(o) {
    return o && toStr.call(o) === '[object Object]'
  }

  function isArr(o) {
    return o && toStr.call(o) === '[object Array]'
  }

  function extend(target) {
    var i, l, x, cur, args = slicer.call(arguments).slice(1)
    for (i = 0, l = args.length; i < l; i += 1) {
      cur = args[i]
      for (x in cur) if (cur.hasOwnProperty(x)) {
        target[x] = cur[x]
      }
    }
    return target
  }

  function setHeaders(xhr, headers) {
    if (isObj(headers)) {
      headers['Content-Type'] = headers['Content-Type'] || http.defaultContent
      for (var field in headers) {
        xhr.setRequestHeader(field, headers[field])
      }
    }
  }

  function getHeaders(xhr) {
    var map = {}, headers = xhr.getAllResponseHeaders().split('\n')
    headers.forEach(function (header) {
      if (header) {
        header = header.split(':')
        map[header[0].trim()] = (header[1] || '').trim()
      }
    })
    return map
  }

  function parseData(xhr) {
    var data, content = xhr.getResponseHeader('Content-Type')
    if (xhr.responseType === 'text') {
      data = xhr.responseText
      if (content === 'application/json') data = JSON.parse(data)
    } else {
      data = xhr.response
    }
    return data
  }

  function buildResponse(xhr) {
    return {
      xhr: xhr,
      status: xhr.status,
      data: parseData(xhr),
      headers: getHeaders(xhr)
    }
  }

  function buildErrorResponse(xhr, error) {
    var response = buildResponse(xhr)
    response.error = error
    return response
  }

  function onError(xhr, cb) {
    var called = false
    return function (err) {
      if (!called) {
        cb(buildErrorResponse(xhr, err), null)
        called = true
      }
    }
  }

  function onLoad(xhr, cb) {
    return function () {
      if (xhr.readyState === 4) {
        if (xhr.status >= 200 && xhr.status < 300) {
          cb(null, buildResponse(xhr))
        } else {
          cb(buildResponse(xhr), null)
        }
      }
    }
  }

  function isCrossOrigin(url) {
    var match = url.match(originRegex)
    return match && match[1] === origin
  }

  function createClient(config) {
    var xhr = null
    var method = (config.method || 'GET').toUpperCase()
    var auth = config.auth || {}
    var url = config.url

    if (isCrossOrigin(url)) {
      if (typeof XDomainRequest !== 'undefined') {
        xhr = new XDomainRequest()
      }
    } else {
      xhr = new XMLHttpRequest()
    }

    xhr.open(method, url, config.async, auth.user, auth.password)
    xhr.withCredentials = config.withCredentials
    xhr.responseType = config.responseType
    xhr.timeout = config.timeout
    setHeaders(xhr, config.headers)
    return xhr
  }

  function updateProgress(xhr, cb) {
    return function (ev) {
      if (evt.lengthComputable) {
        cb(ev, evt.loaded / evt.total)
      } else {
        cb(ev)
      }
    }
  }

  function request(config, cb, progress) {
    var xhr = createClient(config)
    var data = isObj(config.data) || isArr(config.data) ? JSON.stringify(config.data) : config.data
    var errorHandler = onError(xhr, cb)

    xhr.onload = onLoad(xhr, cb)
    xhr.onerror = errorHandler
    xhr.ontimeout = errorHandler
    xhr.onabort = errorHandler
    if (typeof progress === 'function') xhr.onprogress = updateProgress(xhr, progress)

    try {
      xhr.send(data)
    } catch (e) {
      errorHandler(e)
    }

    return xhr
  }

  function requestFactory(method) {
    return function (url, options, cb, progress) {
      var config = extend({}, defaults, { method: method })
      var args = slicer.call(arguments)
      var i, cur = null

      for (i = 0, l = args.length; i < l; i += 1) {
        cur = args[i]
        if (typeof cur === 'function') {
          cb = cur
          if (cb !== cur) progress = cur
        } else if (isObj(cur)) {
          extend(config, cur)
        } else if (typeof cur === 'string') {
          config.url = cur
        }
      }

      return request(config, cb, progress)
    }
  }

  function http(config, data, cb, progress) {
    return requestFactory('GET').apply(null, arguments)
  }

  http.VERSION = VERSION
  http.defaults = defaults
  http.defaultContent = 'text/plain'
  http.get = requestFactory('GET')
  http.post = requestFactory('POST')
  http.put = requestFactory('PUT')
  http.del = requestFactory('DELETE')
  http.patch = requestFactory('PATCH')
  http.head = requestFactory('HEAD')

  return exports.http = http
}))

},{}],2:[function(require,module,exports){
var http = require('../bower_components/lil-http/http')
var Servers = require('./server')
var VERSION = '0.1.0'

module.exports = Resilient

Resilient.Servers = Servers
Resilient.VERSION = VERSION

function Resilient(options) {
  var httpOptions = {}

  function ResilientClient(url, options, cb, progress) {
    var args = []
    if (typeof url === 'string') args.push(url)
    if (typeof options === 'object') args.push(options)
    http.apply(http, args.concat([ handler(cb, arguments), progress ]))
  }

  function isUnavailable(err) {
    return err.status >= 429 || err.status === 0
  }

  function handler(cb, args) {
    return function resolver(err, res) {
      if (err && isUnavailable(err)) {
        return ResilientClient.apply(null, args)
      }
      cb(err, res)
    }
  }

  ResilientClient.httpOptions = {}

  ResilientClient.balanceOptions = {}

  function callClient(method) {
    return function () {
      http[method].apply()
    }
  }

  ResilientClient.get = function () {}
  ResilientClient.post = function () {}
  ResilientClient.put = function () {}
  ResilientClient.del = function () {}
  ResilientClient.patch = function () {}
  ResilientClient.head = function () {}

  return ResilientClient
}

},{"../bower_components/lil-http/http":1,"./server":3}],3:[function(require,module,exports){
module.exports = Server

function Server(uri) {
  this.uri = uri
  this.stats = {
    read: stats(),
    write: stats()
  }
}

Server.prototype.report = function (operation, type, latency) {
  var stats = this.getStats(operation)
  if (stats) {
    stats[type] += 1
    if (latency > 0) stats.latency += latency
  }
}

Server.prototype.getBalance = function (operation) {
  var stats = this.getStats(operation)
  var avgLatency = this.getLatency(operation)
  var total = stats.request + stats.error
  return (((stats.request * 100 / total) * 35) +
         ((stats.error * 100 / total) * 50) +
         (avgLatency * 15) / 100)
  //((avgLatency * stats.request) * 100) / ((stats.request + stats.error) * avgLatency)
}

Server.prototype.getLatency = function (operation) {
  var stats = this.getStats(operation)
  return (stats.latency / (stats.request + stats.error))
}

Server.prototype.getStats = function (operation, field) {
  var stats = this.stats[operation || 'read']
  if (stats && field) stats = stats[field]
  return stats
}

Server.prototype.getURI = function () {
  return this.uri
}

function stats() {
  return {
    latency: 0,
    error: 0,
    request: 0
  }
}

},{}]},{},[2])(2)
});