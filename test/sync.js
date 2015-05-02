var expect = require('chai').expect
var Sync = require('../lib/sync')

describe('Sync', function () {
  var sync = null

  it('should create an instance', function () {
    sync = new Sync()
    expect(sync).to.be.instanceof(Sync)
  })

  it('should retrieve the initial input default sync', function () {
    expect(sync.locked('test')).to.be.false
  })

  it('should lock a sync', function () {
    expect(sync.lock('test')).to.be.true
    expect(sync.locked('test')).to.be.true
  })

  it('should unlock an sync', function () {
    expect(sync.unlock('test')).to.be.false
    expect(sync.locked('test')).to.be.false
  })

  it('should enqueue a task for a custom sync', function () {
    sync.lock('test')
    sync.enqueue('test', function () {})
    expect(sync.queues.test).to.have.length(1)
  })

  it('should dequeue a task for a custom sync', function () {
    sync.lock('test')
    expect(sync.dequeue('test', function () {})).to.have.length(1)
    expect(sync.queues.test).to.have.length(0)
  })

  it('should not enqueue a task if the sync is unlocked', function () {
    sync.unlock('test')
    sync.enqueue('test', function () {})
    expect(sync.queues.test).to.have.length(0)
  })
})
