
# Random stuff
A collection of random code snippets by Kelvin Schoofs. Most of them were either written for fun out of boredom, or (improved versions of) code snippets I wrote for Stack Overflow answers.

Currently all written in TypeScript, although most (non-type-specific) snippets should be easily translatable into regular JavaScript.

These snippets are (usually) targetted at Node.js, with `tsconfig.json` set to target `ES2019`, meaning that:
- Node.js v10.3.0 and later should be enough, since it supports `ES2019` apart from `array.flat`, `array.flatMap` and `Object.fromEntries`.
- The transpiled JavaScript code in `./out` is almost the same as the TypeScript source code, but without types and some small beauty marks.
- It can make use of nice (and handy/optimized) features that a bundler can still transpile down when targetting e.g. old browser versions.

TypeScript backwards compatibility depends on the snippet. Compiled using TS 4.3.5 but unless I'm using something like key remapping (a TS 4.1 feature), not too big of an issue.

## How to run
```bash
yarn # or `npm i`
yarn build # or `npm run build` (or simply run `tsc` somehow)
node ./out/js-object-value-parser.ts # replace with wanted snippet
```

## Overview
### [Index.ts](./src/index.ts)
It's literally just a place holder to remind you `yarn start` etc is wrong.

### [JS SQL query parser](./src/js-sql-query-parser.ts)
Basically a parser that parses SQL-like queries, basically simple JS conditions:
- Supports any binary operator with proper operator precedence
- Supports wrapping an expression in brackets (to e.g. suppress operator precedence)
- Supports parsing string/number/boolean constants
- Supports accessing global variables
- Supports indexing (anything) using any expression or `.field` syntax
- Supports chaining operators and field indexes, e.g. `a.b && a.b['c'] === 1 + 2`

Example:
```js
// Input expression (as a string)
(section2.fieldxyz<5000 OR section2.fieldxyz>10000) AND section1.fieldabc == value1
// Resulting JSON
{
    "type": "binop",
    "operator": "AND",
    "left": {
        "type": "brackets",
        "expr": { ... }
    },
    "right": {
        "type": "binop",
        "operator": "==",
        "left": {
            "type": "field",
            "object": {
                "type": "variable",
                "name": "section1"
            },
            "field": "fieldabc"
        },
        "right": { ... }
    }
}
// Converting JSON into an expression but wrapping binops in [...]
// (square brackets are just to show off operator precedence works)
=> [([[section2.fieldxyz < 5000] OR [section2.fieldxyz > 10000]]) AND [section1.fieldabc == value1]]
```
I wrote this as part of [this Stack Overflow answer](https://stackoverflow.com/a/68606593/14274597).

### [JS value parser](./src/js-value-parser.ts)
Basically a custom version of a JSON deserialize that supports more JS-like syntax:
- Don't need to wrap (JS variable name-like) object keys
- Supports a lot more things than JSON does
    - Supports octal (`0xabc`) and hexadecimal notation (`0o666`)
    - Supports decimal and scientific notation (`.12e-3`)
    - Supports `undefined` (not that impressive, but JSON only supports `null`, not `undefined`)
- Pretty good error reporting
    - Includes a demo to error report with a preview of where the syntax error happened
    - For the preview part, got an easy version and an optimized-for-large-strings version
- Can use my `_parseJSON` to parse a (finished) stream of JS values
    - Can't actually "stream" bytes in and expect it to spit out objects
    - Actually you could if you retry until you don't get an EOF error, but inefficient...
    - More accurate to say "parse many values in a single string"

Example:
```js
// Input string
[
    'newlines and such are fine btw',
    
    true, false, undefined, null,
    {
        a: 'hi', "b": 'ok', ["c"]: 'ooook',
        [5]: { [[1, 2]]: .45e-2},
    },
    [{ nested: { data: [1e3, 2, 3.1415e+0, 0xcafebabe, 0o666] } }],
]
// Resulting object
[
  'newlines and such are fine btw',
  true, false, undefined, null,
  { '5': { '1,2': 0.0045 }, a: 'hi', b: 'ok', c: 'ooook' },
  [ { nested: { data: [ 1000, 2, 3.1415, 3405691582, 438 ] } } ]
]
// Example output for same input but with `'ok'` replaced with ` 'not' ok`
// and we use `pointAtCharacter` with `thrownError.index` for the preview:
/*=================================
Expected '}', ',' or ';' after value in object at 110 but got "o" instead:
4|    true, false, undefined, null,
5|    {
6|        a: 'hi', "b":  'not' ok , ["c"]: 'ooook',
                               ^
7|        [5]: { [[1, 2]]: .45e-2},
8|    },
=================================*/
```
I wrote this as part of [this Stack Overflow answer](https://stackoverflow.com/a/68670117/14274597).

### [Static class stuff](./src/static-class-stuff.ts)
Not much to say about this, it's quite old. Tried to do some fancy stuff where one class could extend another class **including static fields**. Eventually worked out that using a decorator kinda works, but actually never fully "finished" the whole thing.

### [Multi class](./src/multi-class.ts)
Similar to the previous one, this is also an old attempt at weird class stuff. Idea was to have one class extend multiple other classes, while supporting `instanceof` and such. Technically feasible using `Symbol.hasInstance` as shown (or just cheatingly using proxies), but never actually finished it.
