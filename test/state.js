var expect = require('chai').expect
var State = require('../lib/state')

describe('State', function () {
  var state = null

  it('should create an instance', function () {
    state = new State()
    expect(state).to.be.instanceof(State)
  })

  it('should retrieve the initial input default state', function () {
    expect(state.locked('test')).to.be.false
  })

  it('should lock a state', function () {
    expect(state.lock('test')).to.be.true
    expect(state.locked('test')).to.be.true
  })

  it('should unlock an state', function () {
    expect(state.unlock('test')).to.be.false
    expect(state.locked('test')).to.be.false
  })

  it('should enqueue a task for a custom state', function () {
    state.lock('test')
    state.enqueue('test', function () {})
    expect(state.queues.test).to.have.length(1)
  })

  it('should dequeue a task for a custom state', function () {
    state.lock('test')
    expect(state.dequeue('test', function () {})).to.have.length(1)
    expect(state.queues.test).to.have.length(0)
  })

  it('should not enqueue a task if the state is unlocked', function () {
    state.unlock('test')
    state.enqueue('test', function () {})
    expect(state.queues.test).to.have.length(0)
  })
})
