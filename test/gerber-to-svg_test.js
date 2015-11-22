// test suite for gerber-to-svg
'use strict'

var events = require('events')
var stream = require('readable-stream')
// var sinon = require('sinon')
var chai = require('chai')
// var sinonChai = require('sinon-chai')
// var proxyquire = require('proxyquire')

var expect = chai.expect
// chai.use(sinonChai)

var gerberToSvg = require('../lib/gerber-to-svg')

var EMPTY_SVG = [
  '<svg id="test-id" ',
  'xmlns="http://www.w3.org/2000/svg" ',
  'version="1.1" ',
  'xmlns:xlink="http://www.w3.org/1999/xlink" ',
  'stroke-linecap="round" ',
  'stroke-linejoin="round" ',
  'stroke-width="0" ',
  'fill-rule="evenodd" ',
  'width="0" ',
  'height="0" ',
  'viewBox="0 0 0 0">',
  '</svg>'].join('')

describe('gerber to svg', function() {
  it('return a readable stream if no callback passed', function() {
    var converter = gerberToSvg('', 'test-id')
    expect(converter).to.be.an.instanceof(stream.Readable)
  })

  it('should just return an event emitter if callback is passed', function() {
    var converter = gerberToSvg('', 'test-id', function() {})
    expect(converter).to.not.be.an.instanceOf(stream.Readable)
    expect(converter).to.be.an.instanceOf(events.EventEmitter)
  })

  it('should handle a stream input in streaming mode', function(done) {
    var input = new stream.PassThrough()
    var converter = gerberToSvg(input, 'test-id')
    var result = ''

    var handleReadable = function() {
      var data
      do {
        data = converter.read() || ''
        result += data
      } while (data)
    }

    converter.on('readable', handleReadable)
    converter.on('end', function() {
      converter.removeListener('readable', handleReadable)
      expect(result).to.equal(EMPTY_SVG)
      done()
    })

    input.write('G04 empty gerber*\n')
    input.write('M02*\n')
    input.end()
  })

  it('should handle a string input in streaming mode', function(done) {
    var input = 'G04 empty gerber*\nM02*\n'
    var converter = gerberToSvg(input, 'test-id')
    var result = ''

    var handleReadable = function() {
      var data
      do {
        data = converter.read() || ''
        result += data
      } while (data)
    }

    converter.on('readable', handleReadable)
    converter.on('end', function() {
      converter.removeListener('readable', handleReadable)
      expect(result).to.equal(EMPTY_SVG)
      done()
    })
  })

  it('should handle a stream input in callback mode', function(done) {
    var input = new stream.PassThrough()
    gerberToSvg(input, 'test-id', function(error, result) {
      expect(error).to.be.null
      expect(result).to.equal(EMPTY_SVG)
      done()
    })

    input.write('G04 empty gerber*\n')
    input.write('M02*\n')
    input.end()
  })

  it('should handle a string input in callback mode', function(done) {
    var input = 'G04 empty gerber*\nM02*\n'
    gerberToSvg(input, 'test-id', function(error, result) {
      expect(error).to.be.null
      expect(result).to.equal(EMPTY_SVG)
      done()
    })
  })

  it('should pass the id to plotter-to-svg when it is a string', function(done) {
    gerberToSvg('', 'foo', function(error, result) {
      expect(error).to.be.null
      expect(result).to.match(/id="foo"/)
      done()
    })
  })

  it('should pass the id in an object', function(done) {
    gerberToSvg('', {id: 'bar'}, function(error, result) {
      expect(error).to.be.null
      expect(result).to.match(/id="bar"/)
      done()
    })
  })

  it('should throw an error if id is missing', function() {
    expect(function() {gerberToSvg('', {})}).to.throw(/id required/)
  })

  it('should pass the class option', function(done) {
    gerberToSvg('', {id: 'foo', class: 'bar'}, function(error, result) {
      expect(error).to.be.null
      expect(result).to.match(/class="bar"/)
      done()
    })
  })

  it('should pass the color option', function(done) {
    gerberToSvg('', {id: 'foo', color: 'red'}, function(error, result) {
      expect(error).to.be.null
      expect(result).to.match(/color="red"/)
      done()
    })
  })

  describe('passing along warnings', function() {
    it('should emit warnings from the parser in streaming mode', function(done) {
      var converter = gerberToSvg('foobar*\n', 'foobar')

      converter.once('warning', function(w) {
        expect(w.line).to.equal(0)
        expect(w.message).to.exist
        done()
      })
    })

    it('should emit warnings from the parser in callback mode', function(done) {
      var converter = gerberToSvg('foobar*\n', 'foobar', function() {})

      converter.once('warning', function(w) {
        expect(w.line).to.equal(0)
        expect(w.message).to.exist
        done()
      })
    })

    it('should emit warnings from the plotter in streaming mode', function(done) {
      var converter = gerberToSvg('%FSLAX23Y23*%\nD10*\n', 'foobar', function() {})

      converter.once('warning', function(w) {
        expect(w.line).to.equal(1)
        expect(w.message).to.exist
        done()
      })
    })

    it('should emit warnings from the plotter in callback mode', function(done) {
      var converter = gerberToSvg('%FSLAX23Y23*%\nD10*\n', 'foobar', function() {})

      converter.once('warning', function(w) {
        expect(w.line).to.equal(1)
        expect(w.message).to.exist
        done()
      })
    })
  })
})