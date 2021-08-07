
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
