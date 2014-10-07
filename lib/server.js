var _ = require('./utils')
var defaults = require('./defaults')

module.exports = Server

function Server(url, options) {
  this.url = url
  this.setStats()
  this.setOptions(options)
}

Server.prototype.report = function (operation, latency, type) {
  var stats = this.getStats(operation)
  if (stats) {
    stats[type || 'request'] += 1
    if (latency) {
      stats.latency = calculateAvgLatency(latency, stats)
    }
  }
}

Server.prototype.reportError = function (operation, latency) {
  this.report(operation, latency, 'error')
}

Server.prototype.getBalance = function (operation) {
  var stats = this.getStats(operation)
  var total = stats.request + stats.error
  var weight = this.options.weight
  var balance = total === 0 ? 0 : round(
    (((stats.request * 100 / total) * weight.request) +
    ((stats.error * 100 / total) * weight.error) +
    (stats.latency * weight.latency)) / 100)
  return balance
}

Server.prototype.getStats = function (operation, field) {
  var stats = this.stats[operation || 'read']
  if (stats && field) stats = stats[field]
  return stats
}

Server.prototype.setOptions = function (options) {
  this.options = _.merge({}, defaults.balancer, options)
}

Server.prototype.setStats = function (stats) {
  this.stats = stats || {
    read: createStats(),
    write: createStats()
  }
}

function createStats() {
  return {
    latency: 0,
    error: 0,
    request: 0
  }
}

function calculateAvgLatency(latency, stats) {
  return round((latency + stats.latency) / (stats.request + stats.error))
}

function round(number) {
  return Math.round(number * 100) / 100
}
