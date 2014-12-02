var expect = require('chai').expect
var _ = require('../lib/utils')

describe('utils', function () {
  describe('now', function () {
    it('should be return a timestamp', function () {
      expect(_.now()).to.be.a('number')
    })
  })

  describe('isObj', function () {
    it('should be a plain object', function () {
      expect(_.isObj({})).to.be.true
      expect(_.isObj(new Object)).to.be.true
      expect(_.isObj(Object.create(null))).to.be.true
    })

    it('should not be a plain object', function () {
      expect(_.isObj([])).to.be.false
      expect(_.isObj('')).to.be.false
      expect(_.isObj(1)).to.be.false
      expect(_.isObj(undefined)).to.be.false
      expect(_.isObj(null)).to.be.false
      expect(_.isObj(new Date)).to.be.false
      expect(_.isObj(/^[a-z]/)).to.be.false
    })
  })

  describe('isArr', function () {
    it('should be a plain array', function () {
      expect(_.isArr([])).to.be.true
      expect(_.isArr(new Array)).to.be.true
    })

    it('should not be a plain array', function () {
      expect(_.isArr({})).to.be.false
      expect(_.isArr('')).to.be.false
      expect(_.isArr(1)).to.be.false
      expect(_.isArr(undefined)).to.be.false
      expect(_.isArr(null)).to.be.false
      expect(_.isArr(new Date)).to.be.false
      expect(_.isArr(/^[a-z]/)).to.be.false
    })
  })

  describe('emptyObject', function() {
    it('should create a plain object without inherited prototype', function () {
      expect(_.emptyObject()).to.be.an('object')
      expect(_.emptyObject().hasOwnProperty).to.be.undefined
    })
  })

  describe('bind', function () {
    it('should be bind a context', function () {
      expect(_.bind(_, function () { return typeof this.bind })()).to.be.equal('function')
    })
  })

  describe('each', function () {
    it('should be iterate an array ', function () {
      var times = 0
      _.each([1], function (val) { times += val })
      expect(times).to.be.equal(1)
    })

    it('should be iterate an object', function () {
      var times = 0
      _.each({x:1}, function (key, val) { times += val })
      expect(times).to.be.equal(1)
    })
  })

  describe('omit', function () {
    it('should omit the keys from an object', function () {
      var o = {x: 1, y: 2}
      var r =_.omit(o, ['x'], function (val) { times += val })
      expect(r).to.not.be.equal(o)
      expect(r).to.have.property('y')
      expect(r).to.not.have.property('x')
      expect(r.y).to.be.equal(2)
    })
  })

  describe('extend', function () {
    it('should union members from an object', function () {
      var o = {x:1}
      expect(_.extend(o, {y:1})).to.be.equal(o)
      expect(_.extend(o, {y:1})).to.be.deep.equal({x:1, y:1})
    })

    it('should union members from multiple objects', function () {
      var o = {x:1}
      expect(_.extend(o, {y:1}, {z:1})).to.be.equal(o)
      expect(_.extend(o, {y:1}, {z:1})).to.be.deep.equal({x:1, y:1, z:1})
    })
  })

  describe('merge', function () {
    it('should deeply merge two nested objects', function () {
      var o = {x: {y:1}, y:1}
      expect(_.merge(o, {x:{z:1},z:1})).to.be.equal(o)
      expect(_.merge(o, {x:{z:1},z:1})).to.be.deep.equal({
        x: {y:1, z:1}, y:1, z:1
      })
    })

    it('should union members from multiple objects', function () {
      var o = {x:1}
      expect(_.extend(o, {y:1}, {z:1})).to.be.equal(o)
      expect(_.extend(o, {y:1}, {z:1})).to.be.deep.equal({x:1, y:1, z:1})
    })
  })

  describe('clone', function () {
    it('should be clone an object', function () {
      var o = {}
      expect(_.clone(o)).to.not.be.equal(o)
    })

    it('should clone a non-object value', function () {
      expect(_.clone(null)).to.be.an('object')
    })
  })

  describe('noop', function () {
    it('should return a no operation function', function () {
      expect(_.noop).to.be.a('function')
      expect(_.noop()).to.be.undefined
    })
  })

  describe('join', function () {
    it('should join multiple valid paths', function () {
      expect(_.join('/base', '/name', '/')).to.be.equal('/base/name/')
      expect(_.join('/chuck', null, '/norris')).to.be.equal('/chuck/norris')
      expect(_.join('/base', '/name/', 'surname/', 'get')).to.be.equal('/base/name/surname/get')
    })
  })

  describe('isURI', function () {
    it('should match a valid URIs', function () {
      expect(_.isURI('http://test.org')).to.be.true
      expect(_.isURI('https://test.org')).to.be.true
    })

    it('should match a non valid URIs', function () {
      expect(_.isURI('/test.org')).to.be.false
      expect(_.isURI('https://')).to.be.false
      expect(_.isURI('ftp://')).to.be.false
      expect(_.isURI('app')).to.be.false
      expect(_.isURI(null)).to.be.false
    })
  })

  describe('delay', function () {
    it('should delay function execution the given miliseconds', function (done) {
      var start = Date.now()
      _.delay(function () {
        expect((Date.now() - start) > 1).to.be.true
        done()
      }, 10)
    })
  })
})
