var expect = require('chai').expect
var Stubby = require('stubby').Stubby
var exec = require('child_process').exec

function run(args, cb) {
  exec('node ' + __dirname + '/../bin/resilient ' + args, cb)
}

describe('CLI', function () {
  describe('--help', function () {
    it('should show the help', function (done) {
      run('--help', function (error, stdout) {
        expect(stdout).to.match(/resilient/)
        done()
      })
    })
  })

  describe('--version', function () {
    it('should show the current version', function (done) {
      run('--version', function (error, stdout) {
        expect(stdout).to.match(new RegExp(require('../package.json').version))
        done()
      })
    })
  })

  describe('request URL', function () {
    var server = null

    before(function (done) {
      server = new Stubby()
      server.start({
        stubs: 9999,
        data: [{
          request: { url: '/sample' },
          response: { status: 200, body: 'hello' }
        }]
      }, done)
    })

    after(function (done) {
      server.stop(done)
    })

    it('should perform a URL request', function (done) {
      run('http://localhost:9999/sample', function (error, stdout) {
        expect(stdout).to.match(/hello/)
        done()
      })
    })
  })

  describe('--method', function () {
    var server = null

    before(function (done) {
      server = new Stubby()
      server.start({
        stubs: 9999,
        data: [{
          request: { url: '/sample', method: 'POST' },
          response: { status: 200, body: 'hello' }
        }]
      }, done)
    })

    after(function (done) {
      server.stop(done)
    })

    it('should perform a URL request', function (done) {
      run('http://localhost:9999/sample -x POST', function (error, stdout) {
        expect(stdout).to.match(/hello/)
        done()
      })
    })
  })

  describe('--header', function () {
    var server = null

    before(function (done) {
      server = new Stubby()
      server.start({
        stubs: 9999,
        data: [{
          request: { url: '/sample', headers: { Version: '0.1.0' } },
          response: { status: 200, body: 'hello' }
        }]
      }, done)
    })

    after(function (done) {
      server.stop(done)
    })

    it('should perform a URL request', function (done) {
      run('http://localhost:9999/sample -h "Version: 0.1.0"', function (error, stdout) {
        expect(stdout).to.match(/hello/)
        done()
      })
    })
  })
})
