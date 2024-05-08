const { expect } = require('chai')
const aclog = require('../index')

var intercept = require("intercept-stdout");

var captured_text = "";

var unhook_intercept = intercept(function(text) {
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


  it('Unhook', () => {
    unhook_intercept()
  })
})
