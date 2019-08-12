const {expect} = require('chai');
const {grammar, one, oneOf, all, any, not, optional, oneOrMore, fromString, fromObject, fromRegExp, fromPrimitive} = require('./parser');
const {describe, it} = require('mocha');

describe(`top-down parser atoms`, () => {

  describe(`utilities withString(), withRegExp()`, () => {
    it (`should create a matcher from string`, () => {
      let matcher = fromString('a');
      expect(matcher(`ab`)).to.be.deep.equal(['a', 'b']);
      const stringMatcher = fromString(`ad*`);
      expect(() => stringMatcher(`addd`)).to.throw(`Expected ad*`);
    });

    it (`should create a matcher from regExp`, () => {
      const commentMatcher = fromRegExp(/\/\*(.*)\*\//, (all, [comment]) => comment, 'comment');
      expect(commentMatcher(`/* my comment */ d `)).to.be.deep.equal([` my comment `, ` d `]);
      expect(() => commentMatcher(` my comment */ d `)).to.throw(`Expected comment`);
    });

    it (`should create a matcher from object`, () => {
      let objectMatcher = fromObject({name: 'my', matcher: 'a'}, (all, name) =>  {
        expect(name).to.be.equal('my');
        return all;
      });
      expect(objectMatcher(`ab`)).to.be.deep.equal(['a', 'b']);

      let objectMatcher2 = fromObject({name: 'my', matcher: 'a'});
      expect(objectMatcher2._name).to.be.equal('my');
      expect(objectMatcher2(`ab`)).to.be.deep.equal(['a', 'b']);
    });

    it (`should create a matcher from any primitive`, () => {
      let stringMatcher = fromPrimitive('a');
      expect(stringMatcher(`ab`)).to.be.deep.equal(['a', 'b']);
      let regExpMatcher = fromPrimitive(/a/);
      expect(regExpMatcher(`ab`)).to.be.deep.equal(['a', 'b']);
    });
  });

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

    it(`should use transformer`, () => {
      const aMatcher = one('a');
      const bMatcher = one('b');

      const abMatcher = oneOf([aMatcher, bMatcher], value => value.toUpperCase());

      expect(abMatcher(`a123`)).to.be.deep.equal(['A', '123']);
      expect(abMatcher(`b123`)).to.be.deep.equal(['B', '123']);
      expect(() => abMatcher(`c123`)).to.throw(`Expected a`);
    });

    it(`should transform errors`, () => {
      const aMatcher = one('a', undefined, 'A');
      const bMatcher = one('b', undefined, 'B');

      const abMatcher = oneOf([aMatcher, bMatcher], undefined, errorResults => new Error(errorResults.map(({message}) => message).join(' or ')));
      expect(() => abMatcher(`c123`)).to.throw(`Expected A or Expected B`);

      const abMatcher2 = oneOf([aMatcher, bMatcher]);
      expect(() => abMatcher2(`c123`)).to.throw(`Expected A or Expected B`);
    });
  });

  describe(`all()`, () => {
    it(`should use two basic matchers`, () => {
      const aMatcher = one('a');
      const bMatcher = one('b');

      const abMatcher = all([aMatcher, bMatcher]);

      expect(abMatcher(`ab123`)).to.be.deep.equal([['a', 'b'], '123']);
      expect(() => abMatcher(`c123`)).to.throw(`Expected a`);
    });

    it(`should use named two basic matchers`, () => {
      const quoteMatcher = one(`"`);
      const textMatcher = one(/^[a-z0-9]*/);

      const stringMatcher = all([quoteMatcher, {name: 'text', matcher: textMatcher}, quoteMatcher], (all, {text}) => text);

      expect(stringMatcher(`"asdf132456" asdf`)).to.be.deep.equal(['asdf132456', ` asdf`]);
      expect(() => stringMatcher(`c123`)).to.throw(`Expected "`);
    });

    it(`should construct from primitive matchers`, () => {
      const stringMatcher = all([{matcher: `"`}, {name: 'text', matcher: /^[a-z0-9]*/}, {matcher: `"`}], (all, {text}) => text);

      expect(stringMatcher(`"asdf132456" asdf`)).to.be.deep.equal(['asdf132456', ` asdf`]);
      expect(() => stringMatcher(`c123`)).to.throw(`Expected "`);
      expect(() => stringMatcher(`"c123`)).to.throw(`Expected "`);
    });
  });

  describe(`any()`, () => {
    it(`should use one basic matcher`, () => {
      const aMatcher = one('a');
      const multipleAMatcher = any(aMatcher);
      expect(multipleAMatcher(`aaab123`)).to.be.deep.equal([['a', 'a', 'a'], 'b123']);
      expect(multipleAMatcher(`b123`)).to.be.deep.equal([[], 'b123']);
      expect(() => multipleAMatcher(`c123`)).not.to.throw(`Expected a`);
    });
    it(`should use all() matcher`, () => {
      const aMatcher = one('a');
      const bMatcher = one('b');
      const multipleABMatcher = any(all([aMatcher, bMatcher]));
      expect(multipleABMatcher(`abab123`)).to.be.deep.equal([[['a', 'b'], ['a', 'b']], '123']);
      expect(multipleABMatcher(`b123`)).to.be.deep.equal([[], 'b123']);
      expect(() => multipleABMatcher(`c123`)).not.to.throw(`Expected a`);
    });
  });

  describe(`optional()`, () => {
    it(`should match a char if given`, () => {
      const matcher = optional('a');
      expect(matcher('ab')).to.be.deep.equal(['a', 'b']);

      const matcher2 = optional('a', all => all.toUpperCase());
      expect(matcher2('ab')).to.be.deep.equal(['A', 'b']);
    });

    it(`should not match a char and not throw error`, () => {
      const matcher = optional('a');
      expect(matcher('bb')).to.be.deep.equal([undefined, 'bb']);
    });
  });

  describe(`oneOrMore()`, () => {
    it(`should match a char or more`, () => {
      const matcher = oneOrMore('a');
      expect(matcher('ab')).to.be.deep.equal([['a'], 'b']);
      expect(matcher('aaab')).to.be.deep.equal([['a', 'a', 'a'], 'b']);
      expect(() => matcher('bbb')).to.throw(`Expected at least one a`);
    });
  });

  describe(`not()`, () => {
    it(`should match if char is not present`, () => {
      const matcher = not('a');
      expect(matcher('bb')).to.be.deep.equal([undefined, 'bb']);
      expect(() => matcher('ab')).to.throw(`Unexpected a`);
    });
  });

  describe(`grammar()`, () => {
    it (`should find dynamic references`, () => {
      let parser = grammar(_ => [{
        number: any(_('digit'), digits => parseInt(digits.join(''), 10)),
        digit: one(/^[0-9]/)
      }, 'number']);
      let result = parser(`123`);
      expect(result).to.be.deep.equal(123);
    });
  });
});