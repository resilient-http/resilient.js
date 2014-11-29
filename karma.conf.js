module.exports = function(config) {
  config.set({
    files: [
      'node_modules/chai/chai.js',
      'bower_components/zepto/zepto.min.js',
      'resilient.js',
      'test/browser.js'
    ],
    frameworks: ['mocha'],
    browsers: [
      'Chrome',
      'ChromeCanary',
      'Firefox',
      'PhantomJS',
      'Safari',
      'Opera'
    ],
    reports: ['progress'],
    singleRun: true
  })
}
