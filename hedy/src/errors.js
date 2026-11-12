import { ZodError } from 'zod'

export const ERROR_CODES = Object.freeze(['USAGE', 'UNKNOWN', 'AUTH', 'NOT_FOUND', 'RATE_LIMIT', 'NETWORK', 'PARSE', 'SETUP', 'PROSE'])

export class HedyError extends Error {
  /**
   * @param {string} code one of ERROR_CODES; any other value throws a plain Error
   * @param {string} message
   * @param {{ cause?: unknown, result?: unknown }} [options]
   *   result is the command result a failure still reports; error.result is set only when result is given
   */
  constructor (code, message, { cause, result } = {}) {
    if (!ERROR_CODES.includes(code)) {
      throw new Error(`HedyError code "${code}" is not one of ${ERROR_CODES.join(', ')}`)
    }
    super(message, cause === undefined ? undefined : { cause })
    this.name = 'HedyError'
    this.code = code
    if (result !== undefined) this.result = result
  }
}

export const isHedyError = (error) => error instanceof HedyError

/**
 * Returns the result of the first error that holds one, else undefined.
 *
 * @param {HedyError[]} errors
 */
export const resultHeldBy = (errors) => errors.find((error) => Object.hasOwn(error, 'result'))?.result

/**
 * Returns a HedyError unchanged. Wraps a ZodError as USAGE, its issue messages
 * joined with a space, and anything else as UNKNOWN, keeping either as the cause.
 */
export const toHedyError = (error) => {
  if (isHedyError(error)) return error
  if (error instanceof ZodError) {
    return new HedyError('USAGE', error.issues.map(({ message }) => message).join(' '), { cause: error })
  }
  return new HedyError('UNKNOWN', error?.message || String(error), { cause: error })
}

/**
 * Returns each error an AggregateError holds through toHedyError, in order. Anything
 * else, an AggregateError holding no errors included, gives [toHedyError(error)].
 *
 * @returns {HedyError[]} one or more errors
 */
export const toHedyErrors = (error) =>
  error instanceof AggregateError && error.errors.length > 0
    ? error.errors.map((inner) => toHedyError(inner))
    : [toHedyError(error)]
