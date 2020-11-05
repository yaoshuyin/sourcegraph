import { CharacterRange, ParserResult, Sequence, Token, Pattern, PatternKind } from './parser'
import { RegExpParser, visitRegExpAST, validateRegExpLiteral } from 'regexpp'
import * as regexNode from 'regexpp/ast'

export interface RegexpMetaGeneric {
    type: 'regexpMetaGeneric'
    range: CharacterRange
    value: string
    hover: string
}

export interface RegexpMetaDelimited {
    type: 'regexpMetaDelimited'
    range: CharacterRange
    value: string
    hover: string
}

export interface RegexpMetaCharacterClass {
    type: 'regexpMetaCharacterClass'
    range: CharacterRange
    value: string
    hover: string
}

export interface RegexpMetaCharacterClassHover {
    type: 'regexpMetaCharacterClassHover'
    range: CharacterRange
    value: string
    hover: string
}

export type RegexpMeta =
    | RegexpMetaGeneric
    | RegexpMetaCharacterClass
    | RegexpMetaDelimited
    | RegexpMetaCharacterClassHover

export interface StructuralMeta {
    type: 'structuralMetaGeneric'
    range: CharacterRange
    value: string
    hover: string
}

const patternToRegexp = (pattern: Pattern): Token[] => {
    const tokens: Token[] = []
    console.log(`pattern: ${pattern.value}`)
    try {
        const ast = new RegExpParser().parsePattern(pattern.value)
        if (ast) {
            const offset = pattern.range.start
            visitRegExpAST(ast, {
                onAlternativeEnter(node: regexNode.Alternative) {
                    console.log(`ALTERNATIVE: ${node.raw}`)
                },
                onAssertionEnter(node: regexNode.Assertion) {
                    console.log(`ASSERTION: ${node.raw}`)
                    tokens.push({
                        type: 'regexpMetaCharacterClass',
                        range: { start: node.start + offset, end: node.end + offset },
                        value: node.raw,
                        hover: 'assertion',
                    })
                },
                onBackreferenceEnter(node: regexNode.Backreference) {
                    console.log(`BACK REFERENCE: ${node.raw}`)
                },
                onCapturingGroupEnter(node: regexNode.CapturingGroup) {
                    console.log(`CAPTURING GROUP ENTER: ${node.raw} ${node.start} ${node.end}`)
                    // Just the '('
                    tokens.push({
                        type: 'regexpMetaGeneric',
                        range: { start: node.start + offset, end: node.start + offset + 1 },
                        value: '(',
                        hover: 'capturing group',
                    })
                    // The whole group, for some hover info on the range, use something other than regexpmeta
                    /*
                    tokens.push({
                        type: 'regexpMetaGeneric',
                        range: { start: node.start + offset, end: node.end + offset },
                        value: node.raw,
                    })
                    */
                },
                onCapturingGroupLeave(node: regexNode.CapturingGroup) {
                    console.log(`CAPTURING GROUP EXIT: ${node.raw} ${node.start} ${node.end}`)
                    // Just the ')'
                    tokens.push({
                        type: 'regexpMetaGeneric',
                        range: { start: node.end + offset - 1, end: node.end + offset },
                        value: ')',
                        hover: '**Capturing group.** Groups multiple tokens together.',
                    })
                },
                onCharacterEnter(node: regexNode.Character) {
                    console.log(`CHARACTER: ${node.raw} length: ${node.start} ${node.end}`)
                    tokens.push({
                        type: 'pattern',
                        range: { start: node.start + offset, end: node.end + offset },
                        value: node.raw,
                        kind: PatternKind.Regexp,
                    })
                },
                onCharacterClassEnter(node: regexNode.CharacterClass) {
                    console.log(`CHARACTER CLASS: ${node.raw}`)
                    // Just the '['
                    tokens.push({
                        type: 'regexpMetaCharacterClass',
                        range: { start: node.start + offset, end: node.start + offset + 1 },
                        value: '[',
                        hover: 'open [',
                    })
                    // Just the ']'
                    tokens.push({
                        type: 'regexpMetaCharacterClass',
                        range: { start: node.end + offset - 1, end: node.end + offset },
                        value: ']',
                        hover: '**Character set.** Match any character in the set in the range a-z.',
                    })
                    // Could push the range for hover, but need to generate separate hover ranges
                    // otherwise they negate the highlighting
                    /*
                    tokens.push({
                        type: 'regexpMetaCharacterClassHover',
                        range: { start: node.start + offset, end: node.end + offset },
                        value: node.raw,
                    })
                    */
                },
                onCharacterClassRangeEnter(node: regexNode.CharacterClassRange) {
                    console.log(`CHARACTER CLASS RANGE: ${node.raw}`)
                    // Any dashes
                    let index = node.start + offset
                    for (const char of node.raw) {
                        if (char === '-') {
                            // janky, range can be --x
                            if (node.raw[index - 1] !== '\\') {
                                console.log(`pushing generic | ${index} ${index + 1}`)
                                tokens.push({
                                    type: 'regexpMetaCharacterClass',
                                    range: { start: index, end: index + 1 },
                                    value: '-',
                                    hover: 'character class matches ...',
                                })
                            }
                        }
                        index += 1
                    }
                    // Could push the range for hover
                },
                onCharacterSetEnter(node: regexNode.CharacterSet) {
                    console.log(`CHARACTER SET: ${node.raw}`)
                    let hover = ''
                    if (node.raw === '\\s') {
                        hover = '**Whitespace.** Matches any whitespace character (spaces, tabs, linebreaks).'
                    } else if (node.raw === '\\d') {
                        hover = '**Digit** Matches any digit character (0-9).'
                    }
                    tokens.push({
                        type: 'regexpMetaCharacterClass',
                        range: { start: node.start + offset, end: node.end + offset },
                        value: node.raw,
                        hover,
                    })
                },
                onGroupEnter(node: regexNode.Group) {
                    console.log(`GROUP: ${node.raw} ${node.start} ${node.end}`)
                },
                onPatternLeave(node: regexNode.Pattern) {
                    console.log(`PATTERN: ${node.raw}`)
                    // Search for `|`, we can't visit/infer the position of it.
                    // any escaped \| gets handled/overwridden by the 'character' visitor,
                    // so don't bother thinking about escape case
                    let index = node.start + offset
                    for (const char of node.raw) {
                        if (char === '|') {
                            if (node.raw[index - 1] !== '\\') {
                                console.log(`pushing generic | ${index} ${index + 1}`)
                                tokens.push({
                                    type: 'regexpMetaGeneric',
                                    range: { start: index, end: index + 1 },
                                    value: '|',
                                    hover:
                                        '**Alternation**. Acts like a boolean OR. Matches the expression before or after the `|`',
                                })
                            }
                        }
                        index += 1
                    }
                },
                onRegExpLiteralEnter(node: regexNode.RegExpLiteral) {
                    console.log(`LITERAL: ${node.raw}`)
                },
                onQuantifierEnter(node: regexNode.Quantifier) {
                    // The whole quantified pattern, for some hover info on the range, use something other than regexpmeta
                    /*
                    tokens.push({
                        type: 'regexpMetaGeneric',
                        range: { start: node.start + offset, end: node.end + offset },
                        value: node.raw,
                        hover: 'quantifier',
                    })
                    */
                },
                onQuantifierLeave(node: regexNode.Quantifier) {
                    console.log(`QUANTIFIER LEAVE ${node.raw}`)
                    console.log(`QUANTIFIER PARENT: ${node.parent.raw}`)
                    const bracedQuantifier = node.raw.endsWith('}')

                    if (bracedQuantifier) {
                        const startBrace = node.raw.indexOf('{') // Janky: range could have escapes, slice it out backward.

                        const commaStart = node.raw.indexOf(',') // Janky, breaks for: ([1-9]{2,3}){3,4}. slice it out backwards
                        if (commaStart >= 0) {
                            tokens.push({
                                type: 'regexpMetaCharacterClass',
                                range: { start: startBrace + offset, end: commaStart + offset },
                                value: node.raw,
                                hover: 'range',
                            })
                            tokens.push({
                                type: 'pattern',
                                range: { start: commaStart + offset, end: offset + 1 },
                                value: ',',
                                kind: PatternKind.Regexp,
                            })
                            tokens.push({
                                type: 'regexpMetaCharacterClass',
                                range: { start: commaStart + 1 + offset, end: offset + node.end },
                                value: node.raw,
                                hover: 'rrange',
                            })
                        } else {
                            tokens.push({
                                type: 'regexpMetaCharacterClass',
                                range: { start: startBrace + offset, end: node.end + offset },
                                value: node.raw,
                                hover: 'range no comma',
                            })
                        }
                    } else {
                        // Just the last +, *, or ?
                        let subtract = 1
                        if (!node.greedy) {
                            // If there are two quantifiers (lazy quantifier added).
                            subtract = 2
                        }

                        let hover = ''
                        if (subtract === 1) {
                            if (node.raw.endsWith('*')) {
                                hover = '**Quantifier.** Match 0 or more of the preceding token.'
                            } else if (node.raw.endsWith('+')) {
                                hover = '**Quantifier.** Match 1 or more of the preceding token.'
                            } else if (node.raw.endsWith('?')) {
                                hover = '**Quantifier.** Match 0 or 1 of the preceding token.'
                            }
                        }

                        tokens.push({
                            type: 'regexpMetaGeneric',
                            range: { start: node.end + offset - subtract, end: node.end + offset },
                            value: node.raw, // FIXME
                            hover,
                        })
                    }
                },
            })
        }
    } catch {
        console.log(`fail to parse ${pattern.value}`)
    }
    tokens.sort((left, right) => {
        if (left.range.start < right.range.start) {
            return -1
        }
        return 0
    })
    return tokens
}

