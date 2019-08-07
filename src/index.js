const {one} = require('./top-down');

const DQuote = one(`"`);
const Quote = one(`'`);
const Text = one(/^([^"]*)/, ([, text]) => text); // <- this doesn't work
// TODO: implement
// const DString = all([DQuote, {name: 'value', matcher: Text}, DQuote], ({value}) => value)
// const SString = all([Quote, {name: 'value', matcher: Text}, Quote], ({value}) => value)
// const String = oneOf([DString, SString])