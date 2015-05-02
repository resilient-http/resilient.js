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
        spy(opts, resilient)
        setTimeout(next, Math.random() * 10)
      }
    }

    var resilient = Resilient()
    var opts = resilient.options('service')

    middleware.use(resilient, [ md, md ])
    middleware.run('service', 'in')(assert)

    function assert() {
      expect(spy.calledTwice).to.be.true
      expect(spy.calledWith(opts, resilient)).to.be.true
      done()
    }
  })

  describe('discovery', function () {
    var spy = sinon.spy()

    middleware.type = 'discovery'
    function middleware(options, resilient) {
      return {
        in: function (err, res, next) {
          res.data = [ res.data.shift().url ]
          spy()
          next()
        },
        out: function (opts, next) {
          spy()
          next()
        }
      }
    }

    var resilient = Resilient({
      discovery: {
        refreshPath: '/service/discovery',
        servers: ['http://discovery'],
        refreshServersInterval: -1,
        enableSelfRefresh: true
      }
    })
    resilient.use(middleware)

    before(function () {
      nock('http://discovery')
        .filteringPath(/\?_time=[^&]*/g, '')
        .get('/service/discovery')
        .reply(200, [{ url: 'http://discovery' }])
      nock('http://discovery')
        .filteringPath(/\?_time=[^&]*/g, '')
        .get('/')
        .reply(200, [{ url: 'http://api' }])
      nock('http://api')
        .get('/hello')
        .reply(200, { hello: 'world' })
    })

    after(function () {
      nock.cleanAll()
    })

    it('should perform a valid request', function (done) {
      resilient.get('/hello', function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        done()
      })
    })

    it('should have the proper calls in the spy', function () {
      expect(spy.callCount === 4).to.be.true
    })
  })

  describe('service', function () {
    var spy = sinon.spy()

    middleware.type = 'service'
    function middleware(options, resilient) {
      return {
        in: function (err, res, next) {
          spy()
          next()
        },
        out: function (servers, options, next) {
          spy()
          next()
        }
      }
    }

    var resilient = Resilient({
      service: {
        servers: ['http://server']
      }
    })
    resilient.use(middleware)

    before(function () {
      nock('http://server')
        .get('/hello')
        .reply(200, [{ data: 'Hello World' }])
    })

    after(function () {
      nock.cleanAll()
    })

    it('should perform a valid request', function (done) {
      resilient.get('/hello', function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        done()
      })
    })

    it('should have the proper calls in the spy', function () {
      expect(spy.callCount === 2).to.be.true
    })
  })

})
