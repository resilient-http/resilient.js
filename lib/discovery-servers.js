var _ = require('./utils')
var ResilientError = require('./error')

module.exports = DiscoveryServers

function DiscoveryServers(resilient) {
  function defineServers(cb) {
    return function (err, res) {
      if (err) {
        cb(err)
      } else if (isValidResponse(res)) {
        setServers(res, cb)
      } else {
        cb(new ResilientError(1001, res))
      }
    }
  }

  function setServers(res, cb) {
    if (res.data.length) {
      resilient.setServers(res.data)
      cb(null, res)
    } else {
      cb(new ResilientError(1004, res))
    }
  }

  return defineServers
}

function isValidResponse(res) {
  return res && _.isArr(res.data) || false
}
