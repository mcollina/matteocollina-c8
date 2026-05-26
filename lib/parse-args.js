'use strict'

const { parseArgs } = require('node:util')
const defaultExclude = require('@istanbuljs/schema/default-exclude')
const defaultExtension = require('@istanbuljs/schema/default-extension')
const { readFileSync, existsSync } = require('fs')
const { resolve } = require('path')

/**
 * Apply "extends" in a config file: resolve the extends path relative to cwd,
 * load it, and merge with the current config (current overrides extended).
 */
function applyExtends (config, cwd) {
  if (!config.extends) return config
  const extPath = resolve(cwd, config.extends)
  const extConfig = JSON.parse(readFileSync(extPath))
  delete config.extends
  return { ...applyExtends(extConfig, cwd), ...config }
}

function loadConfigFile (configPath) {
  return applyExtends(JSON.parse(readFileSync(configPath)), process.cwd())
}

/** Canonical option definitions — keys match CLI long options exactly. */
const OPTION_DEFS = {
  config:              { type: 'string',  short: 'c' },
  reporter:            { type: 'string',  short: 'r',  multiple: true,  default: 'text' },
  'reports-dir':       { type: 'string',  short: 'o',  default: './coverage' },
  all:                 { type: 'boolean',               default: false },
  src:                 { type: 'string',                default: undefined, multiple: true },
  'exclude-node-modules': { type: 'boolean',            default: true },
  include:             { type: 'string',  short: 'n',   multiple: true,  default: [] },
  exclude:             { type: 'string',  short: 'x',   multiple: true,  default: defaultExclude },
  extension:           { type: 'string',  short: 'e',   multiple: true,  default: defaultExtension },
  'exclude-after-remap': { type: 'boolean', short: 'a', default: false },
  'skip-full':         { type: 'boolean',               default: false },
  'check-coverage':    { type: 'boolean',               default: false },
  branches:            { type: 'string',                default: '0' },
  functions:           { type: 'string',                default: '0' },
  lines:               { type: 'string',                default: '90' },
  statements:          { type: 'string',                default: '0' },
  'per-file':          { type: 'boolean',               default: false },
  '100':               { type: 'boolean',               default: false },
  'temp-directory':    { type: 'string',                default: undefined },
  clean:               { type: 'boolean',               default: true },
  resolve:             { type: 'string',                default: '' },
  'wrapper-length':    { type: 'string',                default: undefined },
  'omit-relative':     { type: 'boolean',               default: true },
  allowExternal:       { type: 'boolean',               default: false },
  'merge-async':       { type: 'boolean',               default: false },
  'experimental-monocart': { type: 'boolean',           default: false },
  help:                { type: 'boolean',  short: 'h',  default: false },
  version:             { type: 'boolean',               default: false }
}

/** Return a plain options object for parseArgs (no defaults — we want to
 *  distinguish CLI-provided values from defaults during merge). */
function parseArgsOptions () {
  const opts = {}
  for (const [key, def] of Object.entries(OPTION_DEFS)) {
    const o = { type: def.type }
    if (def.short) o.short = def.short
    if (def.multiple) o.multiple = def.multiple
    opts[key] = o
  }
  return opts
}

// ---------------------------------------------------------------------------
//  Public API
// ---------------------------------------------------------------------------

/**
 * parse(args) → argv-like object
 *
 * This is the replacement for yargs' .parse().
 * It returns an object with the same keys as OPTION_DEFS (hyphenated where
 * applicable) plus `_` (positionals) and `_command` (first positional).
 *
 * BREAKING CHANGES vs the old yargs-based API:
 *   - All keys are hyphenated, exactly as defined (no camelCase aliases).
 *   - Boolean flags use `--flag` / `--no-flag` (not `--flag=false`).
 *   - Config files are NOT auto-discovered from `.nycrc` / `.c8rc` — you must
 *     pass `--config path` explicitly.
 *   - Package.json `"c8"` config is NOT loaded automatically.
 *   - The `--100` shortcut is NOT implemented.
 *   - `--help` / `--version` exit with the help/version text.
 */
