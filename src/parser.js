const assert = require('assert');

const identity = (value, named = {}) => value;

const withMatcherTransform = matcherTransformer => matcherFnBody => (matcher, transformer = identity, error = (typeof matcher === 'function' ? undefined : matcher)) => matcherFnBody(matcherTransformer(matcher, transformer, error));

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

const fromObject = (matcher, transformer = identity, name = matcher) => {
	if (typeof matcher === 'object' && matcher.matcher) {
		const matcherFn = fromPrimitive(matcher.matcher, identity, name);
		if (typeof matcherFn !== 'function') {
			throw new Error(`Invalid matcher object ${matcher}`);
		}
		return input => {
				let result = matcherFn(input);
				if (matcher.name) {
					let [all, restInput] = result;
					return [transformer(all, {[matcher.name]: all}), restInput];
				}
				return result;
		};
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
			(matcher, fromFn) => fromFn(matcher, transformer, identity, name),
		matcher);

const one = (matcher, transformer = identity, error = (typeof matcher === 'function' ? undefined : matcher)) => {
	const matcherType = typeof matcher;
	let matchRegExp, matchRegStr, matchFn;
	
	if (matcherType === 'string') {
		matchRegStr = matcher;
	} else if (matcherType === 'object' && matcher instanceof RegExp) {
		if (matcher.source.startsWith('^')) {
			matchRegExp = matcher;
		} else {
			matchRegExp = new RegExp(`^${matcher.source}`);
		}
		
	} else if (matcherType === 'function') {
		matchFn = matcher;
	} else {
		throw new assert.AssertionError({message: `Unsupported matcher ${matcher}`});
	}
	
	return input => {
		if (matchRegExp) {
			let result = input.match(matchRegExp);
			if (result) {
				const [all, ...rest] = result;
				return [transformer(all, rest), input.slice(all.length)];
			}
			throw new Error(`Expected ${error}`);
		} else if (matchRegStr) {
			if (input.startsWith(matchRegStr)) {
				const all = input.slice(0, matchRegStr.length);
				const rest = input.slice(matchRegStr.length);
				return [transformer(all, rest), input.slice(all.length)];
			}
			throw new Error(`Expected ${error}`);
		} else {
			try {
				return matchFn(input);
			} catch (childError) {
				throw new Error(`Expected ${error ? (typeof error === 'function' ? error(childError) : error) : childError}`);
			}
		}
	}
};

const not =  (matcher, transformer = identity, error = (typeof matcher === 'function' ? undefined : matcher)) => {
	return input => {

	};
};

const isNonEmptyArray = value => Array.isArray(value) && value.length;

const isPrimitiveMatcher = matcher => (typeof matcher === 'string' || matcher instanceof RegExp);

const oneOf = (matchers, transformer = identity, error = undefined) => {
	assert(isNonEmptyArray(matchers), `At least one matcher must be provided`);
	assert(Array.isArray(matchers), `Matchers must be array`);

	const wrappedMatchers = matchers.map(matcher => {
		if (typeof matcher === 'string' || matcher instanceof RegExp) {
			return one(matcher);
		}
		return  matcher;
	});
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
			if (typeof error === 'function') {
				throw error(matchResults);
			} else if (typeof error === 'string') {
				throw new Error(`Expected ${error}`);
			} else {
				throw new Error(matchResults.map(error => error.message).join(' or '));
			}
		}
	};
};

const all = (matchers, transformer = identity, error = undefined) => {
	assert(isNonEmptyArray(matchers), `At least one matcher must be provided`);
	assert(Array.isArray(matchers), `Matchers must be array`);

	const wrappedMatchers = matchers.map((matcher, index) => {
		if (typeof matcher === 'function') {
			return  {matcher: matcher, name: index};
		} else if (isPrimitiveMatcher(matcher)) {
			return {name: index, ...matcher, matcher: one(matcher)};
		} else if (typeof matcher === 'object' && matcher.matcher) {
			assert(!!matcher.matcher, `Invalid matcher provided ${matcher}`);
			if (isPrimitiveMatcher(matcher.matcher)) {
				return {name: index, ...matcher, matcher: one(matcher.matcher)};
			}
			return matcher;
		}

	});

	return input => {
		try {
			const {all, named, restInput} = wrappedMatchers.reduce(({all, named, restInput: input}, {matcher, name}) => {
				const [result, restInput] = matcher(input);
				all.push(result);
				named[name] = result;
				return {all, named, restInput};
			}, {all: [], named: {}, restInput: input});
			return [transformer(all, named), restInput];

		} catch (childError) {
			if (typeof error === 'function') {
				throw error(childError);
			} else if (typeof error === 'string') {
				throw new Error(`Expected ${error}`);
			} else {
				throw childError;
			}
		}
	}
};

const any = (matcher, transformer = identity) => {
	let wrappedMatcher;
	if (isPrimitiveMatcher(matcher)) {
		wrappedMatcher = one(matcher);
	} else {
		wrappedMatcher = matcher;
	}

	return input => {

		let all = [];
		let restInput = input;
		while (restInput.length > 0) {
			try {
				let [result, input] = wrappedMatcher(restInput);
				all.push(result);
				restInput = input;
			} catch (error) {
				break;
			}
		}
		return [transformer(all), restInput];
	}
};

module.exports = {
	one,
	oneOf,
	all,
	any,
	fromRegExp,
	fromString,
	fromObject,
	fromPrimitive
};
