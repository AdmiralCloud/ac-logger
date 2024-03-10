const _ = require('lodash')
const moment = require('moment')
const path = require('path')
const util = require('util')

const { createLogger, format, transports, addColors } = require('winston')
require('winston-daily-rotate-file')

module.exports = ({ prefixFields = [], timestampFormat = 'YYYY-MM-DD HH:mm:ss', level = (process.env.NODE_ENV === 'production' ? 'info' : 'verbose'), headLength = 80, padLength = 12, customLevels, transporters = [], applicationLogs = { enabled: false } } = {}) => {
  const precisionMap = [
    { precision: 1e6, name: 'ms' },
    { precision: 1e3, name: 'µs' },
    { precision: 1, name: 'ns' },
  ]

  const splatFormatter = format((data) => {
    // Check if splat is available and the message contains placeholder(s)
    if (data[Symbol.for('splat')] && /%[sjdifoO%]/.test(data.message)) {
      data.message = util.format(data.message, ...data[Symbol.for('splat')])
    }
    return data
  })

  const myFormat = format.printf((data) => {
    const level = data[Symbol.for('level')]
    // http log format
    if (level === 'http' && data?.controller) {
      // display accessKey, link (if applicable)
      let message = data?.message ? ` ${data.message}` : ''
      let cuid = data?.customerId ? data?.customerId : ''
      if (data?.userId) cuid += `/${data.userId} `
      return `${data?.timestamp} ${data?.level} ${data?.ip} ${data?.iso2 || ''} ${data?.accessKey || ''} ${cuid}${data?.controller} ${data?.action}${message} | ${data?.statusCode} | ${data?.performance?.executionTime}ms`
    }
    else {
      const meta = data?.meta
      // 
      let fileName = _.get(meta, 'fileName') ? _.get(meta, 'fileName') + ' | ' : ''
      let functionName = _.get(meta, 'functionName') ? _.get(meta, 'functionName') + ' | ' : _.get(data, 'functionName') ? _.get(data, 'functionName') + ' | ' : ''
      let subName = _.get(meta, 'sub') ? _.get(meta, 'sub') + ' | ' : _.get(data, 'sub') ? _.get(data, 'sub') + ' | ' : ''
      
      // modern approach (fileName, functionName, sub) // TBD with team
      let functionIdentifier =  _.get(data, 'functionIdentifier') ? _.get(data, 'functionIdentifier') + ' | ' : ''
      if (!fileName && _.get(data, 'fileName')) fileName =  _.get(data, 'fileName')
      if (!functionName && _.get(data, 'functionName')) functionName =  _.get(data, 'functionName')
      if (!subName && _.get(data, 'sub')) subName =  _.get(data, 'sub')

      
      let message = data?.message

  
      let prefix = []
      let dataFromPrefix = []
      _.forEach(prefixFields, item => {
        if (_.get(meta, _.get(item, 'field'))) {
          prefix.push(_.get(item, 'short'))
          dataFromPrefix.push(_.get(meta, _.get(item, 'field')))
        }  
      })
      const prefixData = _.size(prefix) ? (_.join(prefix, '/') + ' ' + _.join(dataFromPrefix, '/') + ' | ') : ''
      if (data?.e instanceof Error) {
        // log the stack
        console.error(data?.e)
        if (data?.e?.message) message += ' | ' + ( data?.e?.message  || '')
      }
      // TODO: for better readability, we shold use padding for fileName, functionname, etc
      return `${data?.timestamp} ${data?.level} ${fileName}${functionName}${functionIdentifier}${subName}${prefixData}${message}`
    }
  })


  const logTransports = []
  if (!_.size(transporters)) {
    // default behaviour
    // human-readable console output
    logTransports.push(new transports.Console({
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
        splatFormatter(),
        myFormat
      ),
    }))

    // structured logging for analysis and querying within the CloudWatch service.
    if (applicationLogs?.enabled) {
      let filename = applicationLogs?.filename || 'application.log'
      if (filename.endsWith('.log')) {
        // If the filename ends with .log, insert -%DATE% before the extension
        filename = filename.replace(/\.log$/, '-%DATE%.log');
      } 
      else {
        // If the filename doesn't end with .log, append -%DATE%.log
        filename = `${filename}-%DATE%.log`;
      }

      const transport = new transports.DailyRotateFile({
        filename,
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true, // Enable gzip compression for rotated files
        maxSize: applicationLogs?.maxSize || '100m', // Rotate the file when it reaches 20MB
        maxFiles: applicationLogs?.maxFiles || '7d', // Keep rotated files for 7 days
        dirname: applicationLogs?.firname || './logs', // Specify the directory for log files
        format: format.combine(
          format.timestamp(),
          splatFormatter(),
          format.json()
        )
      })

      transport.on('error', error => {
        acLogger.error('ac-logger | ApplicationLogs | TransportError | %j', error?.message)
      })
      logTransports.push(transport)
    }

    if (process.env.NODE_ENV === 'test') {
      logTransports.push(new transports.File({
        filename: 'test.log',
        level: 'debug'
      }))
    }
  }
  else {
    _.forEach(transporters, item => {
      const logTransport = new transports[item.type](item.options)
      if (_.has(item, 'onRotate')) logTransport.on('rotate', item.onRotate)
      logTransports.push(logTransport)
    })
  }

  const logConfig = {
    level,
    transports: logTransports
  }
  if (_.get(customLevels, 'levels')) _.set(logConfig, 'levels', _.get(customLevels, 'levels'))

  const acLogger = createLogger(logConfig)
  if (_.get(customLevels, 'colors')) addColors(_.get(customLevels, 'colors'))
  


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