function parseArgsWrapper () {
  return {
    parse (inputArgs) {
      const args = inputArgs || process.argv.slice(2)

      const parsed = parseArgs({
        args,
        options: parseArgsOptions(),
        allowPositionals: true,
        strict: false
      })

      const { values, positionals } = parsed

      // --help / --version
      if (values.help) {
        console.log(buildHelpText())
        process.exit(0)
      }
      if (values.version) {
        const pkg = JSON.parse(readFileSync(resolve(__dirname, '..', 'package.json')))
        console.log(pkg.version)
        process.exit(0)
      }

      // Command detection
      const command = positionals[0]

      // Merge sources: defaults ← config ← pkgConf ← CLI
      const result = {}
      for (const [key, def] of Object.entries(OPTION_DEFS)) {
        result[key] = def.default
      }

      // Config file (only if --config was given explicitly)
      if (values.config && existsSync(values.config)) {
        const config = loadConfigFile(values.config)
        Object.assign(result, config)
      }

      // CLI values (highest priority)
      for (const [key, value] of Object.entries(values)) {
        if (value !== undefined) {
          result[key] = value
        }
      }

      // Normalise numeric values
      for (const key of ['branches', 'functions', 'lines', 'statements']) {
        result[key] = Number(result[key])
      }
      if (result['wrapper-length'] !== undefined) {
        result['wrapper-length'] = Number(result['wrapper-length'])
      }

      // Temp-directory fallback
      if (!result['temp-directory']) {
        result['temp-directory'] = process.env.NODE_V8_COVERAGE ||
          resolve(result['reports-dir'] || './coverage', 'tmp')
      }

      // Add positionals
      result._ = positionals
      result._command = command

      return result
    }
  }
}

function buildHelpText () {
  return `Usage: c8 [opts] [script] [opts]

Options:
  --config, -c             path to JSON configuration file
  --reporter, -r           coverage reporter(s) to use (default: 'text')
  --reports-dir, -o        directory where coverage reports will be output to (default: './coverage')
  --all                    consider all src files in cwd when determining coverage
  --src                    override cwd as default location where --all looks for src files
  --exclude-node-modules   exclude all node_module folders (default: true)
  --include, -n            specific files that should be covered
  --exclude, -x            specific files and directories to exclude from coverage
  --extension, -e          specific file extensions that should be covered
  --exclude-after-remap, -a  apply exclude logic after remapping by source-map
  --skip-full              do not show files with 100% coverage
  --check-coverage         check whether coverage is within thresholds
  --branches               required % of branches coverage
  --functions              required % of functions coverage
  --lines                  required % of lines coverage
  --statements             required % of statements coverage
  --per-file               check thresholds per file
  --100                    shortcut for 100%% coverage thresholds
  --temp-directory         directory V8 coverage data is written to and read from
  --clean                  delete temp files before script execution (default: true)
  --resolve                resolve paths to alternate base directory
  --wrapper-length         wrapper prefix bytes on executed JavaScript
  --omit-relative          omit non-absolute paths (default: true)
  --allowExternal          allow files from outside of cwd
  --merge-async            merge v8 coverage reports asynchronously
  --experimental-monocart  use Monocart coverage reports
  --help, -h               show this help message
  --version                show version number

Visit https://git.io/vHysA for list of available reporters`
}

function hideInstrumenterArgs (yargv) {
  let argv = process.argv.slice(1)
  argv = argv.slice(argv.indexOf(yargv._[0]))
  if (argv[0] && argv[0][0] === '-') {
    argv.unshift(process.execPath)
  }
  return argv
}

function hideInstrumenteeArgs () {
  let argv = process.argv.slice(2)
  const parsed = parseArgs({
    args: argv,
    options: {},
    allowPositionals: true,
    strict: false
  })

  if (!parsed.positionals.length) return argv

  const firstPos = parsed.positionals[0]
  const idx = argv.indexOf(firstPos)
  if (idx === -1) return argv

  argv = argv.slice(0, idx)
  argv.push(firstPos)

  return argv
}

module.exports = {
  parseArgs: parseArgsWrapper,
  hideInstrumenterArgs,
  hideInstrumenteeArgs
}
