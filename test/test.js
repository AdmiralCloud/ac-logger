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

  it('Unhook', () => {
    unhook_intercept()
  })
})
