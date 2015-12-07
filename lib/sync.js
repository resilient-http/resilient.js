var isArr = require('./utils').isArr

module.exports = Sync

function Sync () {
  this.locks = {}
  this.queues = {}
}

Sync.prototype.locked = function (state) {
  return getSync(this.locks, state)
}

Sync.prototype.lock = function (state) {
  this.locks[state] = true
  return true
}

Sync.prototype.unlock = function (state) {
  this.locks[state] = false
  return false
}

Sync.prototype.enqueue = function (state, task) {
  if (getSync(this.locks, state)) {
    this.push(state, task)
  }
}

Sync.prototype.dequeue = function (state) {
  return (this.queues[state] || []).splice(0)
}

Sync.prototype.push = function (state, task) {
  var queue = this.queues[state]
  if (isArr(queue) === false) {
    queue = this.queues[state] = []
  }
  queue.push(task)
}

function getSync (locks, state) {
  var lock = locks[state]
  if (lock === undefined) {
    lock = locks[state] = false
  }
  return lock
}
