var _ = require('./utils')

var IS_BROWSER = typeof window === 'object' && window
var JSON_MIME = /application\/json/i
var http = resolveModule()

module.exports = HttpClient

function HttpClient () {
  return http.apply(null, arguments)
}

HttpClient.VERSION = http.VERSION
HttpClient.mapResponse = mapResponse

function mapResponse (cb) {
  return function (err, res, body) {
    if (res && res.statusCode) {
      res.status = res.statusCode
    }
    if (body) {
      try {
        (err || res).data = isJSONContent(err || res) ? JSON.parse(body) : body
      } catch (e) {
        err = e
      }
    }
    cb(err, res)
  }
}

function isJSONContent (res) {
  return typeof res.body === 'string' &&
    JSON_MIME.test(res.headers['content-type'])
}

function mapOptions (options) {
  if (typeof options === 'string') {
    options = { url: options }
  } else {
    options = options || {}
  }

  if (options.params) options.qs = options.params
  if (options.data) mapRequestBody(options)
  if (!IS_BROWSER) defineUserAgent(options)

  return options
}

function defineUserAgent (options) {
  options.headers = options.headers || {}

  if (!options.headers['User-Agent']) {
    options.headers['User-Agent'] = getUserAgent()
  }
}

function getUserAgent () {
  return 'resilient-http ' + HttpClient.LIBRARY_VERSION + ' (node)'
}

function mapRequestBody (options) {
  var body = options.data || options.body

  if (body && _.isObj(body) || _.isArr(body)) {
    options.json = true
    options.data = null
  }

  options.body = body
}

function resolveModule () {
  if (IS_BROWSER) {
    return require('lil-http')
  } else {
    return requestWrapper(require('request'))
  }
}

function requestWrapper (request) {
  return function requester (options, cb) {
    return request(mapOptions(options), mapResponse(cb))
  }
}
