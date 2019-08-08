const {expect} = require('chai');
const {one, oneOf} = require('./parser');
const {describe, it} = require('mocha');

describe(`top-down parser atoms`, () => {

  describe(`one()`, () => {

    it(`should get a portion of text by using String matcher`, () => {
      const underscoreMatcher = one(`_`);
      expect(underscoreMatcher(`_asd_asd`)).to.be.deep.equal([`_`, `asd_asd`]);
    });

    it(`should not be converted to regexp when string is used`, () => {
      const stringMatcher = one(`ad*`);
      expect(() => stringMatcher(`addd`)).to.throw(`Expected ad*`);
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

      const booleanMatcher = one(/[0-1]/, (all) => {
        if (all === '1') {
          return true;
        } else if (all === '0') {
          return false;
        }
      }, 'boolean');

      expect(booleanMatcher(`1 asdf`)).to.be.deep.equal([true, ` asdf`]);
      expect(booleanMatcher(`0 asdf`)).to.be.deep.equal([false, ` asdf`]);
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

  describe(`oneOf()`, () => {
    it(`should use two basic matchers`, () => {
      const aMatcher = one('a');
      const bMatcher = one('b');

      const abMatcher = oneOf([aMatcher, bMatcher]);

      expect(abMatcher(`a123`)).to.be.deep.equal(['a', '123']);
      expect(abMatcher(`b123`)).to.be.deep.equal(['b', '123']);
      expect(() => abMatcher(`c123`)).to.throw(`Expected a`);
    });

    it(`should transform errors`, () => {
      const aMatcher = one('a', undefined, 'A');
      const bMatcher = one('b', undefined, 'B');

      const abMatcher = oneOf([aMatcher, bMatcher], undefined, errorResults => new Error(errorResults.map(({message}) => message).join(' or ')));
      expect(() => abMatcher(`c123`)).to.throw(`Expected A or Expected B`);
    });
  });

});