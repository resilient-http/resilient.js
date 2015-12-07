module.exports = Evaluator

function Evaluator () {
  this.strategies = []
}

Evaluator.prototype.add = function (strategy) {
  if (typeof strategy === 'function') {
    this.strategies.push(strategy)
  }
}

Evaluator.prototype.eval = function (err, res) {
  return this.strategies.some(function (strategy) {
    return strategy(err, res)
  })
}
