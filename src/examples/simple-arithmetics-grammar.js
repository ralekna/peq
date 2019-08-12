/*
Taken from PEGjs example and ported to td-parser

// Simple Arithmetics Grammar
// ==========================
//
// Accepts expressions like "2 * (3 + 4)" and computes their value.

Expression
  = head:Term tail:(_ ("+" / "-") _ Term)* {
      return tail.reduce(function(result, element) {
        if (element[1] === "+") { return result + element[3]; }
        if (element[1] === "-") { return result - element[3]; }
      }, head);
    }

Term
  = head:Factor tail:(_ ("*" / "/") _ Factor)* {
      return tail.reduce(function(result, element) {
        if (element[1] === "*") { return result * element[3]; }
        if (element[1] === "/") { return result / element[3]; }
      }, head);
    }

Factor
  = "(" _ expr:Expression _ ")" { return expr; }
  / Integer

Integer "integer"
  = _ [0-9]+ { return parseInt(text(), 10); }

_ "whitespace"
  = [ \t\n\r]*

*/
const {grammar, one, oneOf, all, any} = require('./../parser');

module.exports = grammar(_ => [{
  Expression: all(
    [
      {name: 'head', matcher: _('Term')},
      {name: 'tail', matcher: any(all([
        _('w'), {name: 'operator', matcher: oneOf(['+', '-'])}, _('w'), {name: 'operand', matcher:_('Term')}], (all, {operator, operand}) => ({operator, operand}), 'ExpressionTail')
       )}
      ],
    (all, {head, tail}) => {
      return tail.reduce((result, {operator, operand}) => {
        if (operator === "+") {
          return result + operand;
        }
        if (operator === "-") {
          return result - operand;
        }
      }, head);
    }
  ),
  Factor: oneOf([
    all(['(', _('w'), {name: 'expr', matcher: _('Expression')}, _('w'), ')'], (all, {expr}) => expr, 'Factor'),
    _('Integer')
  ], undefined, 'Factor'),
  Term: all(
    [
      {name: 'head', matcher: _('Factor')},
      {name: 'tail', matcher: any(all([
        _('w'), {name: 'operator', matcher: oneOf(['*', '/']) },
          _('w'), {name: 'operand', matcher: _('Factor')}], (all, {operator, operand}) => ({operator, operand})))}
      ],
    (all, {head, tail}) => {
      return tail.reduce((result, {operator, operand}) => {
        if (operator === "*") {
          return result * operand;
        }
        if (operator === "/") {
          return result / operand;
        }
      }, head);
    }
  ),
  Integer: all([_('w'), {name: 'integer', matcher: /^[0-9]+/}], (all, {integer}) => parseInt(integer, 10), 'integer'),
  w: one(/^[ \t\n\r]*/, undefined, `whitespace`),

}, 'Expression']);