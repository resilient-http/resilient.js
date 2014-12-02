module.exports = function(config) {
  var customLaunchers = {
    sl_chrome: {
      base: 'SauceLabs',
      browserName: 'chrome',
      platform: 'Windows 7',
      version: '35'
    },
    sl_firefox: {
      base: 'SauceLabs',
      browserName: 'firefox',
      version: '30'
    },
    sl_ios_safari: {
      base: 'SauceLabs',
      browserName: 'iphone',
      platform: 'OS X 10.9',
      version: '7.1'
    },
    sl_ie_11: {
      base: 'SauceLabs',
      browserName: 'internet explorer',
      platform: 'Windows 8.1',
      version: '11'
    }
  }

  config.set({
    files: [
      'node_modules/chai/chai.js',
      'bower_components/zepto/zepto.min.js',
      'resilient.js',
      'test/browser.js'
    ],
    frameworks: ['mocha'],
    sauceLabs: {
      testName: 'Web App Unit Tests'
    },
    customLaunchers: customLaunchers,
    browsers: [
      'Chrome',
      'ChromeCanary',
      'Firefox',
      'PhantomJS',
      'Safari',
      'Opera'
    ], // Object.keys(customLaunchers)
    reports: ['progress', 'saucelabs'],
    singleRun: true
  })
}
