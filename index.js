const _ = require('lodash')
const moment = require('moment')
const path = require('path')

const { createLogger, format, transports, addColors } = require('winston')
require('winston-daily-rotate-file')

module.exports = ({ prefixFields = [], timestampFormat = 'YYYY-MM-DD HH:mm:ss', level = (process.env.NODE_ENV === 'production' ? 'info' : 'verbose'), headLength = 80, padLength = 12, customLevels, additionalTransports } = {}) => {
  const precisionMap = [
    { precision: 1e6, name: 'ms' },
    { precision: 1e3, name: 'µs' },
    { precision: 1, name: 'ns' },
  ]

  const myFormat = format.printf(({ timestamp, level, message, meta, e }) => {
    const fileName = _.get(meta, 'fileName') ? _.get(meta, 'fileName') + ' | ' : ''
    const functionName = _.get(meta, 'functionName') ? _.get(meta, 'functionName') + ' | ' : ''
    const subName = _.get(meta, 'sub') ? _.get(meta, 'sub') + ' | ' : ''

    let prefix = []
    let data = []
    _.forEach(prefixFields, item => {
      if (_.get(meta, _.get(item, 'field'))) {
        prefix.push(_.get(item, 'short'))
        data.push(_.get(meta, _.get(item, 'field')))
      }  
    })
    const prefixData = _.size(prefix) ? (_.join(prefix, '/') + ' ' + _.join(data, '/') + ' | ') : ''
    if (e instanceof Error) {
      // log the stack
      console.error(e)
      if (_.get(e, 'message')) message += ' | ' + _.get(e, 'message', '')
    }
    return `${timestamp} ${level} ${fileName}${functionName}${subName}${prefixData}${message}`
  })

  const logConfig = {
    level,
    format: format.combine(
      format.timestamp({
        format: timestampFormat
      }),
      format.errors({ stack: true }),
      format(info => {
        info.level = _.padEnd(info.level.toUpperCase(), 8)
        return info
      })(),
      format.colorize(),
      format.splat(),
      myFormat
    ),
    transports: [
      new transports.Console()
    ]
  }
  if (_.get(customLevels, 'levels')) _.set(logConfig, 'levels', _.get(customLevels, 'levels'))

  const acLogger = createLogger(logConfig)
  if (_.get(customLevels, 'colors')) addColors(_.get(customLevels, 'colors'))

  // Array of objects with type (e.g. File) and options for that type 
  if (_.size(additionalTransports)) {
    _.forEach(additionalTransports, additionalTransport => {
      const transport = new transports[additionalTransport.type](additionalTransport.options)
      if (_.has(additionalTransport, 'onRotate')) transport.on('rotate', additionalTransport.onRotate)
      acLogger.add(transport)
    })
  }
  
  if (process.env.NODE_ENV === 'test') {
    acLogger.add(new transports.File({
      filename: 'test.log',
      level: 'debug'
    }))
  }

  const headline = (params) => {
    acLogger.info('')
    const fill = _.get(params, 'headFill', '*')
    acLogger.info('%s', _.pad(' ' + _.toUpper(_.get(params, 'headline')) + ' ', headLength, fill))
  }

  const functionStartLine = (params) => {
    const fill = _.get(params, 'headFill', '_')
    acLogger.info('%s', _.pad(' ' + _.toUpper(_.get(params, 'headline')) + ' ', headLength, fill))
  }

  const listing = (params) => {
    const field = _.upperFirst(_.get(params, 'field'))
    const value = _.get(params, 'value')
    const level = _.get(params, 'level', 'info')
//    const padField = _.get(meta, 'padField') ? (_.padEnd((_.get(meta, 'padField.field') + ': '), _.get(meta, 'padField.padLength', padLength)) + (_.get(meta, 'padField.value') === 200 ? '\x1b[32mSuccessful\x1b[0m' : _.get(meta, 'padField.value'))) : ''
    const message = _.padEnd((field + _.get(params, 'separator', '')), _.get(params, 'padLength', padLength)) + (value === 200 ? '\x1b[32mSuccessful\x1b[0m' : value)
    acLogger[level](message)
  }

  const hrLine = (params) => {
    const length = _.get(params, 'headLength', headLength)
    acLogger.info(_.repeat('-', length))
  }

  const bootstrapInfo = ({ appName = 'App name missing', branch }) => {
    const pwd = process.cwd()
    const pjson = require(path.resolve(pwd, 'package.json'))
    const environment = process.env.NODE_ENV || 'development'
    const padLength = 15
    acLogger.info('')
    hrLine()
    listing({ field: 'Time', value: moment().format('YYYY-MM-DD HH:mm:ss'), padLength })
    listing({ field: 'Environment', value: environment, padLength })
    if (branch) listing({ field: 'Branch', value: branch, padLength })
    listing({ field: 'Version', value: pjson.version, padLength })
    listing({ field: 'AppName', value: appName, padLength })
    acLogger.info('')
    listing({ field: 'BOOTSTRAPPING', value:  '\x1b[32mSuccessful\x1b[0m', padLength })   
    acLogger.info(_.repeat('-', headLength))
    hrLine()
  }

  /**
   * Logs typical infos (bootstrap) for servers
   * Instance, host, port, db, 
   * and connection
   */
  const serverInfo = (params) => {
    const fields = ['instance', 'server', 'host', 'port', 'version', 'cluster', 'clusterVersion', 'ssl', 'db', 'database', 'index', 'user']
    _.forEach(fields, field => {
      if (_.get(params, field)) {
        listing({ field: _.upperFirst(field), value: _.get(params, field) })
      }
    })
    listing({ field: 'Connection', value: '\x1b[32mSuccessful\x1b[0m' })
  }

  
  const acSESnfo = (params) => {
    const fields = [
      { field: 'aws.accessKeyId', name: 'AWS AcccesKey' },
      { field: 'defaultSender.address', name: 'Default Sender' },
      { field: 'supportRecipient.address', name: 'Support' },
    ]
    _.forEach(fields, field => {
      if (_.get(params, field.field)) {
        listing({ field: field.name, value: _.get(params, field.field), padLength: 15 })
      }
    })
  }

  const timeEnd = (profile, start, precision = 1e6) => {
    const end = process.hrtime.bigint()
    const div = BigInt(precision)
    const sec = _.find(precisionMap, { precision })
    const s =  (end - start)/div
    acLogger.debug(`Profiling | ${profile} | ${s}${sec.name}`)
  }

  return {
    acLogger,
    headline,
    functionStartLine,
    listing,
    bootstrapInfo,
    serverInfo,
    acSESnfo,
    timeEnd,
    hrLine
  }
}