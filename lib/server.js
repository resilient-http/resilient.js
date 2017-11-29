var balancerOptions = require('./defaults').balancer

module.exports = Server

function Server (url) {
  this.url = url
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
  return total ? calculateStatsBalance(stats, weight, total) : 0
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

function calculateStatsBalance (stats, weight, total) {
  return round(
    ((((stats.request * 100 / total) * weight.success) +
    ((stats.error * 100 / total) * weight.error)) +
    (stats.latency * weight.latency)) / 100)
}

function calculateAvgLatency (latency, stats) {
  return round((latency + stats.latency) / (stats.request + stats.error))
}

function round (number) {
  return +((number * 100) / 100).toFixed(2)
}
