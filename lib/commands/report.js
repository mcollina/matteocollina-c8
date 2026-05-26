const { checkCoverages } = require('./check-coverage')
const Report = require('../report')

exports.command = 'report'

exports.describe = 'read V8 coverage data from temp and output report'

exports.handler = async function (argv) {
  await exports.outputReport(argv)
}

exports.outputReport = async function (argv) {
  const report = Report({
    include: argv.include,
    exclude: argv.exclude,
    extension: argv.extension,
    excludeAfterRemap: argv['exclude-after-remap'],
    reporter: Array.isArray(argv.reporter) ? argv.reporter : [argv.reporter],
    reportsDirectory: argv['reports-dir'],
    reporterOptions: argv.reporterOptions || {},
    tempDirectory: argv['temp-directory'],
    watermarks: argv.watermarks,
    resolve: argv.resolve,
    omitRelative: argv['omit-relative'],
    wrapperLength: argv['wrapper-length'],
    all: argv.all,
    allowExternal: argv.allowExternal,
    src: argv.src,
    skipFull: argv['skip-full'],
    excludeNodeModules: argv['exclude-node-modules'],
    mergeAsync: argv['merge-async'],
    monocartArgv: (argv['experimental-monocart'] || process.env.EXPERIMENTAL_MONOCART) ? argv : null
  })
  await report.run()
  if (argv['check-coverage']) await checkCoverages(argv, report)
}
