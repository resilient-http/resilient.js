var expect = require('chai').expect
var ResilientError = require('../lib/error')

describe('ResilientError', function () {
  var error = null

  it('should have be a an instance of Error', function () {
    error = new ResilientError(1000)
    expect(error).to.be.instanceof(Error)
  })

  it('should have a valid status', function () {
    expect(error.status).to.be.equal(1000)
  })

  it('should have a message property', function () {
    expect(error.message).to.be.a('string')
  })
})
