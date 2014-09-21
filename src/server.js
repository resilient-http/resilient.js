module.exports = Server

function Server(uri) {
  this.uri = uri
  this.stats = {
    read: stats(),
    write: stats()
  }
}

Server.prototype.report = function (operation, type, latency) {
  var stats = this.getStats(operation)
  if (stats) {
    stats[type] += 1
    if (latency > 0) stats.latency += latency
  }
}

Server.prototype.getBalance = function (operation) {
  var stats = this.getStats(operation)
  var avgLatency = this.getLatency(operation)
  var total = stats.request + stats.error
  return (((stats.request * 100 / total) * 35) +
         ((stats.error * 100 / total) * 50) +
         (avgLatency * 15) / 100)
  //((avgLatency * stats.request) * 100) / ((stats.request + stats.error) * avgLatency)
}

Server.prototype.getLatency = function (operation) {
  var stats = this.getStats(operation)
  return (stats.latency / (stats.request + stats.error))
}

Server.prototype.getStats = function (operation, field) {
  var stats = this.stats[operation || 'read']
  if (stats && field) stats = stats[field]
  return stats
}

Server.prototype.getURI = function () {
  return this.uri
}

function stats() {
  return {
    latency: 0,
    error: 0,
    request: 0
  }
}
