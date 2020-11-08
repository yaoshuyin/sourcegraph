import { scanSearchQuery, ScanSuccess, Sequence } from './scanner'
import { parseSearchQuery, Node, ParseSuccess } from './parser'

export const prettyPrint = (nodes: Node[]): string => nodes.map(toString).join(' ')

expect.addSnapshotSerializer({
    serialize: value => JSON.stringify(value),
    test: () => true,
})

export const parse = (input: string): Node[] => {
    const tokens = scanSearchQuery(input) as ScanSuccess<Sequence>
    return (parseSearchQuery(tokens.token.members) as ParseSuccess).nodes
}

describe('parseSearchQuery', () => {
    test('basic', () =>
        expect(parse('repo:foo a b c')).toMatchInlineSnapshot(
            '[{"type":"parameter","field":"repo","value":"foo","negated":false},{"type":"pattern","kind":1,"value":"a","quoted":false,"negated":false},{"type":"pattern","kind":1,"value":"b","quoted":false,"negated":false},{"type":"pattern","kind":1,"value":"c","quoted":false,"negated":false}]'
        ))

    test('basic', () =>
        expect(parse('a b and c')).toMatchInlineSnapshot(
            '[{"type":"operator","operands":[{"type":"pattern","kind":1,"value":"a","quoted":false,"negated":false},{"type":"pattern","kind":1,"value":"b","quoted":false,"negated":false},{"type":"pattern","kind":1,"value":"c","quoted":false,"negated":false}],"kind":"AND"}]'
        ))

    test('basic', () =>
        expect(parse('a or b')).toMatchInlineSnapshot(
            '[{"type":"operator","operands":[{"type":"pattern","kind":1,"value":"a","quoted":false,"negated":false},{"type":"pattern","kind":1,"value":"b","quoted":false,"negated":false}],"kind":"OR"}]'
        ))

    test('basic', () =>
        expect(parse('a or b and c')).toMatchInlineSnapshot(
            '[{"type":"operator","operands":[{"type":"pattern","kind":1,"value":"a","quoted":false,"negated":false},{"type":"operator","operands":[{"type":"pattern","kind":1,"value":"b","quoted":false,"negated":false},{"type":"pattern","kind":1,"value":"c","quoted":false,"negated":false}],"kind":"AND"}],"kind":"OR"}]'
        ))

    test('basic', () =>
        expect(parse('a and (b or c)')).toMatchInlineSnapshot(
            '[{"type":"operator","operands":[{"type":"pattern","kind":1,"value":"a","quoted":false,"negated":false},{"type":"operator","operands":[{"type":"pattern","kind":1,"value":"b","quoted":false,"negated":false},{"type":"pattern","kind":1,"value":"c","quoted":false,"negated":false}],"kind":"OR"},{"type":"pattern","kind":1,"value":"c","quoted":false,"negated":false}],"kind":"AND"}]'
        ))
})
