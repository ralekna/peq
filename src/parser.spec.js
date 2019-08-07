const {expect} = require('chai');
const {one} = require('./parser');
const {describe, it} = require('mocha');

describe(`top-down parser atoms`, () => {

  describe(`one()`, () => {

    it(`should get a portion of text by using String matcher`, () => {
      const underscoreMatcher = one(`_`);
      expect(underscoreMatcher(`_asd_asd`)).to.be.deep.equal([`_`, `asd_asd`]);
    });

    it(`should throw an error on non matching String`, () => {
      const underscoreMatcher = one(`_`);
      expect(() => underscoreMatcher(`asd_asd`)).to.throw(`Expected _`);
    });

    it(`should get a portion of text by using RegExp matcher`, () => {
      const floatMatcher = one(/\d*(?:\.\d+)?/);
      expect(floatMatcher(`123.456d`)).to.be.deep.equal([`123.456`, `d`]);
      expect(floatMatcher(`.456d`)).to.be.deep.equal([`.456`, `d`]);
      expect(floatMatcher(`456d`)).to.be.deep.equal([`456`, `d`]);
    });

    it(`should use transformer with RegExp matcher`, () => {
      const commentMatcher = one(/\/\*(.*)\*\//, (all, [comment]) => comment);
      expect(commentMatcher(`/* my comment */ d `)).to.be.deep.equal([` my comment `, ` d `]);

      const stringMatcher = one(/"(.*[^\\])"/, (all, [string]) => string);
      expect(stringMatcher(`" my string " d `)).to.be.deep.equal([` my string `, ` d `]);
      expect(stringMatcher(`" my \"string " d `)).to.be.deep.equal([` my \"string `, ` d `]);

      const advancedStringMatcher = one(/(["'])(.*[^\\])\1/, (all, [,string]) => string);
      expect(advancedStringMatcher(`" my string " d `)).to.be.deep.equal([` my string `, ` d `]);
      expect(advancedStringMatcher(`' my string ' d `)).to.be.deep.equal([` my string `, ` d `]);
      expect(advancedStringMatcher(`" my \"string " d `)).to.be.deep.equal([` my \"string `, ` d `]);

      const multilineAdvancedStringMatcher = one(/(["'])([\s\S]*[^\\])\1/, (all, [,string]) => string, 'string');
      expect(multilineAdvancedStringMatcher(`' my \"st\nring ' d `)).to.be.deep.equal([` my \"st\nring `, ` d `]);
      expect(() => multilineAdvancedStringMatcher(`' my \"st\nring  d `)).to.throw(`Expected string`);
    });

    it(`should use another matcher`, () => {
      const commentMatcher = one(/\/\*(.*)\*\//, (all, [comment]) => comment, 'deepComment');
      const wrappedMatcher = one(commentMatcher, undefined,'comment');
      expect(wrappedMatcher(`/* my comment */ d `)).to.be.deep.equal([` my comment `, ` d `]);
      expect(() => wrappedMatcher(` my comment */ d `)).to.throw(`Expected comment`);

      const wrappedMatcher2 = one(commentMatcher);
      expect(() => wrappedMatcher2(` my comment */ d `)).to.throw(`Expected deepComment`);
    });

  });

});