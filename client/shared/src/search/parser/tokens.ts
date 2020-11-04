import * as Monaco from 'monaco-editor'
import { Sequence } from './parser'

/**
 * Returns the tokens in a parsed search query displayed in the Monaco query input.
 */
export function getMonacoTokens(parsedQuery: Pick<Sequence, 'members'>): Monaco.languages.IToken[] {
    const tokens: Monaco.languages.IToken[] = []
    for (const token of parsedQuery.members) {
        switch (token.type) {
            case 'whitespace':
                tokens.push({
                    startIndex: token.range.start,
                    scopes: 'whitespace',
                })
                break
            case 'filter':
                {
                    tokens.push({
                        startIndex: token.filterType.range.start,
                        scopes: 'keyword',
                    })
                    if (token.filterValue) {
                        tokens.push({
                            startIndex: token.filterValue.range.start,
                            scopes: 'identifier',
                        })
                    }
                }
                break
            case 'pattern':
                tokens.push({
                    startIndex: token.range.start,
                    scopes: 'pattern',
                })
                break
            case 'openingParen':
            case 'closingParen':
                tokens.push({
                    startIndex: token.range.start,
                    scopes: 'paren',
                })
                break
            case 'regexpmeta':
                tokens.push({
                    startIndex: token.range.start,
                    scopes: 'regexpmeta',
                })
                break
            case 'structuralmeta':
                tokens.push({
                    startIndex: token.range.start,
                    scopes: 'structuralmeta',
                })
                break
            case 'operator':
                tokens.push({
                    startIndex: token.range.start,
                    scopes: 'operator',
                })
                break
            case 'comment':
                tokens.push({
                    startIndex: token.range.start,
                    scopes: 'comment',
                })
                break
            default:
                tokens.push({
                    startIndex: token.range.start,
                    scopes: 'identifier',
                })
                break
        }
    }
    return tokens
}
