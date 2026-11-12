import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
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
 * @param {{ workspace?: string, env?: Record<string, string | undefined>, cwd?: string, input?: string }} [options]
 *   workspace is passed as --workspace before the arguments; without it the child uses the checkout it runs from.
 *   env is merged over process.env; a name set to undefined is left out of the child's environment.
 *   input is written to the child's stdin, which then closes
 * @returns {Promise<{ stdout: string, stderr: string, exitCode: number, envelope: unknown }>}
 */
export const runCli = async (args, { workspace, env = {}, cwd, input } = {}) => {
  const workspaceArgs = workspace === undefined ? [] : ['--workspace', workspace]
  const { stdout, stderr, exitCode } = await execa('node', [CLI_PATH, ...workspaceArgs, ...args], {
    reject: false,
    env: { ...process.env, ...env },
    cwd,
    input
  })
  return { stdout, stderr, exitCode, envelope: envelopeOf(stdout) }
}

/**
 * Creates a workspace folder, by default a new temporary one holding a .claude
 * folder and a Makefile, which passes the workspace check. The caller removes it.
 *
 * @param {{ at?: string, claudeFolder?: boolean, makefile?: boolean, files?: Record<string, string> }} [options]
 *   at creates the folder at that path instead of a new temporary one
 *   files maps a path relative to the folder to the text written there
 * @returns {Promise<string>} the folder's absolute path
 */
export const createWorkspace = async ({ at, claudeFolder = true, makefile = true, files = {} } = {}) => {
  const root = at ?? await mkdtemp(join(tmpdir(), 'hedy-workspace-'))
  await mkdir(root, { recursive: true })
  if (claudeFolder) await mkdir(join(root, '.claude'))
  if (makefile) await writeFile(join(root, 'Makefile'), 'all:\n')
  for (const [path, text] of Object.entries(files)) {
    await mkdir(dirname(join(root, path)), { recursive: true })
    await writeFile(join(root, path), text)
  }
  return root
}
