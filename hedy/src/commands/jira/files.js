import { readFile } from 'node:fs/promises'
import { HedyError } from '../../errors.js'

/**
 * Resolves to the UTF-8 text of the file at path. A missing file resolves
 * to what missing(error) returns, and missing may throw instead. Any other
 * read error rejects with UNKNOWN naming kind and path.
 *
 * @param {string} path
 * @param {{ kind: string, missing: (error: NodeJS.ErrnoException) => unknown }} options
 */
export const readTextFile = async (path, { kind, missing }) => {
  try {
    return await readFile(path, 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') return missing(error)
    throw new HedyError(
      'UNKNOWN',
      `The ${kind} at ${path} could not be read. Check that the path is a regular file with read permission, then run the command again.`,
      { cause: error }
    )
  }
}

/**
 * Returns the value the JSON text holds. Throws USAGE naming kind and path,
 * then nextStep, when the text is not JSON.
 *
 * @param {string} text
 * @param {{ kind: string, path: string, nextStep: string }} options
 */
export const parseJsonText = (text, { kind, path, nextStep }) => {
  try {
    return JSON.parse(text)
  } catch (error) {
    throw new HedyError('USAGE', `The ${kind} at ${path} is not JSON. ${nextStep}`, { cause: error })
  }
}
