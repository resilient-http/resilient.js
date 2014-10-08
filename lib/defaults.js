var defaults = module.exports = {}

defaults.service = {
  method: 'GET',
  timeout: 10 * 1000,
  servers: null,
  retry: 0,
  retryWait: 1000,
  discoverBeforeRetry: true
}

defaults.balancer = {
  enable: true,
  roundRobin: true,
  roundRobinSize: 3,
  weight: {
    success: 15,
    error: 50,
    latency: 35
  }
}

defaults.discovery = {
  servers: null,
  method: 'GET',
  cache: true,
  retry: 0,
  retryWait: 1000,
  timeout: 2 * 1000,
  refresh: 60 * 1000,
  parallel: true,
  cacheExpiration: 60 * 10 * 1000
}

defaults.resilientOptions = [
  'servers',
  'retry',
  'retryWait',
  'parallel',
  'cacheExpiration',
  'cache',
  'refresh',
  'discoverBeforeRetry'
]
