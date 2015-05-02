var stream = require('stream')

function Request(options) {
  stream.Readable.call(this, options)
}

Request.prototype = Object.create(stream.Readable.prototype)

Request.prototype._read = function () {

}

Request.prototype.pipe = function (dest, opts) {
  stream.Stream.prototype.pipe.call(this, dest, opts)
}

Request.prototype.write = function () {

}

Request.prototype.end = function () {

}

Request.prototype.close =
Request.prototype.destroy = function () {}
