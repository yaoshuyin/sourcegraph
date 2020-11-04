import { CharacterRange, ParserResult, Sequence, Token, Pattern, PatternKind } from './parser'
import { RegExpParser, visitRegExpAST, validateRegExpLiteral } from 'regexpp'
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

const patternToRegexp = (pattern: Pattern): Token[] => {
    const tokens: Token[] = []
    console.log(`pattern: ${pattern.value}`)
    try {
        const ast = new RegExpParser().parsePattern(pattern.value)
        if (ast) {
            visitRegExpAST(ast, {
                onAlternativeEnter(node: regexNode.Alternative) {
                    console.log(`ALTERNATIVE: ${node.raw}`)
                },
                onAssertionEnter(node: regexNode.Assertion) {
                    console.log(`ASSERTION: ${node.raw}`)
                },
                onBackreferenceEnter(node: regexNode.Backreference) {
                    console.log(`BACK REFERENCE: ${node.raw}`)
                },
                onCapturingGroupEnter(node: regexNode.CapturingGroup) {
                    console.log(`CAPTURING GROUP: ${node.raw} ${node.start} ${node.end}`)
                    const offset = pattern.range.start
                    tokens.push({
                        type: 'regexpmeta',
                        range: { start: node.start + offset, end: node.end + offset },
                        value: node.raw,
                    })
                },
                onCharacterEnter(node: regexNode.Character) {
                    console.log(`CHARACTER: ${node.raw}`)
                    const offset = pattern.range.start
                    tokens.push({
                        type: 'pattern',
                        range: { start: node.start + offset, end: node.end + offset },
                        value: node.raw,
                        kind: PatternKind.Regexp,
                    })
                },
                onCharacterClassRangeEnter(node: regexNode.CharacterClassRange) {
                    console.log(`CHARACTER CLASS: ${node.raw}`)
                },
                onCharacterSetEnter(node: regexNode.CharacterSet) {
                    console.log(`CHARACTER SET: ${node.raw}`)
                },
                onGroupEnter(node: regexNode.Group) {
                    console.log(`GROUP: ${node.raw} ${node.start} ${node.end}`)
                },
                onPatternEnter(node: regexNode.Pattern) {
                    console.log(`PATTERN: ${node.raw}`)
                },
                onRegExpLiteralEnter(node: regexNode.RegExpLiteral) {
                    console.log(`LITERAL: ${node.raw}`)
                    tokens.push({
                        type: 'pattern',
                        range: { start: node.start, end: node.end },
                        value: node.raw,
                        kind: PatternKind.Regexp,
                    })
                },
                onQuantifierEnter(node: regexNode.Quantifier) {
                    console.log(`QUANTIFIER ${node.raw}`)
                    console.log(`QUANTIFIER PARENT: ${node.parent.raw}`)
                    tokens.push({
                        type: 'regexpmeta',
                        range: { start: node.start, end: node.end }, // this range is the whole quantified expression
                        value: node.raw, // good for completion (?)
                    })
                },
                onQuantifierLeave(node: regexNode.Quantifier) {
                    console.log(`QUANTIFIER LEAVE ${node.raw}`)
                },
            })
        }
    } catch {
        console.log(`fail to parse ${pattern.value}`)
    }
    return tokens
}

const patternToStructural = (pattern: Pattern): Token[] => [pattern]

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
                newTokens = patternToRegexp(token)
            } else if (token.kind === PatternKind.Structural) {
                newTokens = patternToStructural(token)
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
