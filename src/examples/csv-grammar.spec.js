/*
   Copyright 2019 Rytis Alekna <r.alekna@gmail.com>

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

const {expect} = require('chai');
const {describe, it} = require('mocha');
const parser = require('./csv-grammar');

describe('CSV grammar', () => {
  it('should parse single comma separated line', () => {
    expect(parser(`aaa,bbb,ccc`)).to.be.deep.equal([['aaa', 'bbb', 'ccc']]);
  });

  it('should parse single comma separated line with numbers and special chars', () => {
    expect(parser(`111,@@@,...`)).to.be.deep.equal([['111', '@@@', '...']]);
  });

  it('should parse single comma separated line of single field with quotes', () => {
    expect(parser(`"aaa"`)).to.be.deep.equal([['aaa']]);
  });

  it('should parse single comma separated line with quotes', () => {
    expect(parser(`"aaa","bbb","ccc"`)).to.be.deep.equal([['aaa', 'bbb', 'ccc']]);
  });

  it('should parse single comma separated line with empty fields', () => {
    expect(parser(`"aaa",,"","ccc"`)).to.be.deep.equal([['aaa', '', '','ccc']]);
  });

  it('should parse multiple comma separated line', () => {
    expect(parser(`aaa,bbb,ccc \r\nddd,eee,fff`)).to.be.deep.equal([['aaa', 'bbb', 'ccc '], ['ddd', 'eee', 'fff']]);
  });

  it('should parse single comma separated line with quotes and linebreaks inside', () => {
    expect(parser(`"aaa","b \r\nbb","ccc"`)).to.be.deep.equal([['aaa', 'b \r\nbb', 'ccc']]);
  });

  it('should parse mixed line with quotes and linebreaks inside', () => {
    expect(parser(`aaa,"b \r\nbb","ccc"\r\nddd,"e"",ee",fff`)).to.be.deep.equal([['aaa', 'b \r\nbb', 'ccc'], ['ddd', 'e",ee', 'fff']]);
  });

  it('should allow optional linebreak at the end of document', () => {
    expect(parser(`"aaa","bbb","ccc"\r\n"aaa","bbb","ccc"`)).to.be.deep.equal([['aaa', 'bbb', 'ccc'], ['aaa', 'bbb', 'ccc']]);
    expect(parser(`"aaa","bbb","ccc"\r\n"aaa","bbb","ccc"\r\n`)).to.be.deep.equal([['aaa', 'bbb', 'ccc'], ['aaa', 'bbb', 'ccc']]);
  });

  it('should parse empty document', () => {
    expect(parser(``)).to.be.deep.equal([['']]); // yes, no record is also one record :)
    expect(parser(`,`)).to.be.deep.equal([['','']]);
    expect(parser(`\r\n\r\n`)).to.be.deep.equal([[''],['']]); // well this pass but I don't know if it should.
  });
});