const patternToStructural = (pattern: Pattern): Token[] => {
    const tokens: Token[] = []
    const holes = pattern.value.matchAll(/:\[(.*?)]]?|\.\.\./g)

    tokens.push({
        // Jank: start highlighting white
        type: 'pattern',
        range: { start: pattern.range.start, end: pattern.range.start + 1 }, // DEMO hack, push empty highlight on first char
        value: pattern.value,
        kind: PatternKind.Structural,
    })
    for (const hole of holes) {
        if (hole.index) {
            const offset = pattern.range.start
            console.log(
                `pushing ${hole[0]} range: ${hole.index} + ${offset} to ${hole.index} + ${hole[0].length} + ${offset}`
            )
            let hover = 'match everything inside balanced braces, including newlines'
            if (hole[1]) {
                if (pattern.value[hole.index + hole[1].length + offset + 2] !== ')') {
                    hover = `variable \`${hole[1]}\` matches everything up to the first \`${
                        pattern.value[hole.index + hole[1].length + offset + 2]
                    }\``
                } else {
                    hover = `variable \`${hole[1]}\` matches everything up to the closing \`)\``
                }
            }

            tokens.push({
                type: 'structuralMetaGeneric',
                range: { start: hole.index + offset, end: hole.index + hole[0].length + offset },
                value: hole[0],
                hover,
            })

            tokens.push({
                // Jank: reset structural highlighting
                type: 'pattern',
                range: { start: hole.index + hole[0].length + offset, end: hole.index + hole[0].length + offset + 1 },
                kind: PatternKind.Structural,
                value: 'dont care',
            })
        }
    }
    tokens.sort((left, right) => {
        if (left.range.start < right.range.start) {
            return -1
        }
        return 0
    })
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
