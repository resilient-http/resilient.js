var Resilient = require('./resilient')
var Client = require('./client')
var Options = require('./options')
var defaults = require('./defaults')
var Servers = require('./servers')

module.exports = ResilientFactory

function ResilientFactory(options) {
  return new Resilient(options)
}

ResilientFactory.VERSION = '0.1.0-beta.0'
ResilientFactory.defaults = defaults
ResilientFactory.Client = Client
ResilientFactory.Options = Options
ResilientFactory.Servers = Servers