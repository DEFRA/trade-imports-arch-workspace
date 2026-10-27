import { describe, it, expect } from 'vitest'
import { EXIT, exitCodeFor, exitCodeForAll } from './exit-codes.js'

describe('EXIT', () => {
  it('maps OK, ERROR and USAGE to 0, 1 and 2 and cannot be changed', () => {
    expect(EXIT).toEqual({ OK: 0, ERROR: 1, USAGE: 2 })
    expect(Object.isFrozen(EXIT)).toBe(true)
  })
})

describe('exitCodeFor', () => {
  it.each([
    ['USAGE', 2],
    ['UNKNOWN', 1],
    ['NOT_A_CODE', 1],
    [undefined, 1]
  ])('exitCodeFor(%j) is %i', (code, expected) => {
    expect(exitCodeFor(code)).toBe(expected)
  })
})

describe('exitCodeForAll', () => {
  it.each([
    [['USAGE'], 2],
    [['AUTH'], 1],
    [['USAGE', 'USAGE'], 2],
    [['USAGE', 'AUTH'], 1],
    [['AUTH', 'USAGE'], 1],
    [['AUTH', 'NETWORK'], 1]
  ])('exitCodeForAll(%j) is %i', (codes, expected) => {
    expect(exitCodeForAll(codes)).toBe(expected)
  })
})
