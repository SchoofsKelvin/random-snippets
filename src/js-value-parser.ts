
/*
    === JS value parser ===
    Basically a custom version of a JSON deserialize that supports more JS-like syntax:
    - Don't need to wrap (JS variable name-like) object keys
    - Supports a lot more things than JSON does
        - Supports octal (0xabc) and hexadecimal notation (0o666)
        - Supports decimal and scientific notation (.12e-3)
        - Supports undefined (not that impressive, but JSON only supports null, not undefined)
    - Pretty good error reporting
        - Includes a demo to error report with a preview of where the syntax error happened
        - For the preview part, got an easy version and an optimized-for-large-strings version
    - Can use _parseJSON to parse a (finished) stream of JS values
        - Can't actually "stream" bytes in and expect it to spit out objects
        - Actually you could if you retry until you don't get an EOF error, but inefficient...
        - More accurate to say "parse many values in a single string"
    Written by Kelvin Schoofs for https://stackoverflow.com/a/68670117/14274597
*/

function skipWhite(str: string, i: number): number {
    let ch = str[i];
    while (ch === ' ' || ch === '\n' || ch === '\r') ch = str[++i];
    return i;
}

function escape(str: string): string {
    str = JSON.stringify(str);
    return str.slice(1, str.length - 1);
}

const VALID_NAME_REGEX = /[a-zA-Z_$][0-9a-zA-Z_$]*/y;
const VALID_NUMBER_REGEX = /(0x[\da-f]+|0o[0-7]+|\d*\.?\d+(e[\-+]?\d+)?)/yi;

class SyntaxError extends Error {
    constructor(message: string, public readonly index: number) {
        super(message);
    }
}

function _parseJSON(str: string, firstI: number): [any, number] {
    firstI = skipWhite(str, firstI);
    const firstCH = str[firstI];
    if (!firstCH) {
        throw new SyntaxError(`Unexpected EOF at ${firstI}`, firstI);
    } else if (firstCH === '"' || firstCH === "'") {
        let value = '';
        let escape = false;
        for (let i = firstI + 1, ch = ''; ch = str[i]; i++) {
            if (escape) {
                value += ch;
            } else if (ch === '\\') {
                escape = true;
            } else if (ch === firstCH) {
                return [value, i + 1];
            } else {
                value += ch;
            }
        }
        throw new SyntaxError(`Unfinished string started at ${firstI}`, firstI);
    } else if (str.slice(firstI, firstI + 4) === 'true') {
        return [true, firstI + 4];
    } else if (str.slice(firstI, firstI + 5) === 'false') {
        return [false, firstI + 5];
    } else if (str.slice(firstI, firstI + 4) === 'null') {
        return [null, firstI + 4];
    } else if (str.slice(firstI, firstI + 9) === 'undefined') {
        return [undefined, firstI + 9];
    } else if (firstCH === '[') {
        const arr = [];
        let allowed = true;
        for (let i = skipWhite(str, firstI + 1), ch = ''; ch = str[i]; i = skipWhite(str, i + 1)) {
            if (ch === ']') {
                return [arr, i + 1];
            } else if (ch === ',') {
                if (allowed) arr.push(undefined);
                allowed = true;
            } else if (!allowed) {
                throw new SyntaxError(`Expected ']' or ',' after value in array at ${i} but got "${escape(ch)}" instead`, i);
            } else {
                const [val, valEnd] = _parseJSON(str, i);
                arr.push(val);
                i = valEnd - 1;
                allowed = false;
            }
        }
        throw new SyntaxError(`Expected ']' to close array at ${firstI}`, firstI);
    } else if (firstCH === '{') {
        const obj: any = {};
        let allowed = true;
        for (let i = skipWhite(str, firstI + 1), ch = ''; ch = str[i]; i = skipWhite(str, i + 1)) {
            if (ch === '}') {
                return [obj, i + 1];
            } else if (ch === ',' || ch === ';') {
                if (allowed) throw new SyntaxError(`Unexpected character "${escape(ch)}" at ${i}`, i);
                allowed = true;
                continue;
            } else if (!allowed) {
                throw new SyntaxError(`Expected '}', ',' or ';' after value in object at ${i} but got "${escape(ch)}" instead`, i);
            }
            let key;
            if (ch === '[') {
                const [keyVal, keyEnd] = _parseJSON(str, ++i);
                i = skipWhite(str, keyEnd);
                if (str[i] !== ']') throw new SyntaxError(`Expected ']' to close '[' in object at ${i} but got "${escape(str[i])}" instead`, i);
                i = skipWhite(str, i + 1);
                key = keyVal;
            } else if (ch === '"' || ch === "'") {
                [key, i] = _parseJSON(str, i);
                i = skipWhite(str, i);
            } else {
                VALID_NAME_REGEX.lastIndex = i;
                const match = VALID_NAME_REGEX.exec(str);
                if (!match) throw new SyntaxError(`Unexpected character "${escape(ch)}" at ${i}`, i);
                key = match[0];
                i = VALID_NAME_REGEX.lastIndex;
            }
            ch = str[i = skipWhite(str, i)];
            if (ch !== ':') throw new SyntaxError(`Expected ':' after key in object at ${i} but got "${escape(ch)}" instead`, i);
            const [val, valEnd] = _parseJSON(str, skipWhite(str, i + 1));
            obj[key] = val;
            i = valEnd - 1;
            allowed = false;
        }
        throw new SyntaxError(`Expected '}' to close object at ${firstI}`, firstI);
    } else {
        VALID_NUMBER_REGEX.lastIndex = firstI;
        const match = VALID_NUMBER_REGEX.exec(str);
        if (!match) throw new SyntaxError(`Unexpected character "${escape(firstCH)}" at ${firstI}`, firstI);
        const value = Number(match[0]);
        if (Number.isNaN(value)) throw new SyntaxError(`Could not convert "${match[0]}" to a number at ${firstI}`, firstI);
        return [value, VALID_NUMBER_REGEX.lastIndex];
    }
}

