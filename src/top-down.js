const one = (matcher, transformer, error = matcher) => {
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
			let [result] = input.match(matchRegExp);
			if (result) {
				return [transformer ? transformer(result) : result, input.slice(result.length)]
			}
			return new Error(`Expected ${error}`);
		} else {
			return matchFn(input);
		}
	}
}

module.exports = {
	one
};
