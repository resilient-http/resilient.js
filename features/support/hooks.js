var Resilient = require('../../')
var nock = require('nock')

module.exports = function () {
  var client = null

  /*
  this.BeforeFeatures(function (event, done) {
    client = new Resilient(options)
      .on('ready', function () {
        done()
      })
  })

  this.AfterFeatures(function () {
    //server.stop()
  })
  */

  this.After(function () {
    nock.cleanAll()
  })



}
