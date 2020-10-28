interface A {
    type: 'a'
}

interface B {
    type: 'b'
}

type T = A | B

interface TArray {
    type: 'array'
    values: T[]
}

type TT = T | TArray

interface No {
    type: 'no'
}

interface Yes<T = TT> {
    type: 'yes'
    result: T
}

type Result<TT> = No | Yes<TT>

const returnTT = (): Result<TArray> => ({
    type: 'yes',
    result: { type: 'array', values: [{ type: 'a' }, { type: 'b' }] },
})

const safe = (): void => {
    const tarray: Result<TArray> = returnTT()
    if (tarray.type === 'yes') {
        for (const value of tarray.result.values) {
            if (value.type === 'a') {
                console.log('cool')
            }
        }
    }
}
