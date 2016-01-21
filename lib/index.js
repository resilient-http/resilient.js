var http = require('./http')
var Client = require('./client')
var Options = require('./options')
var defaults = require('./defaults')
var Resilient = require('./resilient')

module.exports = Resilient

Resilient.VERSION = '0.3.3'
Resilient.CLIENT_VERSION = http.VERSION
Resilient.defaults = defaults
Resilient.Options = Options
Resilient.Client = Client
Resilient.request = http
http.LIBRARY_VERSION = Resilient.VERSION

// Force globalization in browsers
if (typeof window !== 'undefined' && typeof require === 'function') {
  window.resilient = Resilient
}
