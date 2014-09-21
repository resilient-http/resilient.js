module.exports = function(config) {
  config.set({
    files: [
      'node_modules/chai/chai.js',
      'resilient.js',
      'test/*.js'
    ],
    exclude: [],
    frameworks: ['mocha'],
    browsers: [
      'Chrome',
      'ChromeCanary',
      'Firefox',
      'PhantomJS',
      'Opera',
      'Safari'
    ],
    reports: ['progress'],
    singleRun: true
  })
}
