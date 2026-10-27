import { statSync } from 'node:fs'
import { homedir as osHomedir } from 'node:os'
import { join, resolve } from 'node:path'
import { HedyError } from './errors.js'

const CANONICAL_NAME = 'trade-imports-arch-workspace'

const isDirectory = (path) => statSync(path, { throwIfNoEntry: false })?.isDirectory() === true
const isFile = (path) => statSync(path, { throwIfNoEntry: false })?.isFile() === true

const missingParts = (root) => [
  ...(isDirectory(join(root, '.claude')) ? [] : ['.claude folder']),
  ...(isFile(join(root, 'Makefile')) ? [] : ['Makefile'])
]

const refusal = (root, source, missing) => {
  const nextStep = {
    '--workspace': 'Pass --workspace the path of a workspace checkout.',
    HEDY_WORKSPACE: 'Set HEDY_WORKSPACE to the path of a workspace checkout, or unset it.',
    canonical: `Link your checkout there with ln -s <your-checkout> ~/${CANONICAL_NAME}, or pass --workspace.`
  }
  const origin = source === 'canonical' ? 'the default location' : source
  return `The folder ${root}, from ${origin}, is not a workspace because it has no ${missing.join(' and no ')}. ${nextStep[source]}`
}

/**
 * Picks the workspace root from the --workspace value, then HEDY_WORKSPACE, then
 * ~/trade-imports-arch-workspace, and checks it holds a .claude folder and a
 * Makefile. Never walks up from the current folder.
 *
 * @param {object} [options]
 * @param {string} [options.workspace] the --workspace value; a relative path resolves against the current folder
 * @param {Record<string, string | undefined>} [options.env]
 * @param {string} [options.homedir]
 * @returns {string} the absolute workspace root
 * @throws {HedyError} USAGE when the chosen folder is not a workspace
 */
export const resolveWorkspaceRoot = ({ workspace, env = process.env, homedir = osHomedir() } = {}) => {
  const [root, source] =
    workspace
      ? [resolve(workspace), '--workspace']
      : env.HEDY_WORKSPACE
        ? [resolve(env.HEDY_WORKSPACE), 'HEDY_WORKSPACE']
        : [join(homedir, CANONICAL_NAME), 'canonical']
  const missing = missingParts(root)
  if (missing.length > 0) throw new HedyError('USAGE', refusal(root, source, missing))
  return root
}
