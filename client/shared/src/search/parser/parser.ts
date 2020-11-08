import { PatternKind, Token, KeywordKind } from './scanner'

export interface Pattern {
    type: 'pattern'
    kind: PatternKind
    value: string
    quoted: boolean
    negated: boolean
}

export interface Parameter {
    type: 'parameter'
    field: string
    value: string
    negated: boolean
}

export enum OperatorKind {
    Or = 'OR',
    And = 'AND',
}

/**
 * A nonterminal node for operators AND and OR.
 */
export interface Operator {
    type: 'operator'
    operands: Node[]
    kind: OperatorKind
}

export type Node = Operator | Parameter | Pattern

interface ParseError {
    type: 'error'
    expected: string
}

export interface ParseSuccess {
    type: 'success'
    nodes: Node[]
}

export type ParseResult = ParseError | ParseSuccess

interface State {
    result: ParseResult
    tokens: Token[]
}

const createNodes = (nodes: Node[]): ParseSuccess => ({
    type: 'success',
    nodes,
})

const createPattern = (value: string, kind: PatternKind, quoted: boolean, negated: boolean): ParseSuccess =>
    createNodes([
        {
            type: 'pattern',
            kind,
            value,
            quoted,
            negated,
        },
    ])

const createParameter = (field: string, value: string, negated: boolean): ParseSuccess =>
    createNodes([
        {
            type: 'parameter',
            field,
            value,
            negated,
        },
    ])

const createOperator = (nodes: Node[], kind: OperatorKind): ParseSuccess => ({
    type: 'success',
    nodes: [
        {
            type: 'operator',
            operands: nodes,
            kind,
        },
    ],
})

const tokenToLeafNode = (token: Token): ParseResult => {
    if (token.type === 'pattern') {
        return createPattern(token.value, token.kind, false, false)
    }
    if (token.type === 'filter') {
        const filterValue = token.filterValue
            ? token.filterValue.type === 'literal'
                ? token.filterValue.value
                : token.filterValue.quotedValue
            : ''
        return createParameter(token.filterType.value, filterValue, token.negated)
    }
    return { type: 'error', expected: 'a convertable token to tree node' }
}

export const parseLeaves = (tokens: Token[]): State => {
    const nodes: Node[] = []
    while (true) {
        const current = tokens[0]
        if (current === undefined) {
            break
        }
        if (current.type === 'openingParen') {
            tokens = tokens.slice(1) // Consume '('.

            const groupNodes = parseOr(tokens)
            if (groupNodes.result.type === 'error') {
                return { result: groupNodes.result, tokens }
            }
            nodes.push(...groupNodes.result.nodes)
            tokens = groupNodes.tokens // Advance to the next list of tokens.
            continue
        }
        if (current.type === 'closingParen') {
            tokens = tokens.slice(1) // Consume ')'
            if (nodes.length === 0) {
                // We parsed '()'. The scanner doesn't decide whether we interpret '()' as a literal pattern
                // or an empty group. That's a call we make here in the parser. We treat '()' literally in all
                // search modes because it's more intuitive for users to treat it search pattern than an empty
                // group in literal mode, or an empty group in regex.
                nodes.push({
                    type: 'pattern',
                    kind: PatternKind.Literal,
                    value: '()',
                    quoted: false,
                    negated: false,
                })
            }
            break
        }
        if (current.type === 'keyword' && (current.kind === KeywordKind.And || current.kind === KeywordKind.Or)) {
            return { result: createNodes(nodes), tokens } // Caller advances.
        }
        if (current.type === 'keyword' && current.kind === KeywordKind.Not) {
            const nextToken = tokens[1]
            if (nextToken === undefined) {
                // Nothing after NOT. Convert it to a pattern.
                nodes.push(...createPattern(current.value, PatternKind.Literal, false, false).nodes)
                tokens = tokens.slice(1)
                break
            }
            if (nextToken.type !== 'filter' && nextToken.type !== 'pattern') {
                return {
                    result: {
                        type: 'error',
                        expected:
                            'NOT may only come before patterns or parameters like repo:foo, expressions are not supported',
                    },
                    tokens,
                }
            }

            const next = parseLeaves(tokens)
            if (next.result.type === 'error') {
                return { result: next.result, tokens }
            }
            const nextNode = next.result.nodes[0]
            if (nextNode.type === 'parameter' && nextNode.negated) {
                // No double negation.
                return {
                    result: {
                        type: 'error',
                        expected: `no double negation: NOT before an already negated parameter -${nextNode.field}:${nextNode.value}`,
                    },
                    tokens,
                }
            }
            if (nextNode.type === 'pattern') {
                nodes.push({
                    type: 'pattern',
                    kind: nextNode.kind,
                    value: nextNode.value,
                    quoted: nextNode.quoted,
                    negated: true,
                })
            } else if (nextNode.type === 'parameter') {
                // Invariant, type assertion?
                nodes.push({
                    type: 'parameter',
                    field: nextNode.field,
                    value: nextNode.value,
                    negated: true,
                })
            }
            tokens = next.tokens
            continue
        }

        const node = tokenToLeafNode(current)
        if (node.type === 'error') {
            return { result: node, tokens }
        }
        nodes.push(...node.nodes)
        tokens = tokens.slice(1)
    }
    return {
        result: {
            type: 'success',
            nodes,
        },
        tokens,
    }
}

export const parseAnd = (tokens: Token[]): State => {
    const left = parseLeaves(tokens)
    if (left.result.type === 'error') {
        return { result: left.result, tokens }
    }
    if (left.tokens[0] === undefined) {
        return { result: left.result, tokens }
    }
    if (!(left.tokens[0].type === 'keyword' && left.tokens[0].kind === KeywordKind.And)) {
        return { result: left.result, tokens: left.tokens }
    }
    tokens = left.tokens.slice(1) // Consume AND token.
    const right = parseAnd(tokens)
    if (right.result.type === 'error') {
        return { result: right.result, tokens }
    }
    return {
        result: createOperator(left.result.nodes.concat(...right.result.nodes), OperatorKind.And),
        tokens: right.tokens,
    }
}

export const parseOr = (tokens: Token[]): State => {
    const left = parseAnd(tokens)
    if (left.result.type === 'error') {
        return { result: left.result, tokens }
    }
    if (left.tokens[0] === undefined) {
        return { result: left.result, tokens }
    }
    if (!(left.tokens[0].type === 'keyword' && left.tokens[0].kind === KeywordKind.Or)) {
        return { result: left.result, tokens: left.tokens }
    }
    tokens = left.tokens.slice(1) // Consume OR token.
    const right = parseOr(tokens)
    if (right.result.type === 'error') {
        return { result: right.result, tokens }
    }
    return {
        result: createOperator(left.result.nodes.concat(...right.result.nodes), OperatorKind.Or),
        tokens: right.tokens,
    }
}

export const parseSearchQuery = (tokens: Token[]): ParseResult =>
    parseOr(tokens.filter(token => token.type !== 'whitespace')).result
