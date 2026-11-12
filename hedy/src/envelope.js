import { readFileSync } from 'node:fs'
import { resultHeldBy } from './errors.js'

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
 * The result is the result of the first error that holds one, else null.
 *
 * @param {import('./errors.js').HedyError | import('./errors.js').HedyError[]} errors
 */
export const failureEnvelope = (errors) => {
  const errorList = Array.isArray(errors) ? errors : [errors]
  return {
    ok: false,
    schema_version: SCHEMA_VERSION,
    hedy_version: hedyVersion(),
    result: resultHeldBy(errorList) ?? null,
    errors: errorList.map(({ code, message }) => ({ code, message }))
  }
}
