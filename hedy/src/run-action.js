import { failureEnvelope, successEnvelope } from './envelope.js'
import { toHedyErrors } from './errors.js'
import { EXIT, exitCodeForAll } from './exit-codes.js'

/**
 * Runs one command action and writes its outcome: the rendered result or a JSON
 * envelope on stdout, or in text mode each error's message on its own stderr
 * line. An AggregateError the action throws reports each error it holds, and
 * the exit code is the lowest among them. Sets the exit code through
 * setExitCode and returns it; never calls process.exit().
 *
 * @param {() => unknown} action sync or async; its return value is the result
 * @param {object} [options]
 * @param {boolean} [options.json] write one JSON envelope line instead of text
 * @param {(result: unknown) => string} [options.render] text-mode formatter
 * @param {{ write: (chunk: string) => unknown }} [options.stdout]
 * @param {{ write: (chunk: string) => unknown }} [options.stderr]
 * @param {(code: number) => void} [options.setExitCode]
 * @returns {Promise<number>} the exit code
 */
export async function runAction (action, {
  json = false,
  render = (result) => String(result),
  stdout = process.stdout,
  stderr = process.stderr,
  setExitCode = (code) => { process.exitCode = code }
} = {}) {
  let output
  try {
    const result = await action()
    output = json ? JSON.stringify(successEnvelope(result)) : render(result)
  } catch (error) {
    const errors = toHedyErrors(error)
    if (json) {
      stdout.write(`${JSON.stringify(failureEnvelope(errors))}\n`)
    } else {
      for (const { message } of errors) stderr.write(`${message}\n`)
    }
    const code = exitCodeForAll(errors.map(({ code }) => code))
    setExitCode(code)
    return code
  }
  stdout.write(`${output}\n`)
  setExitCode(EXIT.OK)
  return EXIT.OK
}
