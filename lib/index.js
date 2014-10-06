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

ResilientFactory.VERSION = '0.1.0-beta.0'
ResilientFactory.defaults = defaults
ResilientFactory.Options = Options
ResilientFactory.Servers = Servers
ResilientFactory.Client = Client
ResilientFactory.request = http
