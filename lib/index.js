var Resilient = require('./resilient')
var Options = require('./options')
var Client = require('./client')
var http = require('./http')
var defaults = require('./defaults')

module.exports = ResilientFactory

function ResilientFactory(options) {
  return new Resilient(options)
}

ResilientFactory.VERSION = '0.2.25'
ResilientFactory.CLIENT_VERSION = http.VERSION
ResilientFactory.defaults = defaults
ResilientFactory.Options = Options
ResilientFactory.Client = Client
ResilientFactory.request = http
http.LIBRARY_VERSION = ResilientFactory.VERSION

// force globalization in browsers, avoid browserify encapsulation
if (typeof window !== 'undefined' && typeof require === 'function') {
  window.resilient = ResilientFactory
}
