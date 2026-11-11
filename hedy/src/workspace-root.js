import { statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { HedyError } from './errors.js'

const CHECKOUT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

const isDirectory = (path) => statSync(path, { throwIfNoEntry: false })?.isDirectory() === true
const isFile = (path) => statSync(path, { throwIfNoEntry: false })?.isFile() === true

const missingParts = (root) => [
  ...(isDirectory(join(root, '.claude')) ? [] : ['.claude folder']),
  ...(isFile(join(root, 'Makefile')) ? [] : ['Makefile'])
]

const refusal = (root, source, missing) => {
  const origin = {
    '--workspace': '--workspace',
    checkout: 'the checkout hedy runs from'
  }
  const nextStep = {
    '--workspace': 'Pass --workspace the path of a workspace checkout.',
    checkout: 'Install hedy from a workspace checkout with make install, or pass --workspace.'
  }
  return `The folder ${root}, from ${origin[source]}, is not a workspace because it has no ${missing.join(' and no ')}. ${nextStep[source]}`
}

/**
 * Picks the workspace root from the --workspace value, else the checkout that
 * holds the hedy source, and checks it holds a .claude folder and a Makefile.
 *
 * @param {object} [options]
 * @param {string} [options.workspace] the --workspace value; a relative path resolves against the current folder
 * @param {string} [options.checkoutRoot] the checkout hedy runs from, by default the one that holds this file
 * @returns {string} the absolute workspace root
 * @throws {HedyError} USAGE when the chosen folder is not a workspace
 */
export const resolveWorkspaceRoot = ({ workspace, checkoutRoot = CHECKOUT_ROOT } = {}) => {
  const [root, source] = workspace ? [resolve(workspace), '--workspace'] : [checkoutRoot, 'checkout']
  const missing = missingParts(root)
  if (missing.length > 0) throw new HedyError('USAGE', refusal(root, source, missing))
  return root
}
