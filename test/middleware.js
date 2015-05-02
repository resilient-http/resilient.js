var expect = require('chai').expect
var sinon = require('sinon')
var nock = require('nock')
var Resilient = require('../')
var Middleware = require('../lib/middleware')

describe('Middleware', function () {
  var middleware = null

  beforeEach(function () {
    middleware = new Middleware()
  })

  it('should register multiple middlewares', function (done) {
    var spy = sinon.spy()

    function md(opts, resilient) {
      return function (next) {
        spy(opts, resilient);
        setTimeout(next, Math.random() * 10)
      }
    }

    var resilient = Resilient()
    var opts = resilient.options('service')

    middleware.use(resilient, [ md, md ])
    middleware.run('service', 'out')(assert)

    function assert() {
      expect(spy.calledTwice).to.be.true
      expect(spy.calledWith(opts, resilient)).to.be.true
      done()
    }
  })

  /*
  describe('discovery', function () {
    var spy = null, _err_, _res_

    function middleware(params) {
      return function (options, resilient) {
        spy = sinon.spy()
        require('request')(options, function (err, res) {
          spy(err, res)
          cb(err, res)
        })
      }
    }

    var resilient = Resilient()

    resilient.use(middleware)

    before(function () {
      nock('http://server')
        .filteringPath(/\?(.*)/g, '')
        .get('/')
        .reply(200, ['http://api'])
      nock('http://api')
        .get('/hello')
        .reply(200, { hello: 'world' })
    })

    after(function () {
      nock.cleanAll()
    })

    it('should perform a request a valid request', function (done) {
      resilient.get('/hello', function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        _err_ = err
        _res_ = res
        done()
      })
    })

    it('should use the HTTP proxy client', function () {
      expect(spy.calledOnce).to.be.true
      expect(spy.calledWith(_err_, _res_)).to.be.true
    })

    it('should restore to the native HTTP client', function () {
      resilient.restoreHttpClient()
      expect(resilient._httpClient).to.be.null
    })
  })
  */
})
