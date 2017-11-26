var defaults = module.exports = Object.create(null)

defaults.service = {
  method: 'GET',
  timeout: 10 * 1000,
  timeouts: null,
  servers: null,
  retry: 0,
  waitBeforeRetry: 50,
  discoverBeforeRetry: true,
  promiscuousErrors: false,
  omitRetryWhen: null,
  omitFallbackWhen: null,
  omitRetryOnMethods: null,
  omitFallbackOnMethods: null,
  omitRetryOnErrorCodes: null,
  omitFallbackOnErrorCodes: null
}

defaults.balancer = {
  enable: true,
  random: false,
  roundRobin: false,
  roundRobinSize: 3,
  balanceStrategy: null,
  disableWeight: false,
  weight: {
    success: 15,
    error: 20,
    latency: 0.001
  }
}

defaults.discovery = {
  servers: null,
  method: 'GET',
  retry: 3,
  parallel: true,
  waitBeforeRetry: 1000,
  timeout: 2 * 1000,
  cacheEnabled: true,
  cacheExpiration: 60 * 15 * 1000,
  promiscuousErrors: true,
  refreshInterval: 60 * 2 * 1000,
  enableRefreshServers: true,
  enableSelfRefresh: false,
  forceRefreshOnStart: true,
  refreshServersInterval: 60 * 5 * 1000,
  refreshServers: null,
  refreshOptions: null,
  refreshPath: null,
  omitRetryWhen: null,
  omitFallbackWhen: null,
  omitRetryOnMethods: null,
  omitFallbackOnMethods: null,
  omitRetryOnErrorCodes: null,
  omitFallbackOnErrorCodes: null
}

defaults.resilientOptions = [
  'servers',
  'retry',
  'timeouts',
  '$timeout',
  'parallel',
  'cacheEnabled',
  'cacheExpiration',
  'refreshInterval',
  'refreshServers',
  'refreshOptions',
  'refreshPath',
  'waitBeforeRetry',
  'promiscuousErrors',
  'omitRetryWhen',
  'omitFallbackWhen',
  'omitRetryOnMethods',
  'omitFallbackOnMethods',
  'omitRetryOnErrorCodes',
  'omitFallbackOnErrorCodes',
  'enableRefreshServers',
  'refreshServersInterval',
  'discoverBeforeRetry',
  'enableSelfRefresh',
  'forceRefreshOnStart'
]
