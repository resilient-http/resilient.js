var expect = require('chai').expect
var Cache = require('../lib/cache')

describe('Cache', function () {
  var cache = null

  it('should create an instance', function () {
    cache = new Cache()
    expect(cache).to.be.instanceof(Cache)
  })

  it('should write a string in the cache buffer', function () {
    cache.set('test', 'hello')
    expect(cache.get('test').data).to.be.equal('hello')
  })

  it('should write an array in the cache buffer', function () {
    cache.set('test', [1,2])
    expect(cache.get('test').data).to.be.deep.equal([1,2])
  })

  it('should exists the key value', function () {
    cache.set('test', [1,2])
    expect(cache.exists('test')).to.be.true
  })

  it('should not exists the key', function () {
    expect(cache.exists('invalid')).to.be.false
  })

  it('should write an object in the cache buffer', function () {
    cache.set('test', {x:1})
    expect(cache.get('test').data).to.be.deep.equal({x:1})
  })

  it('should flush by key', function () {
    cache.flush('test')
    expect(cache.get('test')).to.be.null
  })

  it('should flush the cache buffer', function () {
    cache.flush()
    expect(cache.get()).to.be.deep.equal({})
  })
})
