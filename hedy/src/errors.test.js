import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { ERROR_CODES, HedyError, isHedyError, toHedyError, toHedyErrors } from './errors.js'

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

  it('turns a ZodError into one USAGE error joining each issue message with a space, keeping it as the cause', () => {
    const schema = z.object({
      key: z.string('The key must be text.'),
      max: z.number('--max must be a whole number greater than 0.')
    })
    const zodError = schema.safeParse({ key: 1, max: 'x' }).error
    const wrapped = toHedyError(zodError)
    expect(isHedyError(wrapped)).toBe(true)
    expect(wrapped.code).toBe('USAGE')
    expect(wrapped.message).toBe('The key must be text. --max must be a whole number greater than 0.')
    expect(wrapped.cause).toBe(zodError)
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

describe('toHedyErrors', () => {
  it('returns each error an AggregateError holds, in order, keeping a HedyError unchanged', () => {
    const auth = new HedyError('AUTH', 'Jira rejected the credentials.')
    const usage = new HedyError('USAGE', 'Confluence refused the request.')
    expect(toHedyErrors(new AggregateError([auth, usage], 'Several failures'))).toEqual([auth, usage])
  })

  it('wraps a plain Error inside an AggregateError as UNKNOWN, keeping it as the cause', () => {
    const auth = new HedyError('AUTH', 'Jira rejected the credentials.')
    const original = new TypeError('x is not a function')
    const [first, second] = toHedyErrors(new AggregateError([auth, original]))
    expect(first).toBe(auth)
    expect(second).toMatchObject({ name: 'HedyError', code: 'UNKNOWN', message: 'x is not a function', cause: original })
  })

  it('returns a single HedyError unchanged as the only entry', () => {
    const error = new HedyError('USAGE', 'Bad flag.')
    expect(toHedyErrors(error)).toEqual([error])
  })

  it('wraps a single non-HedyError as the only entry, UNKNOWN', () => {
    const [only, ...rest] = toHedyErrors(new Error('disk full'))
    expect(rest).toEqual([])
    expect(only).toMatchObject({ code: 'UNKNOWN', message: 'disk full' })
  })

  it('treats an AggregateError holding no errors as one UNKNOWN error, keeping it as the cause', () => {
    const empty = new AggregateError([], 'Nothing inside')
    const [only, ...rest] = toHedyErrors(empty)
    expect(rest).toEqual([])
    expect(only).toMatchObject({ code: 'UNKNOWN', message: 'Nothing inside', cause: empty })
  })
})
