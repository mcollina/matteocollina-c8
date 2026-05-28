#!/usr/bin/env node
'use strict'

const { foregroundChild } = require('foreground-child')
const { outputReport } = require('../lib/commands/report')
const { rm, mkdir } = require('fs/promises')
const {
  parseArgs,
  hideInstrumenteeArgs,
  hideInstrumenterArgs
} = require('../lib/parse-args')

const { checkCoverages } = require('../lib/commands/check-coverage')
const Report = require('../lib/report')
const instrumenterArgs = hideInstrumenteeArgs()
let argv = parseArgs().parse(instrumenterArgs)

async function run () {
  if (argv._[0] === 'check-coverage') {
    argv = parseArgs().parse(process.argv.slice(2))
    const report = Report({
      include: argv.include,
      exclude: argv.exclude,
      extension: argv.extension,
      reporter: Array.isArray(argv.reporter) ? argv.reporter : [argv.reporter],
      reportsDirectory: argv['reports-dir'],
      tempDirectory: argv['temp-directory'],
      watermarks: argv.watermarks,
      resolve: argv.resolve,
      omitRelative: argv['omit-relative'],
      wrapperLength: argv['wrapper-length'],
      all: argv.all
    })
    await checkCoverages(argv, report)
  } else if (argv._[0] === 'report') {
    argv = parseArgs().parse(process.argv.slice(2))
    await outputReport(argv)
  } else {
    if (argv.clean) {
      await rm(argv['temp-directory'], { recursive: true, force: true })
    }

    await mkdir(argv['temp-directory'], { recursive: true })
    process.env.NODE_V8_COVERAGE = argv['temp-directory']
    foregroundChild(hideInstrumenterArgs(argv), async () => {
      try {
        await outputReport(argv)
        return process.exitCode
      } catch (err) {
        console.error(err.stack)
        return 1
      }
    })
  }
}

run().catch((err) => {
  console.error(err.stack)
  process.exitCode = 1
})
