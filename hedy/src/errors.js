import { ZodError } from 'zod'
import { faultReport } from './fault-report.js'

export const ERROR_CODES = Object.freeze(['USAGE', 'UNKNOWN', 'AUTH', 'NOT_FOUND', 'RATE_LIMIT', 'NETWORK', 'PARSE', 'SETUP', 'PROSE', 'INTERNAL'])

export class HedyError extends Error {
  /**
   * @param {string} code one of ERROR_CODES; any other value throws a plain Error
   * @param {string} message
   * @param {{ cause?: unknown, result?: unknown, report?: ReturnType<typeof faultReport> }} [options]
   *   result is the command result a failure still reports; report is the triage
   *   report of a fault in hedy; each is set on the error only when given
   */
  constructor (code, message, { cause, result, report } = {}) {
    if (!ERROR_CODES.includes(code)) {
      throw new Error(`HedyError code "${code}" is not one of ${ERROR_CODES.join(', ')}`)
    }
    super(message, cause === undefined ? undefined : { cause })
    this.name = 'HedyError'
    this.code = code
    if (result !== undefined) this.result = result
    if (report !== undefined) this.report = report
  }
}

export const isHedyError = (error) => error instanceof HedyError

/**
 * Returns the result of the first error that holds one, else undefined.
 *
 * @param {HedyError[]} errors
 */
export const resultHeldBy = (errors) => errors.find((error) => Object.hasOwn(error, 'result'))?.result

const faultOf = (thrown) => thrown instanceof Error ? thrown : { name: 'Error', message: String(thrown) }

const internalError = (thrown, context) => {
  const fault = faultOf(thrown)
  return new HedyError(
    'INTERNAL',
    `hedy stopped on a fault in hedy: ${fault.name}: ${fault.message}. The fault is not in the command's input. File the report as a hedy bug.`,
    { cause: thrown, report: context === undefined ? undefined : faultReport(fault, context) }
  )
}

/**
 * Returns a HedyError unchanged. Wraps a ZodError as USAGE, its issue messages
 * joined with a space, and anything else as INTERNAL, a fault in hedy, keeping
 * either as the cause. Given the context, an INTERNAL error holds the triage
 * report of the fault.
 *
 * @param {unknown} error
 * @param {Parameters<typeof faultReport>[1]} [context]
 */
export const toHedyError = (error, context) => {
  if (isHedyError(error)) return error
  if (error instanceof ZodError) {
    return new HedyError('USAGE', error.issues.map(({ message }) => message).join(' '), { cause: error })
  }
  return internalError(error, context)
}

/**
 * Returns each error an AggregateError holds through toHedyError, in order. Anything
 * else, an AggregateError holding no errors included, gives [toHedyError(error)].
 *
 * @param {unknown} error
 * @param {Parameters<typeof faultReport>[1]} [context]
 * @returns {HedyError[]} one or more errors
 */
export const toHedyErrors = (error, context) =>
  error instanceof AggregateError && error.errors.length > 0
    ? error.errors.map((inner) => toHedyError(inner, context))
    : [toHedyError(error, context)]
