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
		throw new Error(`Unsupported matcher ${matcher}`);
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
				throw new Error(`Expected ${error || childError}`);
			}
		}
	}
};

module.exports = {
	one
};
