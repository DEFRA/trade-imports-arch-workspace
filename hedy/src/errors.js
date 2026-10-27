export const ERROR_CODES = Object.freeze(['USAGE', 'UNKNOWN'])

export class HedyError extends Error {
  /**
   * @param {string} code one of ERROR_CODES; any other value throws a plain Error
   * @param {string} message
   * @param {{ cause?: unknown }} [options]
   */
  constructor (code, message, { cause } = {}) {
    if (!ERROR_CODES.includes(code)) {
      throw new Error(`HedyError code "${code}" is not one of ${ERROR_CODES.join(', ')}`)
    }
    super(message, cause === undefined ? undefined : { cause })
    this.name = 'HedyError'
    this.code = code
  }
}

export const isHedyError = (error) => error instanceof HedyError

/**
 * Returns a HedyError unchanged; wraps anything else as UNKNOWN, keeping it as the cause.
 */
export const toHedyError = (error) => {
  if (isHedyError(error)) return error
  return new HedyError('UNKNOWN', error?.message || String(error), { cause: error })
}
