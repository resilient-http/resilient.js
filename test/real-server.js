var Resilient = require('../')
var expect = require('chai').expect

describe('Real server', function () {
  if (typeof window === 'undefined') return;

  describe('basic client', function () {
    var client = Resilient({
      discovery: {
        timeout: 250,
        retry: 0,
        servers: [
          'http://localhost:8882/discovery/valid/1',
          'http://localhost:8882/discovery/valid/2'
        ]
      }
    })

    it('should perform a GET request', function (done) {
      client.get('/', { timeout: 250 }, function (err, res) {
        console.log(err)
        expect(res.status).to.be.equal(200)
        done()
      })
    })

    xit('should perform a POST request', function (done) {
      client.post('/', { timeout: 250, data: { hello: 'world' } }, function (err, res) {
        expect(res.status).to.be.equal(200)
        done()
      })
    })

    xit('should perform a PUT request', function (done) {
      client.put('/', { timeout: 250, data: { hello: 'world' } }, function (err, res) {
        expect(res.status).to.be.equal(200)
        done()
      })
    })

    xit('should perform a DELETE request', function (done) {
      client.del('/', { timeout: 250, data: { hello: 'world' } }, function (err, res) {
        expect(res.status).to.be.equal(200)
        done()
      })
    })

    xit('should perform a HEAD request', function (done) {
      client.head('/', { timeout: 250, data: { hello: 'world' } }, function (err, res) {
        expect(res.status).to.be.equal(200)
        done()
      })
    })

    xit('should perform a PATCH request', function (done) {
      client.patch('/', { timeout: 250, data: { hello: 'world' } }, function (err, res) {
        expect(res.status).to.be.equal(200)
        done()
      })
    })
  })
})
