var defaults = module.exports = {}

defaults.service = {
  method: 'GET',
  timeout: 2 * 1000,
  servers: null,
  retry: 0,
  updateOnRetry: true,
  refresh: 60 * 1000
}

defaults.balancer = {
  enable: true,
  weight: {
    request: 25,
    error: 50,
    latency: 25
  }
}

defaults.discovery = {
  servers: null,
  method: 'GET',
  cache: true,
  retry: 0,
  retryWait: 1000,
  timeout: 2 * 1000,
  parallel: false,
  updateOnRetry: false,
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
  'updateOnRetry'
]
