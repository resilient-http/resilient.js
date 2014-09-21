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
