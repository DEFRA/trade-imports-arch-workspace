import { readFileSync } from 'node:fs'

export const SCHEMA_VERSION = 1

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

/**
 * The version field of hedy/package.json.
 */
export const hedyVersion = () => version

export const successEnvelope = (result) => ({
  ok: true,
  schema_version: SCHEMA_VERSION,
  hedy_version: hedyVersion(),
  result,
  errors: [],
  metadata: { ranAt: new Date().toISOString() }
})

/**
 * @param {import('./errors.js').HedyError | import('./errors.js').HedyError[]} errors
 */
export const failureEnvelope = (errors) => ({
  ok: false,
  schema_version: SCHEMA_VERSION,
  hedy_version: hedyVersion(),
  result: null,
  errors: (Array.isArray(errors) ? errors : [errors]).map(({ code, message }) => ({ code, message }))
})
