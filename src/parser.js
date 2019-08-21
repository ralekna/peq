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

const identity = (value, named = {}) => value;

const last = (array) => array[array.length -1];
const init = (array) => array.slice(0, -1);

const fromRegExp = (matcher, transformer = identity, name = matcher) => {
	if (matcher instanceof RegExp) {
		let regExp = matcher;
		if (!regExp.source.startsWith('^')) {
			regExp = new RegExp(`^${regExp.source}`);
		}
		return input => {
			let result = input.match(regExp);
			if (result) {
				const [all, ...rest] = result;
				return [transformer(all, rest), input.slice(all.length)];
			}
			throw new Error(`Expected ${name}`);
		};
	}
	return matcher;
};

const fromString = (matcher, transformer = identity, name = matcher) => {
	if (typeof matcher === 'string' || typeof matcher === 'number') {
		let matcherString = String(matcher);
		return input => {
			if (input.startsWith(matcherString)) {
				const all = input.slice(0, matcherString.length);
				return [transformer(all), input.slice(all.length)];
			}
			throw new Error(`Expected ${name}`);
		};
	}
	return matcher;
};

const fromObject = (matcher, transformer = identity, name = matcher.name) => {
	if (typeof matcher === 'object' && matcher.matcher) {
		const matcherFn = fromPrimitive(matcher.matcher, identity, (typeof name === 'string') ? name : matcher.name);
		if (typeof matcherFn !== 'function') {
			throw new Error(`Invalid matcher object ${matcher}`);
		}
		const wrappedMatcher = input => {
			let result = matcherFn(input);
			let [all, restInput] = result;
			return [transformer(all, matcher.name), restInput];
		};
		return Object.assign(wrappedMatcher, {_name: matcher.name});
	}
	return matcher;
};

const fromArray = (matcher, transformer = identity, name = matcher) => {
	if (Array.isArray(matcher)) {
		return matcher.map(childMatcher => fromPrimitive(childMatcher, transformer, name));
	}
	return matcher;
};

const fromPrimitive = (matcher, transformer = identity, name = matcher) =>
	[fromString, fromRegExp, fromObject, fromArray].reduce(
			(matcher, fromFn) => fromFn(matcher, transformer, name),
		matcher);

const wrapMatcher = matcherFn => (matcher, transformer = identity, name = matcher) =>
  matcherFn(Array.isArray(matcher) ? all(matcher) : fromPrimitive(matcher, transformer, name), transformer, name);

class ParseError extends Error {
  constructor(expected, unexpected, source = '', index = 0, lineNumber = 0, columnNumber = 0) {
    super(`${expected}\nUnexpected ${unexpected} \non line: ${lineNumber}, at column: ${columnNumber},\nat source:\n${source.slice(10)} ...\n^${("").padEnd(9, '-')}`);
    this.name = `ParseError`;
    this._expected = expected;
    this._unexpected = unexpected;
    this._columnNumber = columnNumber;
    this._lineNumber = lineNumber;
    this._index = index;
    this._source = source;
  }

  get lineNumber() {
    return this._lineNumber;
  }

  get columnNumber() {
    return this._columnNumber;
  }

  get index() {
    return this._index;
  }

  get expected() {
    return this._expected;
  }

  get unexpected() {
    return this._unexpected;
  }

  get source() {
    return this._source;
  }

  clone(parentSource, parentError = undefined) {
    const newIndex = parentSource.length - this.source.length;
    return new ParseError(parentError || this.expected, this.unexpected, this.source, newIndex)
  }
}

const withError = matcherFn => (...args) => {
  const initializedMatcher = matcherFn(...args);
  return input => {
    try {
      return initializedMatcher(input);
    } catch (error) {

    }
  }
};

const handleChildError = (childError, error, matchResults) => {
	if (typeof error === 'function') {
		throw error(matchResults || childError);
	} else if (typeof error === 'string') {
		throw new Error(`Expected ${error}`);
	} else if (Array.isArray(matchResults) && matchResults.every(item => (item instanceof Error))) {
		throw new Error(matchResults.map(error => error.message).join(' or '));
	} else if (Array.isArray(error) && error.every(item => (item instanceof Error))) {
		throw new Error(error.map(error => error.message).join(' or '));
	} else {
		throw childError;
	}
};

