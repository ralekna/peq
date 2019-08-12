const {expect} = require('chai');
const {describe, it} = require('mocha');
const parser = require('./simple-arithmetics-grammar');

describe(`A simple arithmetic grammar`, () => {
  it(`should compute value`, () => {
    expect(parser(`1+1`)).to.be.equal(2);
    expect(parser(`1+1+1`)).to.be.equal(3);
    expect(parser(`1+(1+1)`)).to.be.equal(3);
    expect(parser(`2*2`)).to.be.equal(4);
    expect(parser(`2 * (3 + 4)`)).to.be.equal(14);
    expect(parser(`((2) * ((3) + (4)))`)).to.be.equal(14);
  })
});