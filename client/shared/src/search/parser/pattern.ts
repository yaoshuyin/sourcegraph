import { CharacterRange, ParserResult, Sequence, Token, Pattern, PatternKind } from './parser'
import { RegExpParser, visitRegExpAST, validateRegExpLiteral, RegExpValidator } from 'regexpp'
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

const createRegexpMeta = (start: number, end: number, value: string): RegexpMeta => ({
    type: 'regexpmeta',
    range: {
        start,
        end,
    },
    value,
})

const patternToRegexp = (pattern: Pattern): Token[] => {
    const tokens: Token[] = []
    console.log(`-------------------------- pattern: ${pattern.value} -----------------------------`)
    try {
        new RegExpValidator({
            onLiteralLeave(start: number, end: number) {
                console.log(`onLiteralLeave ${pattern.value.slice(start, end)} ${start} ${end}`)
            },
            onPatternLeave(start: number, end: number) {
                console.log(`onPatternLeave ${pattern.value.slice(start, end)} ${start} ${end}`)
            },
            onDisjunctionLeave(start: number, end: number) {
                console.log(`onDisjunctionLeave ${pattern.value.slice(start, end)} ${start} ${end}`)
            },
            onAlternativeLeave(start: number, end: number, index: number) {
                console.log(`onAlternativeLeave ${pattern.value.slice(start, end)} ${start} ${end}`)
            },
            onGroupLeave(start: number, end: number) {
                console.log(`onGroupLeave ${pattern.value.slice(start, end)} ${start} ${end}`)
            },
            /*
            onCapturingGroupLeave(start: number, end: number, name: string | null) {
                console.log(`onCapturingGroupLeave ${pattern.value.slice(start, end)} ${start} ${end}`)
                const parenStart = end
                tokens.push(
                    createRegexpMeta(
                        pattern.range.start + parenStart,
                        end + 1,
                        pattern.value.slice(parenStart, end + 1)
                    )
                )
            },
            */
            onCapturingGroupEnter(start: number, name: string | null) {
                console.log(`onCapturingGroupEnter ${start}`)
                tokens.push(
                    createRegexpMeta(
                        pattern.range.start + start,
                        pattern.range.start + start + 1,
                        pattern.value.slice(start, start + 1)
                    )
                )
            },
            onQuantifier(start: number, end: number, min: number, max: number, greedy: boolean) {
                console.log(`onQuantifier ${pattern.value.slice(start, end)} ${start} ${end}`)
                tokens.push(createRegexpMeta(pattern.range.start + start, end, pattern.value.slice(start, end)))
            },
            onLookaroundAssertionLeave(start: number, end: number, kind: 'lookahead' | 'lookbehind', negate: boolean) {
                console.log(`onLookaroundAssertionLeave ${pattern.value.slice(start, end)} ${start} ${end}`)
            },
            onEdgeAssertion(start: number, end: number, kind: 'start' | 'end') {
                console.log(`onEdgeAssertion ${pattern.value.slice(start, end)} ${start} ${end}`)
            },
            onWordBoundaryAssertion(start: number, end: number, kind: 'word', negate: boolean) {
                console.log(`onWordBoundaryAssertion ${pattern.value.slice(start, end)} ${start} ${end}`)
            },
            onAnyCharacterSet(start: number, end: number, kind: 'any') {
                console.log(`onAnyCharacterSet ${pattern.value.slice(start, end)} ${start} ${end}`)
            },
            onEscapeCharacterSet(start: number, end: number, kind: 'digit' | 'space' | 'word', negate: boolean) {
                console.log(`onEscapeCharacterSet ${pattern.value.slice(start, end)} ${start} ${end}`)
            },
            onUnicodePropertyCharacterSet(
                start: number,
                end: number,
                kind: 'property',
                key: string,
                value: string | null,
                negate: boolean
            ) {
                console.log(`onUnicodePropertyCharacterSet ${pattern.value.slice(start, end)} ${start} ${end}`)
            },
            onCharacter(start: number, end: number, value: number) {
                console.log(`onCharacter ${pattern.value.slice(start, end)} ${start} ${end}`)
                tokens.push({
                    type: 'pattern',
                    range: { start, end },
                    kind: PatternKind.Regexp,
                    value: pattern.value.slice(start, end),
                })
            },
            onBackreference(start: number, end: number, reference: number | string) {
                console.log(`onBackreference ${pattern.value.slice(start, end)} ${start} ${end}`)
            },
            onCharacterClassLeave(start: number, end: number, negate: boolean) {
                console.log(`onCharacterClassLeave ${pattern.value.slice(start, end)} ${start} ${end}`)
            },
        }).validatePattern(pattern.value)
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
