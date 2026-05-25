/* global describe, it */

const {
  parseArgs,
  hideInstrumenteeArgs,
  hideInstrumenterArgs
} = require('../lib/parse-args')

const { join, resolve } = require('path')

describe('parse-args', () => {
  describe('hideInstrumenteeArgs', () => {
    it('hides arguments passed to instrumented app', () => {
      process.argv = ['node', 'c8', '--foo=99', 'my-app', '--help']
      const instrumenterArgs = hideInstrumenteeArgs()
      instrumenterArgs.should.eql(['--foo=99', 'my-app'])
    })
  })

  describe('hideInstrumenterArgs', () => {
    it('hides arguments passed to c8 bin', () => {
      process.argv = ['node', 'c8', '--foo=99', 'my-app', '--help']
      const argv = parseArgs().parse(hideInstrumenteeArgs())
      const instrumenteeArgs = hideInstrumenterArgs(argv)
      instrumenteeArgs.should.eql(['my-app', '--help'])
      argv['temp-directory'].endsWith(join('coverage', 'tmp')).should.be.equal(true)
    })
  })

  describe('with NODE_V8_COVERAGE already set', () => {
    it('should not override it', () => {
      const NODE_V8_COVERAGE = process.env.NODE_V8_COVERAGE
      process.env.NODE_V8_COVERAGE = './coverage/tmp_'
      process.argv = ['node', 'c8', '--foo=99', 'my-app', '--help']
      const argv = parseArgs().parse(hideInstrumenteeArgs())
      argv['temp-directory'].endsWith('/coverage/tmp_').should.be.equal(true)
      process.env.NODE_V8_COVERAGE = NODE_V8_COVERAGE
    })
  })

  describe('--reports-dir', () => {
    it('should allow relative path reports directories', () => {
      const argsArray = ['node', 'c8', '--lines', '100', '--reports-dir', './coverage_']
      const argv = parseArgs().parse(argsArray)
      argv['reports-dir'].should.be.equal('./coverage_')
    })
    it('should allow absolute path reports directories', () => {
      const tmpDir = resolve(process.cwd(), 'coverage_')
      const argsArray = ['node', 'c8', '--lines', '100', '--reports-dir', tmpDir]
      const argv = parseArgs().parse(argsArray)
      argv['reports-dir'].should.be.equal(tmpDir)
    })
  })

  describe('--temp-directory', () => {
    it('should allow relative path temporary directories', () => {
      const argsArray = ['node', 'c8', '--lines', '100', '--temp-directory', './coverage/tmp_']
      const argv = parseArgs().parse(argsArray)
      argv['temp-directory'].should.be.equal('./coverage/tmp_')
    })
    it('should allow absolute path temporary directories', () => {
      const tmpDir = resolve(process.cwd(), './coverage/tmp_')
      const argsArray = ['node', 'c8', '--lines', '100', '--temp-directory', tmpDir]
      const argv = parseArgs().parse(argsArray)
      argv['temp-directory'].should.be.equal(tmpDir)
    })
  })

  describe('--merge-async', () => {
    it('should default to false', () => {
      const argv = parseArgs().parse(['node', 'c8'])
      argv['merge-async'].should.be.equal(false)
    })

    it('should set to true when flag exists', () => {
      const argv = parseArgs().parse(['node', 'c8', '--merge-async'])
      argv['merge-async'].should.be.equal(true)
    })
  })
})
