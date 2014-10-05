var expect = require('chai').expect
var ResilientError = require('../lib/error')

describe('ResilientError', function () {
  var error = null

  it('should have be a an instance of Error', function () {
    error = new ResilientError(1000)
    expect(error).to.be.instanceof(Error)
    expect(error).to.be.instanceof(ResilientError)
  })

  it('should have a valid status', function () {
    expect(error.status).to.be.equal(1000)
  })

  it('should have a message property', function () {
    expect(error.message).to.be.a('string')
  })

  describe('inherited Error', function () {
    it('should create an custom error inheriting from Error', function () {
      error = new Error('Hello')
      error.stack = 'line 1'
      error.code = 'TypeError'
      expect(new ResilientError(error)).to.be.instanceof(Error)
    })

    it('should inherits stack properties from Error', function () {
      expect(error.stack).to.be.equal('line 1')
    })

    it('should inherits from custom', function () {
      expect(error.code).to.be.equal('TypeError')
    })
  })
})
