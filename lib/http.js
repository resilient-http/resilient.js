var http = resolveModule()

module.exports = client

function client() {
  return http.apply(null, arguments)
}

function resolveModule() {
  if (typeof window === 'object' && window) {
    return require('../bower_components/lil-http/http')
  } else {
    return requestWrapper(require('request'))
  }
}

function requestWrapper(request) {
  return function (options, cb) {
    if (options && options.data) {
      options.body = options.data
    }
    return request.call(null, options, mapResponse(cb))
  }
}

function mapResponse(cb) {
  return function (err, res, body) {
    if (res) {
      res.status = res.statusCode
      if (body) {
        res.data = isJSONContent(res) ? JSON.parse(body) : body
      }
    }
    cb(err, res)
  }
}

function isJSONContent(res) {
  return res.headers['content-type'] === 'application/json'
}
