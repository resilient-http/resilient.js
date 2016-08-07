module.exports = roundRobinSerie

function roundRobinSerie (arr, size) {
  var max = +size < 2 ? 2 : size
  var rounds = roundRobin(max, arr).shift()
  return [].concat.apply([], rounds)
}

function roundRobin (n, ps) {
  var k
  var j
  var i
  var rs = [] // rs = round array

  if (!ps) {
    ps = []
    for (k = 1; k <= n; k += 1) ps.push(k)
  } else {
    ps = ps.slice()
  }
  if (n % 2 === 1) {
    ps.push(-1) // so we can match algorithm for even numbers
    n += 1
  }
  for (j = 0; j < n - 1; j += 1) {
    rs[j] = [] // create inner match array for round j
    for (i = 0; i < n / 2; i += 1) {
      if (ps[i] !== -1 && ps[n - 1 - i] !== -1) {
        rs[j].push([ps[i], ps[n - 1 - i]]) // insert pair as a match
      }
    }
    ps.splice(1, 0, ps.pop()) // permutate for next round
  }
  return rs
}
