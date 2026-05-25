const { expect } = require('chai')
const aclog = require('../index')

const intercept = require("intercept-stdout");

let captured_text = "";

const unhook_intercept = intercept(function(text) {
  captured_text += text;
});

describe('Tests', () => {


  it('Check bootstrapInfo', () => {
    aclog().bootstrapInfo({ appName: 'myApp', branch: 'myBranch' })
    const lines = captured_text.split('\n')
    expect(lines[5]).to.contain('Time')
    expect(lines[6]).to.contain('Environment')
    expect(lines[7]).to.contain('Branch')
    expect(lines[7]).to.contain('myBranch')
    expect(lines[8]).to.contain('Version')
    expect(lines[9]).to.contain('AppName')
    expect(lines[9]).to.contain('myApp')
  })

  it('bootstrapInfo without branch', () => {
    captured_text = ''
    aclog().bootstrapInfo({ appName: 'testApp' })
    const lines = captured_text.split('\n')
    expect(lines.some(l => l.includes('AppName'))).to.be.true
    expect(lines.some(l => l.includes('Branch'))).to.be.false
  })

  it('bootstrapInfo collectOnly', () => {
    const result = aclog().bootstrapInfo({ appName: 'myApp', branch: 'myBranch', collectOnly: true })
    expect(result).to.be.an('array')
    expect(result.some(r => r.field === 'Environment')).to.be.true
    expect(result.some(r => r.field === 'Branch')).to.be.true
    expect(result.some(r => r.field === 'AppName' && r.value === 'myApp')).to.be.true
    expect(result.some(r => r.field === 'BOOTSTRAPPING')).to.be.true
  })

  it('bootstrapInfo collectOnly without branch', () => {
    const result = aclog().bootstrapInfo({ appName: 'myApp', collectOnly: true })
    expect(result.some(r => r.field === 'Branch')).to.be.false
    expect(result.some(r => r.field === 'AppName')).to.be.true
  })

  it('Log info', () => {
    captured_text = ''
    const log = aclog().acLogger
    log.info('Hello Info')
    log.debug('Hello Debug')
    const lines = captured_text.split('\n')
    expect(lines[0]).to.contain('INFO')
    expect(lines[1]).not.to.contain('DEBUG')
  })

  it('Log debug', () => {
    const loggerSetup = aclog();
    const log = loggerSetup.acLogger
    loggerSetup.changeLogLevel('debug')
    captured_text = ''
    log.info('Hello Info')
    log.debug('Hello Debug')
    const lines = captured_text.split('\n')
    expect(lines[0]).to.contain('INFO')
    expect(lines[1]).to.contain('DEBUG')
  })

  it('headline', () => {
    captured_text = ''
    const loggerSetup = aclog()
    loggerSetup.headline({ headline: 'test headline' })
    expect(captured_text).to.contain('TEST HEADLINE')
  })

  it('headline with custom fill', () => {
    captured_text = ''
    const loggerSetup = aclog()
    loggerSetup.headline({ headline: 'section', headFill: '=' })
    expect(captured_text).to.contain('SECTION')
    expect(captured_text).to.contain('=')
  })

  it('functionStartLine', () => {
    captured_text = ''
    const loggerSetup = aclog()
    loggerSetup.functionStartLine({ headline: 'my function' })
    expect(captured_text).to.contain('MY FUNCTION')
  })

  it('hrLine', () => {
    captured_text = ''
    const loggerSetup = aclog()
    loggerSetup.hrLine()
    expect(captured_text).to.contain('----')
  })

  it('hrLine with custom length', () => {
    captured_text = ''
    const loggerSetup = aclog()
    loggerSetup.hrLine({ headLength: 20 })
    expect(captured_text).to.contain('----')
  })

  it('listing', () => {
    captured_text = ''
    const loggerSetup = aclog()
    loggerSetup.listing({ field: 'myField', value: 'myValue' })
    expect(captured_text).to.contain('MyField')
    expect(captured_text).to.contain('myValue')
  })

  it('listing with status 200', () => {
    captured_text = ''
    const loggerSetup = aclog()
    loggerSetup.listing({ field: 'Status', value: 200 })
    expect(captured_text).to.contain('Successful')
  })

  it('listing with custom level', () => {
    captured_text = ''
    const loggerSetup = aclog({ level: 'debug' })
    loggerSetup.listing({ field: 'myField', value: 'debugValue', level: 'debug' })
    expect(captured_text).to.contain('debugValue')
  })

  it('serverInfo', () => {
    captured_text = ''
    const loggerSetup = aclog()
    loggerSetup.serverInfo({ host: 'localhost', port: 3000, db: 'mydb' })
    expect(captured_text).to.contain('Host')
    expect(captured_text).to.contain('3000')
    expect(captured_text).to.contain('Db')
    expect(captured_text).to.contain('Connection')
  })

  it('serverInfo collectOnly', () => {
    const loggerSetup = aclog()
    const result = loggerSetup.serverInfo({ host: 'localhost', port: 3000, collectOnly: true })
    expect(result).to.be.an('array')
    expect(result.some(r => r.field === 'Host')).to.be.true
    expect(result.some(r => r.field === 'Port')).to.be.true
    expect(result.some(r => r.field === 'Connection')).to.be.true
  })

  it('acSESnfo', () => {
    captured_text = ''
    const loggerSetup = aclog()
    loggerSetup.acSESnfo({
      aws: { accessKeyId: 'AKIATEST' },
      defaultSender: { address: 'sender@test.com' },
      supportRecipient: { address: 'support@test.com' }
    })
    expect(captured_text).to.contain('AKIATEST')
    expect(captured_text).to.contain('sender@test.com')
    expect(captured_text).to.contain('support@test.com')
  })

  it('timeEnd', () => {
    captured_text = ''
    const loggerSetup = aclog({ level: 'debug' })
    const start = process.hrtime.bigint()
    loggerSetup.timeEnd('myProfile', start, 1e6)
    expect(captured_text).to.contain('myProfile')
    expect(captured_text).to.contain('ms')
  })

  it('timeEnd with microseconds', () => {
    captured_text = ''
    const loggerSetup = aclog({ level: 'debug' })
    const start = process.hrtime.bigint()
    loggerSetup.timeEnd('myProfile', start, 1e3)
    expect(captured_text).to.contain('myProfile')
    expect(captured_text).to.contain('µs')
  })

  it('timeEnd with nanoseconds', () => {
    captured_text = ''
    const loggerSetup = aclog({ level: 'debug' })
    const start = process.hrtime.bigint()
    loggerSetup.timeEnd('myProfile', start, 1)
    expect(captured_text).to.contain('myProfile')
    expect(captured_text).to.contain('ns')
  })

  it('log with error object', () => {
    captured_text = ''
    const loggerSetup = aclog()
    const log = loggerSetup.acLogger
    const err = new Error('test error')
    log.info('Something failed', { e: err })
    expect(captured_text).to.contain('Something failed')
  })

  it('log with meta fields', () => {
    captured_text = ''
    const loggerSetup = aclog()
    const log = loggerSetup.acLogger
    log.info('test message', { meta: { fileName: 'myFile.js', functionName: 'myFunc', sub: 'mySub' } })
    expect(captured_text).to.contain('myFile.js')
    expect(captured_text).to.contain('myFunc')
    expect(captured_text).to.contain('mySub')
  })

  it('log with top-level fileName, functionName, sub', () => {
    captured_text = ''
    const loggerSetup = aclog()
    const log = loggerSetup.acLogger
    log.info('test message', { fileName: 'topFile.js', functionName: 'topFunc', sub: 'topSub' })
    expect(captured_text).to.contain('topFile.js')
    expect(captured_text).to.contain('topFunc')
    expect(captured_text).to.contain('topSub')
  })

  it('log with functionIdentifier', () => {
    captured_text = ''
    const loggerSetup = aclog()
    const log = loggerSetup.acLogger
    log.info('test message', { functionIdentifier: 'myIdentifier' })
    expect(captured_text).to.contain('myIdentifier')
  })

  it('splat formatting', () => {
    captured_text = ''
    const loggerSetup = aclog()
    const log = loggerSetup.acLogger
    log.info('Hello %s, you are %d years old', 'World', 42)
    expect(captured_text).to.contain('Hello World, you are 42 years old')
  })

  it('prefixFields', () => {
    captured_text = ''
    const loggerSetup = aclog({ prefixFields: [{ field: 'customerId', short: 'CID' }] })
    const log = loggerSetup.acLogger
    log.info('test', { meta: { customerId: 'ABC123' } })
    expect(captured_text).to.contain('CID')
    expect(captured_text).to.contain('ABC123')
  })

  it('applicationLogs enabled', (done) => {
    const fs = require('fs')
    const path = require('path')
    const logDir = path.join(process.cwd(), 'logs-test')
    const loggerSetup = aclog({
      applicationLogs: {
        enabled: true,
        filename: 'test-app.log',
        dirname: logDir
      }
    })
    loggerSetup.acLogger.info('applicationLogs test')
    // Give a moment for the stream to write
    setTimeout(() => {
      // Clean up
      try {
        if (fs.existsSync(logDir)) {
          fs.readdirSync(logDir).forEach(f => fs.unlinkSync(path.join(logDir, f)))
          fs.rmdirSync(logDir)
        }
        const symlinkPath = path.join(process.cwd(), 'test-app.log')
        if (fs.existsSync(symlinkPath)) { fs.unlinkSync(symlinkPath) }
      } catch (e) {}
      done()
    }, 200)
  })

  it('applicationLogs enabled without .log extension', (done) => {
    const fs = require('fs')
    const path = require('path')
    const logDir = path.join(process.cwd(), 'logs-test2')
    const loggerSetup = aclog({
      applicationLogs: {
        enabled: true,
        filename: 'test-app-noext',
        dirname: logDir
      }
    })
    loggerSetup.acLogger.info('applicationLogs noext test')
    setTimeout(() => {
      try {
        if (fs.existsSync(logDir)) {
          fs.readdirSync(logDir).forEach(f => fs.unlinkSync(path.join(logDir, f)))
          fs.rmdirSync(logDir)
        }
        const symlinkPath = path.join(process.cwd(), 'test-app-noext')
        if (fs.existsSync(symlinkPath)) { fs.unlinkSync(symlinkPath) }
      } catch (e) {}
      done()
    }, 200)
  })

  it('custom transporters', () => {
    const messages = []
    const { createLogger, format, transports } = require('winston')
    // Use a File transporter via the transporters API
    const loggerSetup = aclog({
      transporters: [
        {
          type: 'Console',
          options: {
            level: 'info',
            format: format.simple()
          }
        }
      ]
    })
    captured_text = ''
    loggerSetup.acLogger.info('custom transporter test')
    expect(captured_text).to.contain('custom transporter test')
  })

  it('customLevels', () => {
    captured_text = ''
    const loggerSetup = aclog({
      level: 'silly',
      customLevels: {
        levels: { error: 0, warn: 1, info: 2, http: 3, verbose: 4, debug: 5, silly: 6 },
        colors: { silly: 'magenta' }
      }
    })
    loggerSetup.acLogger.info('custom levels test')
    expect(captured_text).to.contain('custom levels test')
  })

  it('HTTP log format - 2xx', () => {
    captured_text = ''
    const loggerSetup = aclog({ level: 'http' })
    loggerSetup.acLogger.http('GET /api', {
      controller: 'ApiController',
      action: 'index',
      ip: '127.0.0.1',
      statusCode: 200,
      performance: { executionTime: 10 }
    })
    expect(captured_text).to.contain('ApiController')
    expect(captured_text).to.contain('200')
  })

  it('HTTP log format - 3xx', () => {
    captured_text = ''
    const loggerSetup = aclog({ level: 'http' })
    loggerSetup.acLogger.http('GET /redirect', {
      controller: 'RedirectController',
      action: 'go',
      ip: '127.0.0.1',
      statusCode: 301,
      performance: { executionTime: 5 }
    })
    expect(captured_text).to.contain('RedirectController')
  })

  it('HTTP log format - 4xx', () => {
    captured_text = ''
    const loggerSetup = aclog({ level: 'http' })
    loggerSetup.acLogger.http('GET /missing', {
      controller: 'PageController',
      action: 'show',
      ip: '127.0.0.1',
      statusCode: 404,
      performance: { executionTime: 3 }
    })
    expect(captured_text).to.contain('PageController')
  })

  it('HTTP log format - 5xx', () => {
    captured_text = ''
    const loggerSetup = aclog({ level: 'http' })
    loggerSetup.acLogger.http('GET /crash', {
      controller: 'AppController',
      action: 'crash',
      ip: '127.0.0.1',
      statusCode: 500,
      performance: { executionTime: 100 }
    })
    expect(captured_text).to.contain('AppController')
  })

  it('HTTP log format - with customerId and userId', () => {
    captured_text = ''
    const loggerSetup = aclog({ level: 'http' })
    loggerSetup.acLogger.http('GET /user', {
      controller: 'UserController',
      action: 'show',
      ip: '127.0.0.1',
      customerId: 'cust1',
      userId: 'user1',
      accessKey: 'key123',
      iso2: 'DE',
      message: 'extra info',
      statusCode: 200,
      performance: { executionTime: 8 }
    })
    expect(captured_text).to.contain('UserController')
    expect(captured_text).to.contain('cust1')
    expect(captured_text).to.contain('user1')
  })

  it('HTTP log format - no statusCode', () => {
    captured_text = ''
    const loggerSetup = aclog({ level: 'http' })
    loggerSetup.acLogger.http('GET /nostatus', {
      controller: 'NoStatusController',
      action: 'index',
      ip: '127.0.0.1',
      performance: { executionTime: 1 }
    })
    expect(captured_text).to.contain('NoStatusController')
  })

  it('Unhook', () => {
    unhook_intercept()
  })
})
