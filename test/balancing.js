var expect = require('chai').expect
var nock = require('nock')
var sinon = require('sinon')
var _ = require('../lib/utils')
var Resilient = require('../')

var timer = _.timer;
function stubTimer(time) {
  _.timer = function () {
    return function () {
      return time || 1;
    }
  }
}

var results = {
  valid1: { time: 100, name: 'Chuck' },
  valid2: { time: 150, name: 'Norris' },
  valid3: { time: 200, name: 'Elthon' }
}

var correctResults = [
  'valid1',
  'valid2',
  'valid3',
  'valid1',
  'valid1',
  'valid1',
  'valid2',
  'valid1',
  'valid2',
  'valid3'
]

describe('Servers sorting', function () {
  if (process.env.CI) return

  describe('balance by best available server', function () {

    var resilient = Resilient({
      service: {
        timeout: 100,
        servers: [
          'http://unavailable',
          'http://timeout',
          'http://unavailable',
          'http://timeout',
          'http://valid1',
          'http://unavailable',
          'http://valid2',
          'http://valid3'
        ]
      },
      balancer: {
        roundRobin: false
      }
    })

    before(function () {
      nock('http://timeout')
        .persist()
        .filteringPath(function () { return '/' })
        .get('/')
        .socketDelay(150)
        .reply(200)
      nock('http://unavailable')
        .persist()
        .filteringPath(function () { return '/' })
        .get('/')
        .reply(503)

      nockCorrectServer('valid1')
      nockCorrectServer('valid2')
      nockCorrectServer('valid3')

      function nockCorrectServer (server) {
        nock('http://' + server)
          .persist()
          .get('/hello')
          .reply(200, { name: results[server].name })
      }
    })

    after(function () {
      _.timer = timer;
      nock.cleanAll()
    })

    correctResults.forEach(function (server) {
      it('should resolve with the ' + server + ' server', function (done) {
        stubTimer(results[server].time)

        resilient.get('/hello', function (err, res) {
          expect(err).to.be.null
          expect(res.status).to.be.equal(200)
          expect(res.data).to.be.deep.equal({ name: results[server].name })
          done()
        })
      })
    })

  })
})
