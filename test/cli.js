var expect = require('chai').expect
var Stubby = require('stubby').Stubby
var exec = require('child_process').exec

function run(args, cb) {
  exec('node ' + __dirname + '/../bin/resilient ' + args, cb)
}

describe('CLI', function () {
  var server = null

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

  describe('--method', function () {
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

    it('should add the request header', function (done) {
      run('http://localhost:9999/sample -h "Version: 0.1.0"', function (error, stdout) {
        expect(stdout).to.match(/hello/)
        done()
      })
    })

    it('should print to stderr the request header', function (done) {
      run('http://localhost:9999/not-found -h "Version: 0.1.0"', function (error, stdout, stderr) {
        expect(stderr).to.match(/Error status\: 404/)
        done()
      })
    })
  })

  describe('--data', function () {
    before(function (done) {
      server = new Stubby()
      server.start({
        stubs: 9999,
        data: [{
          request: { url: '/sample', method: 'POST', post: 'hello' },
          response: { status: 200, body: 'hello' }
        }]
      }, done)
    })

    after(function (done) {
      server.stop(done)
    })

    it('should send the request payload', function (done) {
      run('http://localhost:9999/sample -d "hello"', function (error, stdout) {
        expect(stdout).to.match(/hello/)
        done()
      })
    })

    it('should print to stderr for invalid payload', function (done) {
      run('http://localhost:9999/not-found -d "goodbye"', function (error, stdout, stderr) {
        expect(stderr).to.match(/Error status\: 404/)
        done()
      })
    })
  })

  describe('--file', function () {
    before(function (done) {
      server = new Stubby()
      server.start({
        stubs: 9999,
        data: [{
          request: { url: '/sample', method: 'POST', file: __dirname + '/fixtures/payload.json' },
          response: { status: 200, body: 'hello' }
        }]
      }, done)
    })

    after(function (done) {
      server.stop(done)
    })

    it('should send the file from disk', function (done) {
      run('http://localhost:9999/sample -f "' + __dirname + '/fixtures/payload.json"', function (error, stdout) {
        expect(stdout).to.match(/hello/)
        done()
      })
    })

    it('should print to stderr the request error', function (done) {
      run('http://localhost:9999/not-found -f __invalid', function (error, stdout, stderr) {
        expect(stderr).to.match(/ENOENT/)
        done()
      })
    })
  })

  describe('--info', function () {
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

    it('should print the HTTP version and status', function (done) {
      run('http://localhost:9999/sample -i', function (error, stdout) {
        expect(stdout).to.match(/HTTP\/1\.1 200 OK/)
        done()
      })
    })

    it('should print the response headers', function (done) {
      run('http://localhost:9999/sample -i', function (error, stdout) {
        expect(stdout).to.match(/server\: stubby/)
        done()
      })
    })

    it('should print the response body', function (done) {
      run('http://localhost:9999/sample -i', function (error, stdout) {
        expect(stdout).to.match(/hello/)
        done()
      })
    })

    it('should print error response headers', function (done) {
      run('http://localhost:9999/not-found -i', function (error, stdout, stderr) {
        expect(stderr).to.match(/Error status\: 404/)
        done()
      })
    })
  })

  describe('--info-headers', function () {
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

    it('should print the HTTP version and status', function (done) {
      run('http://localhost:9999/sample -I', function (error, stdout) {
        expect(stdout).to.match(/HTTP\/1\.1 200 OK/)
        done()
      })
    })

    it('should print the response headers', function (done) {
      run('http://localhost:9999/sample -I', function (error, stdout) {
        expect(stdout).to.match(/server\: stubby/)
        done()
      })
    })

    it('should not print the response body', function (done) {
      run('http://localhost:9999/sample -I', function (error, stdout) {
        expect(stdout).to.not.match(/hello/)
        done()
      })
    })

    it('should print error response headers', function (done) {
      run('http://localhost:9999/not-found -I', function (error, stdout, stderr) {
        expect(stderr).to.match(/Error status\: 404/)
        done()
      })
    })
  })

  describe('--status', function () {
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

    it('should print the response status code', function (done) {
      run('http://localhost:9999/sample -c', function (error, stdout) {
        expect(stdout).to.match(/200/)
        done()
      })
    })

    it('should print the error status code', function (done) {
      run('http://localhost:9999/not-found -c', function (error, stdout) {
        expect(stdout).to.match(/404/)
        done()
      })
    })
  })

  describe('--servers', function () {
    before(function (done) {
      server = new Stubby()
      server.start({
        stubs: 9999,
        data: [{
          request: { url: '/server1' },
          response: { status: 500, body: 'hello' }
        }, {
          request: { url: '/server2/sample' },
          response: { status: 200, body: 'hello' }
        }]
      }, done)
    })

    after(function (done) {
      server.stop(done)
    })

    it('should print the response status code', function (done) {
      run('/sample -c -s http://localhost:9999/server1,http://localhost:9999/server2', function (error, stdout) {
        expect(stdout).to.match(/200/)
        done()
      })
    })

    it('should print the error status code if servers are invalid', function (done) {
      run('/hello -c -s http://localhost:9999/server1,http://localhost:9999/server1', function (error, stdout, stderr) {
        expect(stderr).to.match(/Error\:/i)
        expect(stderr).to.match(/all requests failed/i)
        expect(stderr).to.match(/\(1000\)/)
        done()
      })
    })
  })

  describe('--discovery-servers', function () {
    before(function (done) {
      server = new Stubby()
      server.start({
        stubs: 9999,
        data: [{
          request: { url: '/discovery1' },
          response: { status: 500, body: 'hello' }
        }, {
          request: { url: '/discovery2' },
          response: { status: 200, body: ['http://localhost:9999/server'] }
        }, {
          request: { url: '/server/hello' },
          response: { status: 200, body: 'hello' }
        }]
      }, done)
    })

    after(function (done) {
      server.stop(done)
    })

    it('should print the response status code', function (done) {
      run('/hello -c -z http://localhost:9999/discovery1,http://localhost:9999/discovery2', function (error, stdout) {
        expect(stdout).to.match(/200/)
        done()
      })
    })

    it('should print the error status code if servers are invalid', function (done) {
      run('/hello -c -z http://localhost:9999/discovery1,http://localhost:9999/discovery1', function (error, stdout, stderr) {
        expect(stderr).to.match(/Error\:/i)
        expect(stderr).to.match(/all requests failed/i)
        expect(stderr).to.match(/\(1000\)/)
        done()
      })
    })
  })

  describe('--discover', function () {
    before(function (done) {
      server = new Stubby()
      server.start({
        stubs: 9999,
        data: [{
          request: { url: '/discovery1' },
          response: { status: 500, body: 'hello' }
        }, {
          request: { url: '/discovery2' },
          response: { status: 200, body: ['http://localhost:9999/server'] }
        }]
      }, done)
    })

    after(function (done) {
      server.stop(done)
    })

    it('should print the server list', function (done) {
      run('--discover -z http://localhost:9999/discovery1,http://localhost:9999/discovery2', function (error, stdout) {
        expect(stdout).to.match(/http:\/\/localhost\:9999/)
        done()
      })
    })

    it('should print the error status code if servers are invalid', function (done) {
      run('--discover -z http://localhost:9999/discovery1,http://localhost:9999/discovery1', function (error, stdout, stderr) {
        expect(stderr).to.match(/Error\:/i)
        expect(stderr).to.match(/all requests failed/i)
        expect(stderr).to.match(/\(1000\)/)
        done()
      })
    })
  })

  describe('direct URL request', function () {
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

})
