var isArray = require('./utils').isArr

module.exports = State

function State() {
  this.locks = {}
  this.queues = {}
}

State.prototype.locked = function (state) {
  return getState(this.locks, state)
}

State.prototype.lock = function (state) {
  return this.locks[state] = true
}

State.prototype.unlock = function (state) {
  return this.locks[state] = false
}

State.prototype.enqueue = function (state, task) {
  var queue = this.queues[state]
  if (getState(this.locks, state)) {
    if (!isArray(queue)) {
      queue = this.queues[state] = []
    }
    queue.push(task)
  }
}

State.prototype.dequeue = function (state) {
  return (this.queues[state] || []).splice(0)
}

function getState(locks, state) {
  var lock = locks[state]
  if (lock === undefined) {
    lock = locks[state] = false
  }
  return lock
}
