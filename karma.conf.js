module.exports = function(config) {
  config.set({
    files: [
      'node_modules/chai/chai.js',
      'bower_components/zepto/zepto.min.js',
      'resilient.js',
      'test/browser.js'
    ],
    frameworks: ['mocha'],
    sauceLabs: {
      testName: 'thread.js'
    },
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
