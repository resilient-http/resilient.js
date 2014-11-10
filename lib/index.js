var Resilient = require('./resilient')
var Options = require('./options')
var defaults = require('./defaults')
var Servers = require('./servers')
var Client = require('./client')
var http = require('./http')

module.exports = ResilientFactory

function ResilientFactory(options) {
  return new Resilient(options)
}

ResilientFactory.VERSION = '0.2.3'
ResilientFactory.CLIENT_VERSION = http.VERSION
ResilientFactory.defaults = defaults
ResilientFactory.Options = Options
ResilientFactory.Servers = Servers
ResilientFactory.Client = Client
ResilientFactory.request = http
http.LIBRARY_VERSION = ResilientFactory.VERSION
