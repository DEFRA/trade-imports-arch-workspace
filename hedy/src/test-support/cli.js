import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execa } from 'execa'

export const CLI_PATH = fileURLToPath(new URL('../cli.js', import.meta.url))

const envelopeOf = (stdout) => {
  if (stdout === '' || stdout.includes('\n')) return undefined
  try {
    return JSON.parse(stdout)
  } catch (error) {
    if (error instanceof SyntaxError) return undefined
    throw error
  }
}

/**
 * Spawns `node cli.js` with the given arguments; never rejects on a non-zero
 * exit. `envelope` is the parsed stdout when stdout is exactly one JSON line,
 * else undefined.
 *
 * @param {string[]} args
 * @param {{ env?: Record<string, string | undefined>, cwd?: string }} [options]
 *   env is merged over process.env; a name set to undefined is left out of the child's environment
 * @returns {Promise<{ stdout: string, stderr: string, exitCode: number, envelope: unknown }>}
 */
export const runCli = async (args, { env = {}, cwd } = {}) => {
  const { stdout, stderr, exitCode } = await execa('node', [CLI_PATH, ...args], {
    reject: false,
    env: { ...process.env, ...env },
    cwd
  })
  return { stdout, stderr, exitCode, envelope: envelopeOf(stdout) }
}

/**
 * Creates a workspace folder, by default a new temporary one holding a .claude
 * folder and a Makefile, which passes the workspace check. The caller removes it.
 *
 * @param {{ at?: string, claudeFolder?: boolean, makefile?: boolean }} [options]
 *   at creates the folder at that path instead of a new temporary one
 * @returns {Promise<string>} the folder's absolute path
 */
export const createWorkspace = async ({ at, claudeFolder = true, makefile = true } = {}) => {
  const root = at ?? await mkdtemp(join(tmpdir(), 'hedy-workspace-'))
  await mkdir(root, { recursive: true })
  if (claudeFolder) await mkdir(join(root, '.claude'))
  if (makefile) await writeFile(join(root, 'Makefile'), 'all:\n')
  return root
}
