var expect = require('chai').expect
var Options = require('../lib/options')

describe('Options', function () {
  var options = null

  it('should create a server store with defaults options', function () {
    options = new Options({ timeout: 10, refreshInterval: 0 }, 'discovery')
    expect(options).to.be.an('object')
  })

  it('should have a valid timeout property', function () {
    expect(options.get('timeout')).to.be.equal(10)
  })

  it('should have a default parallel properties', function () {
    expect(options.get('parallel')).to.be.true
  })

  it('should have a default retry property', function () {
    expect(options.get('retry')).to.be.equal(3)
  })

  it('should have a default cache', function () {
    expect(options.get('cacheEnabled')).to.be.true
  })

  it('should override the refresh property', function () {
    expect(options.get('refreshInterval')).to.be.equal(0)
  })

  it('should get HTTP sepcific options', function () {
    expect(options.http()).to.have.property('method')
    expect(options.http()).to.not.have.property('cacheEnabled')
    expect(options.http()).to.not.have.property('parallel')
    expect(options.http()).to.not.have.property('refreshInterval')
  })
})
