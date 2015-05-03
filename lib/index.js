var http = require('./http')
var Client = require('./client')
var Options = require('./options')
var defaults = require('./defaults')
var Resilient = require('./resilient')

module.exports = ResilientFactory

function ResilientFactory(options) {
  return new Resilient(options)
}

ResilientFactory.VERSION = '0.3.0'
ResilientFactory.CLIENT_VERSION = http.VERSION
ResilientFactory.defaults = defaults
ResilientFactory.Options = Options
ResilientFactory.Client = Client
ResilientFactory.request = http
http.LIBRARY_VERSION = ResilientFactory.VERSION

// force globalization in browsers
if (typeof window !== 'undefined' && typeof require === 'function') {
  window.resilient = ResilientFactory
}
