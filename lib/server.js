require('console.table')
var balancerOptions = require('./defaults').balancer

module.exports = Server

function Server (url, index) {
  this.url = url
  this.index = index + 1
  this.resetStats()
}

Server.prototype.report = function (operation, latency, type) {
  var stats = this.stats(operation)
  if (stats) {
    stats[type || 'request'] += 1
    stats.latency = calculateAvgLatency(latency || 0, stats)
  }
}

Server.prototype.reportError = function (operation, latency) {
  this.report(operation, latency, 'error')
}

Server.prototype.balance = function (operation, options) {
  var stats = this.stats(operation)
  var weight = balancerOptions.weight
  var total = stats.request + stats.error

  return total ? calculateStatsBalance(stats, weight, total, this.index) : 0
}

Server.prototype.stats = function (operation, field) {
  var stats = this.statsStore[operation || 'read']
  if (stats && field) stats = stats[field]
  return stats
}

Server.prototype.resetStats = function () {
  this.statsStore = createServerStats()
}

function createServerStats () {
  return {
    read: createStats(),
    write: createStats()
  }
}

function createStats () {
  return {
    latency: 0,
    error: 0,
    request: 0
  }
}

function calculateStatsBalance (stats, weight, total, index) {
  var success = (stats.request / total) * weight.success
  var error = (stats.error / total) * weight.error
  var latency = (stats.latency * weight.latency)

  return (success + error + latency + index + total).toFixed(2)
}

function calculateAvgLatency (latency, stats) {
  return (latency + stats.latency) / (stats.request + stats.error)
}
