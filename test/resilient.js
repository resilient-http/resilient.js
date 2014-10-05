var expect = require('chai').expect
var nock = require('nock')
var Resilient = require('../')

describe('Resilient', function () {
  describe('public API', function () {
    it('should expose the resilient object as global', function () {
      expect(Resilient).to.be.a('function')
    })

    it('should have a valid version', function () {
      expect(Resilient.VERSION).to.be.equal(require('../package.json').version)
    })

    it('should expose the defaults options', function () {
      expect(Resilient.defaults).to.be.an('object')
    })

    it('should expose the Client constructor', function () {
      expect(Resilient.Client).to.be.a('function')
    })

    it('should expose the Servers constructor', function () {
      expect(Resilient.Servers).to.be.a('function')
    })

    it('should expose the Options constructor', function () {
      expect(Resilient.Options).to.be.a('function')
    })
  })

  describe('request using a custom URL as path', function () {
    var resilient = Resilient()
    var url = 'http://server'

    before(function () {
      nock(url).get('/hello').reply(200)
    })

    after(function () {
      nock.cleanAll()
    })

    it('should return a valid response code', function () {
      resilient.get(url + '/hello', function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
      })
    })
  })

  xdescribe('servers status', function () {
    var resilient = Resilient()

    before(function () {
      nock(url).get('/hello').reply(200)
    })

    it('should not have discovery servers configured', function () {
      expect(resilient.getOptions())
      resilient.get('/hello', function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
      })
    })
  })
})
