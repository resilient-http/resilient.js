var Resilient = require('./resilient')
var Client = require('./client')
var Options = require('./options')
var defaults = require('./defaults')

module.exports = ResilientFactory

function ResilientFactory(options) {
  return new Resilient(options)
}

Resilient.VERSION = '0.1.0'
Resilient.defaults = defaults
Resilient.Client = Client
Resilient.Resilient = Resilient
Resilient.Options = Options
