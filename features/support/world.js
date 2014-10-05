var _ = require('lodash')
var nock = require('nock')
var Resilient = require('../../')

exports.World = function World(done) {
  var URL = 'http://localhost:8080/api'

  this.Resilient = function (options) {
    return Resilient(this.options)
  }

  this.mock = function (url) {
    return nock(url)
  }

  done()
}
