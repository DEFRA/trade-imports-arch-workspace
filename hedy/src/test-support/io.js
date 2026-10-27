/**
 * Returns the stdout, stderr and setExitCode a command or runAction takes,
 * with out, err and codes holding every chunk and exit code they receive, in
 * order.
 *
 * @returns {{
 *   out: string[], err: string[], codes: number[],
 *   stdout: { write: (chunk: string) => void },
 *   stderr: { write: (chunk: string) => void },
 *   setExitCode: (code: number) => void
 * }}
 */
export const captureIo = () => {
  const out = []
  const err = []
  const codes = []
  return {
    out,
    err,
    codes,
    stdout: { write: (chunk) => { out.push(chunk) } },
    stderr: { write: (chunk) => { err.push(chunk) } },
    setExitCode: (code) => { codes.push(code) }
  }
}
