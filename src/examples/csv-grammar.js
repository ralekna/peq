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

/*
 * CSV grammar example based on https://tools.ietf.org/html/rfc4180 specification
 */
const {grammar, one, oneOf, all, any, optional, not} = require('./../parser');

const CRLF = one(`\r\n`, undefined, 'linebreak');
const TextData = one(/^[^",\n\r]+/);
const Quote = one(`"`);
const DQuote = one(`""`, () => `"`);
const Comma = one(`,`);
const EOF = input => {
  if (!input.length) {
    return [undefined, ''];
  } else {
    throw new Error(`Expected EOF`);
  }
};
const Escaped = all([
  Quote,
  {name: 'text', matcher: any(oneOf([TextData, CRLF, DQuote, Comma]), all => all.join(''))},
  Quote
], (all, {text}) => text);
const Field = optional(oneOf([TextData, Escaped]), value => value || "");
const Record = all([
  {name: 'head', matcher: Field},
  {name: 'tail', matcher: any(all([Comma, Field], ([, field]) => field))}
  ], (all, {head, tail}) => [head, ...tail], 'Record');
const CsvDocument = all([
  {name: 'head', matcher: Record},
  {name: 'tail', matcher: any(all([CRLF, not(EOF), Record], ([,, record]) => record))},
  optional(CRLF)
], (all, {head, tail}) => [head, ...tail]);

module.exports = grammar(_ => [{
  CsvDocument
}, 'CsvDocument']);
