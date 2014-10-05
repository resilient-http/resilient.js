var nock = require('nock')

module.exports = function () {
  this.After(function (done) {
    nock.cleanAll()
    done()
  })
}
