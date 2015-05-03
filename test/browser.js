describe('Browser', function () {
  if (typeof window === 'undefined') return;

  var Resilient = resilient
  var expect = chai.expect

  describe('embedded HTTP client', function () {
    var client = Resilient({
      discovery: {
        timeout: 250,
        retry: 0,
        servers: [
          'http://localhost:8882/discovery/fail',
          'http://localhost:8882/discovery/timeout',
          'http://localhost:8882/discovery/fail',
          'http://localhost:8882/discovery/timeout',
          'http://localhost:8882/discovery/valid/1',
          'http://localhost:8882/discovery/valid/2'
        ]
      }
    })

    it('should perform a GET request', function (done) {
      client.get('/', { timeout: 250 }, function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        done()
      })
    })

    it('should perform a POST request', function (done) {
      client.post('/', { timeout: 250, data: { hello: 'world' } }, function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        done()
      })
    })

    it('should perform a PUT request', function (done) {
      client.put('/', { timeout: 250, data: { hello: 'world' } }, function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        done()
      })
    })

    it('should perform a DELETE request', function (done) {
      client.del('/', { timeout: 250, data: { hello: 'world' } }, function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        done()
      })
    })

    it('should perform a HEAD request', function (done) {
      client.head('/', { timeout: 250, data: { hello: 'world' } }, function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        done()
      })
    })

    it('should perform a PATCH request', function (done) {
      client.patch('/', { timeout: 250, data: { hello: 'world' } }, function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        done()
      })
    })
  })

  describe('service', function () {
    var client = Resilient({
      service: {
        timeout: 250,
        retry: 0,
        servers: [
          'http://localhost:8882/server/unavailable',
          'http://localhost:8882/server/timeout',
          'http://localhost:8882/server/fail',
          'http://localhost:8882/server/delay',
          'http://localhost:8882/server/1'
        ]
      }
    })

    it('should perform a GET request', function (done) {
      client.get('/', { timeout: 250 }, function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        done()
      })
    })

    it('should perform a POST request', function (done) {
      client.post('/', { timeout: 250, data: { hello: 'world' } }, function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        done()
      })
    })

    it('should perform a PUT request', function (done) {
      client.put('/', { timeout: 250, data: { hello: 'world' } }, function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        done()
      })
    })

    it('should perform a DELETE request', function (done) {
      client.del('/', { timeout: 250, data: { hello: 'world' } }, function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        done()
      })
    })
  })

  describe('proxy HTTP client', function () {
    var client = Resilient({
      discovery: {
        timeout: 250,
        retry: 0,
        servers: [
          'http://localhost:8882/discovery/fail',
          'http://localhost:8882/discovery/timeout',
          'http://localhost:8882/discovery/fail',
          'http://localhost:8882/discovery/timeout',
          'http://localhost:8882/discovery/valid/1',
          'http://localhost:8882/discovery/valid/2'
        ]
      }
    })

    function httpProxy(options, cb) {
      options.success = function (data, status, xhr) {
        cb(null, { status: xhr.status, data: data, xhr: xhr })
      }
      options.error = function (xhr) {
        cb({ status: xhr.status, xhr: xhr })
      }
      $.ajax(options)
    }

    client.useHttpClient(httpProxy)

    it('should perform a GET request', function (done) {
      client.get('/', { timeout: 250 }, function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        done()
      })
    })

    it('should perform a POST request', function (done) {
      client.post('/', { timeout: 250, data: { hello: 'world' } }, function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        done()
      })
    })

    it('should perform a PUT request', function (done) {
      client.put('/', { timeout: 250, data: { hello: 'world' } }, function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        done()
      })
    })

    it('should perform a DELETE request', function (done) {
      client.del('/', { timeout: 250, data: { hello: 'world' } }, function (err, res) {
        expect(err).to.be.null
        expect(res.status).to.be.equal(200)
        done()
      })
    })
  })
})