function parseJSON(str: string): any {
    const [result, end] = _parseJSON(str, 0);
    const i = skipWhite(str, end);
    if (i !== str.length)
        throw new SyntaxError(`Unexpected character "${escape(str[i])}" at ${i}`, i);
    return result;
}

function pointAtCharacterOld(str: string, index: number, context = 2): string {
    const lines = str.split('\n');
    let targetLine = 0;
    let targetStart = 0;
    for (let i = 0, c = 0; i < lines.length; i++, c++) {
        const line = lines[i];
        c += line.length;
        if (!targetLine && c >= index) {
            targetLine = i;
            targetStart = c - line.length;;
        }
    }
    let builder: string[] = [];
    for (let i = Math.max(targetLine - context, 0); i < lines.length && i <= targetLine + context; i++) {
        const line = (i + 1).toString();
        builder.push(`${line}:${' '.repeat(4 - line.length)}${lines[i]}`);
        if (i === targetLine) {
            builder.push(' '.repeat(index - targetStart + 5) + '^');
        }
    }
    return builder.join('\n');
}

function pointAtCharacter(str: string, index: number, context = 2): string {
    let start = 0;
    let last = 0;
    let lc = 0;
    let found: number | undefined;
    let starts: [i: number, l: number][] = [];
    const maxS = context + context + 1;
    for (; last < str.length; last++) {
        if (str[last] !== '\n') continue;
        starts.push([start, lc++]);
        start = last + 1;
        if (found === undefined && last > index) found = starts[starts.length - 1][1];
        if (found === undefined && starts.length > context) starts.shift();
        if (found !== undefined && starts.length === maxS) break;
    }
    if (last === str.length) starts.push([start, lc++]);
    const maxW = starts[starts.length - 1][1].toString().length;
    let builder: string[] = [];
    for (let s = 0; s < starts.length; s++) {
        const [i, l] = starts[s];
        const e = starts[s + 1]?.[0] || (last + 1);
        const line = (l + 1).toString();
        builder.push(`${' '.repeat(maxW - line.length)}${line}|${str.slice(i, e - 1)}`);
        if (l === found) {
            builder.push(' '.repeat(index - i + 1 + maxW) + '^');
        }
    }
    return builder.join('\n');
}

const data = `[
    'newlines and such are fine btw',

    true, false, undefined, null,
    {
        a: 'hi', "b": 'ok', ["c"]: 'ooook',
        [5]: { [[1, 2]]: .45e-2},
    },
    [{ nested: { data: [1e3, 2, 3.1415e+0, 0xcafebabe, 0o666] } }],
]`;

const parsed = parseJSON(data);
console.log(parsed);
console.log(JSON.stringify(parsed));
// ^ Mind that `JSON.stringify` converts `undefined` to `null`

// Try the pretty error printing stuff
const invalidData = data.replace(`'ok'`, ` 'not' ok `);
try {
    parseJSON(invalidData);
} catch (e) {
    const err = e as SyntaxError;
    console.error('=================================');
    console.error(err.message + ':');
    console.error(pointAtCharacter(invalidData, err.index));
    console.error('=================================');
}

// Try streaming values
{
    console.log('Streamed values:');
    const stream = `
    'string'
    123
    [ 1, 2, 3 ]
    { complex: { ["nested"]: 'object'; with: 1 }, 'number': ['in', ['it']] }
    0o666
    `;
    let i = 0;
    while (i < stream.length) {
        const [result, end] = _parseJSON(stream, i);
        console.log('-', result);
        // Need to skip whitespace at the end since parsing just whitespace errors
        // (otherwise replace the `i < stream.length` with "is there non-whitespace left?")
        i = skipWhite(stream, end);
    }
}


// To prevent other files from sharing globals
export { };
