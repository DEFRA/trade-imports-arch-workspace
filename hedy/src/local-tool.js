import { spawn } from 'node:child_process'
import { HedyError } from './errors.js'

const spawnErrorOf = (error, command) => {
  if (error.code === 'ENOENT') {
    return new HedyError('USAGE', `${command} was not found on PATH. Install ${command}, then run the command again.`, { cause: error })
  }
  return new HedyError(
    'UNKNOWN',
    `${command} could not be started. Check that ${command} is an executable file and that the working folder exists, then run the command again.`,
    { cause: error }
  )
}

const collectStream = (stream, streamName, onOutput) => {
  const chunks = []
  stream.setEncoding('utf8')
  stream.on('data', (chunk) => {
    chunks.push(chunk)
    onOutput?.({ stream: streamName, chunk })
  })
  return () => chunks.join('')
}

const signalGroup = (child, signal) => {
  try {
    process.kill(-child.pid, signal)
  } catch (error) {
    if (error.code !== 'ESRCH') throw error
  }
}

const scheduleTermination = (child, { timeoutMs, killGraceMs }) => {
  const termination = { timedOut: false, timers: [] }
  if (timeoutMs === undefined) return termination
  termination.timers.push(setTimeout(() => {
    termination.timedOut = true
    signalGroup(child, 'SIGTERM')
    termination.timers.push(setTimeout(() => signalGroup(child, 'SIGKILL'), killGraceMs))
  }, timeoutMs))
  return termination
}

const cancelTermination = ({ timers }) => {
  timers.forEach((timer) => clearTimeout(timer))
}

/**
 * Runs command with args and resolves to { exitCode, signal, stdout, stderr, timedOut }
 * on any exit, a non-zero exit included. env is the child's whole environment. stdout
 * and stderr are collected in full as UTF-8, and onOutput, when given, receives
 * { stream, chunk } for each chunk in arrival order. The child starts in a process
 * group of its own, and a child still running after timeoutMs gets SIGTERM, then
 * SIGKILL after killGraceMs, each sent to the whole group so the programs the child
 * started stop with it, and the result then has timedOut true and exitCode null. Rejects
 * with USAGE when the executable is not found and with UNKNOWN, keeping the spawn
 * error as the cause, for any other spawn error.
 *
 * @param {{
 *   command: string, args?: string[], cwd?: string, env?: NodeJS.ProcessEnv,
 *   timeoutMs?: number, killGraceMs?: number,
 *   onOutput?: (output: { stream: 'stdout' | 'stderr', chunk: string }) => void
 * }} options
 * @returns {Promise<{ exitCode: number | null, signal: NodeJS.Signals | null, stdout: string, stderr: string, timedOut: boolean }>}
 */
export const runLocalTool = async ({ command, args = [], cwd, env, timeoutMs, killGraceMs = 5000, onOutput }) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env, shell: false, detached: true, stdio: ['ignore', 'pipe', 'pipe'] })
    const stdoutText = collectStream(child.stdout, 'stdout', onOutput)
    const stderrText = collectStream(child.stderr, 'stderr', onOutput)
    const termination = scheduleTermination(child, { timeoutMs, killGraceMs })
    child.on('error', (error) => {
      cancelTermination(termination)
      reject(spawnErrorOf(error, command))
    })
    child.on('close', (exitCode, signal) => {
      cancelTermination(termination)
      resolve({ exitCode, signal, stdout: stdoutText(), stderr: stderrText(), timedOut: termination.timedOut })
    })
  })
