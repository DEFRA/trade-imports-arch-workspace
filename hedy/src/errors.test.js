import { describe, it, expect } from 'vitest'
import { ERROR_CODES, HedyError, isHedyError, toHedyError } from './errors.js'

describe('ERROR_CODES', () => {
  it('holds exactly the seven codes and cannot be changed', () => {
    expect([...ERROR_CODES]).toEqual(['USAGE', 'UNKNOWN', 'AUTH', 'NOT_FOUND', 'RATE_LIMIT', 'NETWORK', 'PARSE'])
    expect(Object.isFrozen(ERROR_CODES)).toBe(true)
  })
})

describe('HedyError', () => {
  it.each(ERROR_CODES)('accepts the allowed code %s', (code) => {
    const error = new HedyError(code, 'Something went wrong.')
    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('HedyError')
    expect(error.code).toBe(code)
    expect(error.message).toBe('Something went wrong.')
  })

  it.each(['NOT_A_CODE', 'usage', 'auth', 'MISSING_DEP', '', undefined])('refuses the code %j, naming it', (code) => {
    let thrown
    try {
      new HedyError(code, 'x') // eslint-disable-line no-new
    } catch (error) {
      thrown = error
    }
    expect(thrown).toBeInstanceOf(Error)
    expect(isHedyError(thrown)).toBe(false)
    expect(thrown.message).toContain(`"${code}"`)
  })

  it('keeps a cause only when one is given', () => {
    const upstream = new Error('upstream')
    expect(new HedyError('UNKNOWN', 'x', { cause: upstream }).cause).toBe(upstream)
    expect(Object.hasOwn(new HedyError('UNKNOWN', 'x'), 'cause')).toBe(false)
  })
})

describe('isHedyError', () => {
  it.each([
    [new HedyError('USAGE', 'x'), true],
    [new Error('x'), false],
    [null, false],
    ['USAGE', false]
  ])('isHedyError(%o) is %s', (value, expected) => {
    expect(isHedyError(value)).toBe(expected)
  })
})

describe('toHedyError', () => {
  it('returns a HedyError unchanged', () => {
    const error = new HedyError('USAGE', 'Bad flag.')
    expect(toHedyError(error)).toBe(error)
  })

  it('wraps a non-HedyError as UNKNOWN with the original as cause', () => {
    const original = new TypeError('x is not a function')
    const wrapped = toHedyError(original)
    expect(isHedyError(wrapped)).toBe(true)
    expect(wrapped.code).toBe('UNKNOWN')
    expect(wrapped.message).toBe('x is not a function')
    expect(wrapped.cause).toBe(original)
  })

  it.each([
    ['a thrown string', 'disk full', 'disk full'],
    ['a thrown number', 42, '42'],
    ['undefined', undefined, 'undefined']
  ])('uses String(value) as the message for %s', (_label, value, message) => {
    const wrapped = toHedyError(value)
    expect(wrapped.code).toBe('UNKNOWN')
    expect(wrapped.message).toBe(message)
  })
})
