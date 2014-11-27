var defaults = module.exports = {}

defaults.service = {
  method: 'GET',
  timeout: 10 * 1000,
  timeouts: null,
  servers: null,
  retry: 0,
  retryWait: 50,
  discoverBeforeRetry: true,
  promiscuousErrors: false,
  omitRetryOnMethods: null,
  omitFallbackOnMethods: null,
  omitRetryOnErrorCodes: null,
  omitFallbackOnErrorCodes: null
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
  retry: 3,
  parallel: true,
  retryWait: 1000,
  timeout: 2 * 1000,
  cacheEnabled: true,
  cacheExpiration: 60 * 15 * 1000,
  promiscuousErrors: true,
  refreshInterval: 60 * 2 * 1000,
  enableRefreshServers: true,
  refreshServersInterval: 60 * 5 * 1000,
  refreshServers: null,
  refreshOptions: null,
  refreshPath: null,
  omitRetryOnMethods: null,
  omitFallbackOnMethods: null,
  omitRetryOnErrorCodes: null,
  omitFallbackOnErrorCodes: null,
  useDiscoveryServersToRefresh: false
}

defaults.resilientOptions = [
  'servers',
  'retry',
  'retryWait',
  'timeouts',
  'parallel',
  'cacheEnabled',
  'cacheExpiration',
  'refreshInterval',
  'refreshServers',
  'refreshOptions',
  'refreshPath',
  'promiscuousErrors',
  'omitRetryOnMethods',
  'omitFallbackOnMethods',
  'omitRetryOnErrorCodes',
  'omitFallbackOnErrorCodes',
  'enableRefreshServers',
  'refreshServersInterval',
  'discoverBeforeRetry',
  'useDiscoveryServersToRefresh'
]
