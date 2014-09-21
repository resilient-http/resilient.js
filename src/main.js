var Resilient = require('./resilient')

module.exports = ResilientFactory

function ResilientFactory(options) {
  return Resilient(options)

  function Resilient() {

  }

  return Resilient()
}

ResilientFactory.VERSION = '0.1.0'
