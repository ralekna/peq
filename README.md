# PEQ - JavaScript *P*arsing *E*xpressions *Q*uery library

[![alt Build status](https://api.travis-ci.com/ralekna/peq.svg?branch=master "Build status")](https://travis-ci.com/ralekna/peq)

This library aims to provide a parser generator functionality of [PEG.js](https://github.com/pegjs/pegjs) 
but in a way where your constructed grammar is a parser itself instead of generating some human unreadable code. Like with jQuery you can query HTML DOM elements, with PEQ provided _matchers_ you can query a string and transform it to any other data structure.

## Usage

### Installation
`npm i peq`

### Usage in Node.js

```javascript
const {grammar, one, oneOf, all, any, not, optional, oneOrMore} = require("peq");

console.log(all([`"`, {name: 'text', matcher: any(/[a-z]/) }, `"`], (all, {text}) => text.join(''))(`"asd"`));
// ^ this will output ['asd', '']
```

As there's still no more documentation yet, please check [examples folder](https://github.com/ralekna/peq/tree/master/src/examples) 

## ToDo

- [x] Setup CI 
- [x] Add examples in code 
- [ ] Add simple usage documentation 
- [ ] Research if there's any missing quantifiers  
- [ ] Add more human readable CS theory to documentation  
- [ ] Try more grammars
- [ ] Convert code to TypeScript

## Contribution and issues

Just open a ticket in Github

## Licence

This work is licensed under [Apache 2.0](https://opensource.org/licenses/Apache-2.0) open source license.
