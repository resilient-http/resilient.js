var nock = require('nock')

module.exports = function () {
  this.After(function () {
    nock.cleanAll()
  })
}
