const assert = require('assert');

const identity = value => value;

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
				let result = input.match(matchRegExp);
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

const isNonEmptyArray = value => Array.isArray(value) && value.length;

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
		const nonErrorResults = matchResults.filter(result => !(result instanceof Error));
		if (nonErrorResults.length) {
			return transformer(nonErrorResults[0]);
		} else {
			if (typeof error === 'function') {
				throw error(matchResults);
			} else if (typeof error === 'string') {
				throw new Error(`Expected ${error}`);
			} else {
				throw new Error(matchResults[0]);
			}
		}
	};
};

const all = (matchers, transformer = identity, error = undefined) => {
	assert(isNonEmptyArray(matchers), `At least one matcher must be provided`);
	assert(Array.isArray(matchers), `Matchers must be array`);

	const wrappedMatchers = matchers.map((matcher, index) => {
		if (typeof matcher === 'object') {
			assert(matcher.name && matcher.matcher, `Invalid matcher provided ${matcher}`);
			if (['function', 'string'].includes(typeof matcher.matcher)) {
				return {...matcher, matcher: one(matcher.matcher)};
			}
			return matcher;
		} else if (typeof matcher === 'function') {
			return  {matcher: matcher, name: index};
		}

	});
	return input => {
		let all = [], named = {};
		try {
			wrappedMatchers.forEach(matcher => {
				const result = matcher.matcher(input);
				all.push(result);
				named[matcher.name] = result;
			});
			return transformer(all, named);
		} catch (childError) {
			if (error) {
				throw new Error(`Expected ${error}`);
				// TODO: use error transformer too
			}
		}

	}
};

module.exports = {
	one,
	oneOf
};
