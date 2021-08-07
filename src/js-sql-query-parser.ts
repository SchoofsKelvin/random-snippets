
/*
    === JS SQL query parser ===
    Basically a parser that parses SQL-like queries, basically simple JS conditions:
    - Supports any binary operator with proper operator precedence
    - Supports wrapping an expression in brackets (to e.g. suppress operator precedence)
    - Supports parsing string/number/boolean constants
    - Supports accessing global variables
    - Supports indexing (anything) using any expression or `.field` syntax
    - Supports chaining operators and field indexes, e.g. `a.b && a.b['c'] === 1 + 2`
    Written by Kelvin Schoofs for https://stackoverflow.com/a/68606593/14274597
*/

const BINARY_OPERATORS: Record<string, number> = {
    // AND/OR
    'AND': 1,
    'OR': 0,
    // Equal stuff
    '==': 2,
    '!=': 2,
    '<': 2,
    '<=': 2,
    '>': 2,
    '>=': 2,
}

interface BinaryOperation {
    type: 'binop';
    operator: string;
    left: Expression;
    right: Expression;
}

interface Variable {
    type: 'variable';
    name: string;
}

interface FieldAccess {
    type: 'field';
    object: Expression;
    field: string; // could be Expression
}

interface Constant {
    type: 'constant';
    value: any;
}

interface Brackets {
    type: 'brackets';
    expr: Expression;
}

type Expression = BinaryOperation | Variable | FieldAccess | Constant | Brackets;

function parseConstant(input: string): [number, Constant?] {
    // Numbers (including floats, octals and hexadecimals)
    let match = input.match(/^\s*((?:0[xo]|\d*\.)?\d+)/);
    if (match) {
        const [{ length }, digits] = match;
        return [length, { type: 'constant', value: Number(digits) }];
    }
    // Strings
    match = input.match(/^(\s*)(["'])/);
    if (match) {
        const [, white, quote] = match;
        let value = '';
        let escape = false;
        for (let i = white.length; i < input.length; i++) {
            const ch = input[i];
            if (ch === '\\' && !escape) {
                escape = true;
            } else if (escape) {
                escape = false;
                value += ch;
            } else if (ch === quote) {
                return [i + 1, { type: 'constant', value }];
            } else {
                value += ch;
            }
        }
        return [white.length];
    }
    // Booleans
    match = input.match(/^\s*(true|false)/);
    if (match) {
        const [{ length }, bool] = match;
        return [length, { type: 'constant', value: bool === 'true' }];
    }
    return [0];
}

function parseVariable(input: string): [number, Variable?] {
    const match = input.match(/^\s*(\w+[\w\d]*)/);
    if (!match) return [0];
    return [match[0].length, { type: 'variable', name: match[1] }];
}

function orderBinaryOperations(expr: BinaryOperation): BinaryOperation {
    const { left, right } = expr;
    const priority = BINARY_OPERATORS[expr.operator];
    if (left.type == 'binop' && BINARY_OPERATORS[left.operator] < priority) {
        // LOP < EXP
        // (leftL LOP leftR) EXP exprR) => leftL LOP (leftR EXP exprR)
        return orderBinaryOperations({
            type: 'binop',
            operator: left.operator,
            left: left.left,
            right: {
                type: 'binop',
                operator: expr.operator,
                left: left.right,
                right: expr.right,
            },
        });
    } else if (right.type === 'binop' && BINARY_OPERATORS[right.operator] <= priority) {
        // EXP >= ROP
        // exprL EXP (rightL ROP rightR) => (exprL EXP rightL) ROP rightR
        return orderBinaryOperations({
            type: 'binop',
            operator: right.operator,
            left: {
                type: 'binop',
                operator: expr.operator,
                left: expr.left,
                right: right.left,
            },
            right: right.right,
        });
    }
    return expr;
}

function parsePostExpression(expr: [number, Expression?], input: string): [number, Expression?] {
    if (!expr[1]) return expr;
    const trimmed = input.trimLeft();
    const white = input.length - trimmed.length;
    // Binary operation
    for (const operator in BINARY_OPERATORS) {
        if (trimmed.startsWith(operator)) {
            const offset = expr[0] + white + operator.length;
            const rightResult = parseExpression(trimmed.slice(operator.length));
            if (!rightResult[1]) throw new Error(`Missing right-hand side expression for ${operator}`);
            return parsePostExpression([
                offset + rightResult[0],
                orderBinaryOperations({
                    type: 'binop',
                    operator,
                    left: expr[1],
                    right: rightResult[1],
                })
            ], trimmed.slice(rightResult[0]));
        }
    }
    // Field access
    const match = input.match(/^\.(\w+[\w\d]*)/);
    if (match) {
        const [{ length }, field] = match;
        return parsePostExpression([
            expr[0] + white + length,
            { type: 'field', object: expr[1], field }
        ], trimmed.slice(length));
    }
    return expr;
}

function parseExpression(input: string): [number, Expression?] {
    // Constants
    let result: [number, Expression?] = parseConstant(input);
    // Variables
    if (!result[1]) result = parseVariable(input);
    // Brackets
    if (!result[1]) {
        const match = input.match(/^\s*\(/);
        if (match) {
            const [{ length }] = match;
            const brackets = parseExpression(input.slice(length));
            if (brackets[1]) {
                const offset = brackets[0] + length;
                const endBracket = input.slice(offset).match(/^\s*\)/);
                if (!endBracket) throw new Error(`Missing ')' in '${input}'`);
                result = [offset + endBracket[0].length, {
                    type: 'brackets', expr: brackets[1]
                }];
            }
        }
    }
    return parsePostExpression(result, input.slice(result[0]));
}

function parse(input: string): Expression {
    const [length, expr] = parseExpression(input);
    if (length === input.length) {
        if (expr) return expr;
        throw new Error(`Unfinished expression`);
    }
    if (!expr) throw new Error(`Unexpected character at ${length}`);
    throw new Error(`Unexpected character at ${length}`);
}

const parsed = parse('(section2.fieldxyz<5000 OR section2.fieldxyz>10000) AND section1.fieldabc == value1');
console.log(JSON.stringify(parsed, null, 4));

function formatExpression(expr: Expression): string {
    if (expr.type === 'binop') {
        // Wrapping in [] so the order of operations is clearly visible
        return `[${formatExpression(expr.left)} ${expr.operator} ${formatExpression(expr.right)}]`;
    } else if (expr.type === 'brackets') {
        return `(${formatExpression(expr.expr)})`;
    } else if (expr.type === 'constant') {
        return JSON.stringify(expr.value);
    } else if (expr.type === 'field') {
        return `${formatExpression(expr.object)}.${expr.field}`;
    } else if (expr.type === 'variable') {
        return expr.name;
    }
    throw new Error(`Unexpected expression type '${(expr as any).type}'`);
}

console.log('=>', formatExpression(parsed));

// To prevent other snippets from sharing globals
export {};
