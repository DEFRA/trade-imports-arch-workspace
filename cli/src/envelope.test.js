import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { SCHEMA_VERSION, failureEnvelope, hedyVersion, successEnvelope } from './envelope.js'
import { HedyError } from './errors.js'

const packageVersion = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version

describe('hedyVersion', () => {
  it('returns the version in cli/package.json', () => {
    expect(hedyVersion()).toBe(packageVersion)
  })
})

describe('successEnvelope', () => {
  it('has exactly the success keys in order, with the result and package version', () => {
    const envelope = successEnvelope({ answer: 42 })
    expect(Object.keys(envelope)).toEqual(['ok', 'schema_version', 'hedy_version', 'result', 'errors', 'metadata'])
    expect(envelope.ok).toBe(true)
    expect(envelope.schema_version).toBe(SCHEMA_VERSION)
    expect(envelope.hedy_version).toBe(packageVersion)
    expect(envelope.result).toEqual({ answer: 42 })
    expect(envelope.errors).toEqual([])
  })

  it('stamps metadata.ranAt as an ISO-8601 timestamp', () => {
    const { metadata } = successEnvelope('x')
    expect(Object.keys(metadata)).toEqual(['ranAt'])
    expect(Number.isNaN(Date.parse(metadata.ranAt))).toBe(false)
    expect(new Date(metadata.ranAt).toISOString()).toBe(metadata.ranAt)
  })
})

describe('failureEnvelope', () => {
  it('has exactly the failure keys in order, a null result and no metadata', () => {
    const envelope = failureEnvelope(new HedyError('USAGE', 'Bad flag.'))
    expect(Object.keys(envelope)).toEqual(['ok', 'schema_version', 'hedy_version', 'result', 'errors'])
    expect(envelope.ok).toBe(false)
    expect(envelope.schema_version).toBe(SCHEMA_VERSION)
    expect(envelope.hedy_version).toBe(packageVersion)
    expect(envelope.result).toBeNull()
    expect(envelope).not.toHaveProperty('metadata')
  })

  it.each([
    ['one error', new HedyError('USAGE', 'Bad flag.'), [{ code: 'USAGE', message: 'Bad flag.' }]],
    ['an array of errors', [
      new HedyError('USAGE', 'Bad flag.'),
      new HedyError('UNKNOWN', 'Boom.', { cause: new Error('upstream') })
    ], [
      { code: 'USAGE', message: 'Bad flag.' },
      { code: 'UNKNOWN', message: 'Boom.' }
    ]]
  ])('reduces %s to entries carrying exactly code and message', (_label, errors, expected) => {
    const envelope = failureEnvelope(errors)
    expect(envelope.errors).toEqual(expected)
    for (const entry of envelope.errors) {
      expect(Object.keys(entry)).toEqual(['code', 'message'])
    }
  })
})
