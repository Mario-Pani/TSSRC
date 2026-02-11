import { describe, it, expect } from 'vitest'
import { createMemoizer } from './memoizer'

describe('createMemoizer()', () => {
  it('reuses cached results for same args', () => {
    let calls = 0
    const add = (a: number, b: number) => {
      calls += 1
      return a + b
    }

    const memoAdd = createMemoizer(add, 3, (args) => `${args[0]}|${args[1]}`)

    expect(memoAdd(1, 2)).toBe(3)
    expect(memoAdd(1, 2)).toBe(3)
    expect(memoAdd(2, 3)).toBe(5)
    expect(calls).toBe(2)
  })

  it('evicts oldest entries when max size exceeded', () => {
    let calls = 0
    const mul = (a: number, b: number) => {
      calls += 1
      return a * b
    }

    const memoMul = createMemoizer(mul, 2, (args) => `${args[0]}|${args[1]}`)

    expect(memoMul(1, 1)).toBe(1)
    expect(memoMul(2, 2)).toBe(4)
    expect(memoMul(3, 3)).toBe(9)
    expect(memoMul(1, 1)).toBe(1)
    expect(calls).toBe(4)
  })
})