const isNonEmptyArray = value => Array.isArray(value) && value.length;

const one = wrapMatcher((matcher, transformer = identity, error = (typeof matcher === 'function' ? undefined : matcher)) => {
	return input => {
		try {
			return matcher(input);
		} catch (childError) {
			handleChildError(childError, error);
		}
	};
});

const not = wrapMatcher((matcher, transformer = identity, error = (typeof matcher === 'function' ? undefined : matcher)) => {
	return input => {
	  let result;
    try {
      result = matcher(input);
    } catch (error) {
      return [undefined, input];
    }
    if (result) {
      throw new Error(`Unexpected ${error}`);
    }
	};
});

const oneOf = (matchers, transformer = identity, error = undefined) => {
	if (!isNonEmptyArray(matchers)) {
		throw new Error(`At least one matcher must be provided in array`);
	}

	const wrappedMatchers = matchers.map(matcher => fromPrimitive(matcher));
	return input => {
		const matchResults = wrappedMatchers.map(matcher => {
			try {
				return matcher(input);
			} catch (childError) {
				return childError;
			}
		});
		const nonErrorResult = matchResults.find(result => !(result instanceof Error));
		if (nonErrorResult) {
			const [result, restInput] = nonErrorResult;
			return [transformer(result), restInput];
		} else {
			handleChildError(undefined, error || matchResults, matchResults);
		}
	};
};

const optional = wrapMatcher((matcher, transformer = identity) => {
	return input => {
		try {
      return matcher(input);
		} catch (error) {
			return [transformer(undefined), input];
		}
	}
});

const oneOrMore = (matcher, transformer = identity, error = (typeof matcher === 'function' ? undefined : matcher)) => {
	const wrappedMatcher = any(matcher, transformer);
	return input => {
		let [result, rest] = wrappedMatcher(input);
		if (!result.length) {
			throw new Error(`Expected at least one ${error}`);
		}
		return [result, rest];
	}
};


const all = (matchers, transformer = identity, error = undefined) => {

	if (!isNonEmptyArray(matchers)) {
		throw new Error(`At least one matcher must be provided in array`);
	}

	const wrappedMatchers = matchers.map(matcher => fromPrimitive(matcher));

	return input => {
		try {
			const {all, named, restInput} = wrappedMatchers.reduce(({all, named, restInput: input}, matcher) => {
				const [result, restInput] = matcher(input);
				all.push(result);
				if (matcher._name) {
					named[matcher._name] = result;
				}
				return {all, named, restInput};
			}, {all: [], named: {}, restInput: input});
			return [transformer(all, named), restInput];

		} catch (childError) {
			handleChildError(childError, error);
		}
	}
};

const any = wrapMatcher((matcher, transformer = identity) => {
	const greedyMatchInput = input => {
		try {
			let [result, rest] = matcher(input);
			return [result].concat(greedyMatchInput(rest));
		} catch (error) {
			return [input];
		}
	};

	return input => {
		const result = greedyMatchInput(input);
		return [transformer(init(result)), last(result)];
	}
});

const grammar = initializer => {
  let definitionTable = {}, start = undefined;
  const getDefinition = name => input => {
    if (!definitionTable[name]) {
      throw new Error(`Unknown grammar definition ${name}`);
    }
    return definitionTable[name](input);
  };
  ([definitionTable, start] = initializer(getDefinition));
  if (start === 'undefined' || !definitionTable[start]) {
    throw new Error('Unspecified or invalid entry point');
  }
  let entry = getDefinition(start);
  return input => {
    let [result, rest] = entry(input);
    return result;
  }
};

const c = matcherProducer => {
	let cachedMatcher;
	return input => {
		if (!cachedMatcher) {
			cachedMatcher = matcherProducer();
		}
		return cachedMatcher(input);
	}
};

const p = matcher => input => matcher(input)[0];

module.exports = {
	grammar,
	one,
	oneOf,
	all,
	any,
	not,
	optional,
	oneOrMore,
	fromRegExp,
	fromString,
	fromObject,
	fromPrimitive,
	c,
	p
};
