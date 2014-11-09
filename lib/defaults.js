var defaults = module.exports = {}

defaults.service = {
  method: 'GET',
  timeout: 10 * 1000,
  servers: null,
  retry: 0,
  retryWait: 1000,
  discoverBeforeRetry: true,
  promiscuousErrors: false
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
  retry: 3,
  retryWait: 1000,
  timeout: 2 * 1000,
  refreshInterval: 60 * 1000,
  enableRefreshServers: true,
  refreshServersInterval: 60 * 3 * 1000,
  refreshServers: null,
  refreshOptions: null,
  parallel: true,
  cacheExpiration: 60 * 10 * 1000,
  promiscuousErrors: true,
  discoverBeforeRetry: false // review
}

defaults.resilientOptions = [
  'servers',
  'retry',
  'retryWait',
  'parallel',
  'cacheExpiration',
  'cache',
  'refreshInterval',
  'refreshServers',
  'refreshOptions',
  'enableRefreshServers',
  'refreshServersInterval',
  'discoverBeforeRetry'
]
