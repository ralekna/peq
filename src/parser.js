const identity = value => value;

const one = (matcher, transformer = identity, error = (typeof matcher === 'function' ? undefined : matcher)) => {
	const matcherType = typeof matcher;
	let matchRegExp, matchFn;
	
	if (matcherType === 'string') {
		matchRegExp = `^${matcher}`
	} else if (matcherType === 'object' && matcher instanceof RegExp) {
		if (matcher.source.startsWith('^')) {
			matchRegExp = matcher;
		} else {
			matchRegExp = new RegExp(`^${matcher.source}`);
		}
		
	} else if (matcherType === 'function') {
		matchFn = matcher;
	} else {
		throw new Error(`Parser construction error: Unsupported matcher ${matcher}`);
	}
	
	return input => {
		if (matchRegExp) {
			let result = input.match(matchRegExp);
			if (result) {
				const [all, ...rest] = result;
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

const oneOf = (matchers, transformer = identity, error = undefined) => {
	if (Array.isArray(matchers) && !matchers.length) {
		throw new Error(`Parser construction error: At least one matcher must be provided`);
	} else if (!Array.isArray(matchers)) {
		throw new Error(`Parser construction error: Matchers must be array`);
	}
	const wrappedMatchers = matchers.map(matcher => {
		if (typeof matcher == 'string' || matcher instanceof RegExp) {
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

module.exports = {
	one,
	oneOf
};
