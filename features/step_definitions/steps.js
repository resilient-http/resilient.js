var expect = require('chai').expect
var _ = require('lodash')

module.exports = function () {
  var Given, When, Then
  Given = When = Then = this.defineStep
  this.World = require('../support/world').World

  function getOptions(type) {
    var options = this.options = this.options || {}
    return options[type] = options[type] || {}
  }

  function parseValue(str) {
    if (/[0-9]+/.test(str)) {
      return parseInt(str, 10)
    } else if (str === 'true') {
      return true
    } else if (str === 'false') {
      return false
    } else {
      return str
    }
  }

  function setOptionsTable(options, table, field) {
    options[field] = options[field] || {}
    table.rows().forEach(function () {})
  }

  function defineMock(row) {
    var url = row[0]
    var status = parseInt(row[1], 10)
    var method = row[2].toLowerCase()
    var delay = parseInt(row[3], 3)
    var body = row[4] === 'none' ? null : JSON.parse(row[4])
    this.mock(url)
      .persist()
      .filteringPath(function () { return '/' })
      [method]('/')
      .delayConnection(delay)
      .reply(status, body)
  }

  Given(/^the following ([a-z]+) options values:$/, function (type, data, done) {
    var options = getOptions.call(type)
    data.rows().forEach(function (pairs) {
      options[pairs.shift()] = parseValue(pairs.shift())
    })
    done()
  })

  Given(/^the following list of ([a-z]+) servers:$/, function (type, data, done) {
    var options = getOptions.call(this, type)
    options.servers = []
    data.rows().forEach(function (row) {
      options.servers.push(row[0])
      defineMock.call(this, row, true)
    }.bind(this))
    done()
  })

  Given(/^the following the service servers stubs:$/, function (data, done) {
    data.rows().forEach(defineMock.bind(this))
    done()
  })

  Given(/^new client is configured$/, function (done) {
    this.client = this.Resilient(this.options)
    done()
  })

  When(/^define a ([a-z]{3,6}) request to "(.*)"$/i, function (method, path, done) {
    this.config = { method: method.toLowerCase(), path: path }
    done()
  })

  When(/^performs the request$/, function (done) {
    this.client.send(this.config, function (err, res) {
      this.error = err
      this.response = res
      done()
    }.bind(this))
  })

  Then(/^the request has no errors$/, function (done) {
    expect(this.error).to.be.null
    done()
  })

  Then(/^the request has failed$/, function (done) {
    expect(this.error).to.be.an('object')
    done()
  })

  Then(/^(.*) status code should be ([0-9]{3,4})$/, function (type, status, done) {
    expect(this[type].status).to.be.equal(parseInt(status, 10))
    done()
  })

  Then(/^response data should have a "(.*)" field with data "(.*)"$/, function (field, data, done) {
    expect(this.response.data).to.have.property(field).that.is.equal(data)
    done()
  })
}
