var _ = require('./utils')
var http = resolveModule()

module.exports = client

function client() {
  return http.apply(null, arguments)
}

client.VERSION = http.VERSION
client.mapResponse = mapResponse

function resolveModule() {
  if (typeof window === 'object' && window) {
    return require('../bower_components/lil-http/http')
  } else {
    return requestWrapper(require('request'))
  }
}

function requestWrapper(request) {
  return function requester(options, cb) {
    if (typeof options === 'string') options = { url: options }
    options = setUserAgent(options)
    if (options.params) options.qs = options.params
    if (options.data) {
      mapRequestBody(options)
    }
    return request.call(null, options, mapResponse(cb))
  }
}

function mapResponse(cb) {
  return function (err, res, body) {
    if (res) {
      if (res.statusCode) {
        res.status = res.statusCode
      }
      if (body) {
        res.data = isJSONContent(res) ? JSON.parse(body) : body
      }
    }
    cb(err, res)
  }
}

function isJSONContent(res) {
  return typeof res.body === 'string' && /application\/json/i.test(res.headers['content-type'])
}

function setUserAgent(options) {
  options = options || {}
  options.headers = options.headers || {}
  options.headers['User-Agent'] = options.headers['User-Agent'] || getUserAgent()
  return options
}

function getUserAgent() {
  return 'resilient-http ' + client.LIBRARY_VERSION + ' (node)'
}

function mapRequestBody(options) {
  var body = options.data
  if (body && _.isObj(body) || _.isArr(body)) {
    options.json = true
    options.data = null
  }
  options.body = body
}
