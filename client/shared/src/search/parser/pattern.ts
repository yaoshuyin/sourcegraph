import { CharacterRange, ParserResult, Sequence, Token, PatternKind } from './parser'
import { RegExpParser, visitRegExpAST } from 'regexpp'
import * as regexNode from 'regexpp/ast'

export interface RegexpMeta {
    type: 'regexpmeta'
    range: CharacterRange
    value: string
}

export interface StructuralMeta {
    type: 'structuralmeta'
    range: CharacterRange
    value: string
}

const patternToRegexp = (value: string): Token[] => {
    const tokens: Token[] = []
    console.log(`pattern: ${value}`)
    const ast = new RegExpParser().parsePattern(value)
    if (ast) {
        visitRegExpAST(ast, {
            onQuantifierEnter(node: regexNode.Quantifier) {
                console.log(`start: ${node.start} end: ${node.end} length: ${node.end - node.start}`)
                console.log(`raw: ${node.raw}`)
                tokens.push({
                    type: 'regexpmeta',
                    range: { start: node.start, end: node.end },
                    value: node.raw,
                })
            },
        })
    }
    return tokens
}

const patternToStructural = (value: string): Token[] => {
    const tokens: Token[] = []
    const ast = new RegExpParser().parsePattern(value)
    if (ast) {
        visitRegExpAST(ast, {
            onQuantifierEnter(node: regexNode.Quantifier) {
                console.log(`start: ${node.start} end: ${node.end} length: ${node.end - node.start}`)
                console.log(`raw: ${node.raw}`)
                tokens.push({
                    type: 'structuralmeta',
                    range: { start: node.start, end: node.end },
                    value: node.raw,
                })
            },
        })
    }
    return tokens
}

export const substituteMeta = (tokens: ParserResult<Sequence>): ParserResult<Sequence> => {
    if (tokens.type === 'error') {
        return tokens
    }
    const newMembers: Token[] = []
    for (const token of tokens.token.members) {
        if (token.type === 'pattern') {
            console.log(`token ${token.value}`)
            let newTokens: Token[] = []
            if (token.kind === PatternKind.Regexp) {
                newTokens = patternToRegexp(token.value)
            } else if (token.kind === PatternKind.Structural) {
                newTokens = patternToStructural(token.value)
            } else {
                newTokens = [token]
            }
            for (const newToken of newTokens) {
                newMembers.push(newToken)
            }
        } else {
            newMembers.push(token)
        }
    }
    return {
        type: 'success',
        token: {
            type: 'sequence',
            range: tokens.token.range,
            members: newMembers,
        },
    }
}
