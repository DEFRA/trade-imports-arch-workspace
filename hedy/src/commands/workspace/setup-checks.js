import { constants } from 'node:fs'
import { access, readdir, readFile, realpath, stat } from 'node:fs/promises'
import { delimiter, join, relative, sep } from 'node:path'
import { HedyError } from '../../errors.js'
import { findStat, locateDocsRepo } from '../confluence/docs-repo.js'

const setupError = (message) => new HedyError('SETUP', message)

const wordList = (words) => words.length <= 1 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`

const realpathOrUndefined = async (path) => {
  try {
    return await realpath(path)
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return undefined
    throw error
  }
}

const readJsonOrUndefined = async (path) => {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return undefined
    throw error
  }
}

const isInside = (path, folder) => path === folder || path.startsWith(`${folder}${sep}`)

const isExecutableFile = async (path) => {
  if ((await findStat(stat, path))?.isFile() !== true) return false
  try {
    await access(path, constants.X_OK)
    return true
  } catch (error) {
    if (error.code === 'EACCES') return false
    throw error
  }
}

const isOnPath = async (tool, env) => {
  for (const folder of (env.PATH ?? '').split(delimiter).filter((entry) => entry !== '')) {
    if (await isExecutableFile(join(folder, tool))) return true
  }
  return false
}

const checkNode = async ({ root, nodeVersion }) => {
  if (Number(nodeVersion.split('.')[0]) >= 24) return `Node ${nodeVersion}`
  throw setupError(`Node ${nodeVersion} is older than 24. Install Node 24 or later, then run make -C ${root} install.`)
}

const checkBaselineTools = async ({ env }) => {
  const tools = ['bash', 'curl', 'jq', 'git']
  const missing = []
  for (const tool of tools) {
    if (!(await isOnPath(tool, env))) missing.push(tool)
  }
  if (missing.length === 0) return `${wordList(tools)} are on PATH`
  throw setupError(`${wordList(missing)} ${missing.length === 1 ? 'is' : 'are'} not on PATH. Install ${missing.length === 1 ? 'it' : 'them'}, then run the check again.`)
}

const childProblem = async ({ root, child, env, runTool }) => {
  const folder = join(root, child)
  if ((await findStat(stat, folder))?.isDirectory() !== true) return `${child} is not cloned`
  const { exitCode } = await runTool({ command: 'git', args: ['-C', folder, 'remote', 'get-url', 'origin'], env })
  return exitCode === 0 ? undefined : `${child} has no origin remote`
}

const checkChildRepos = async ({ root, env, runTool }) => {
  const makefile = join(root, 'Makefile')
  const children = (await readFile(makefile, 'utf8')).match(/^CHILDREN[ \t]*:?=(.*)$/m)?.[1].trim().split(/\s+/).filter((name) => name !== '') ?? []
  if (children.length === 0) throw setupError(`The Makefile at ${makefile} has no CHILDREN line. Restore the line, then run the check again.`)
  const problems = (await Promise.all(children.map((child) => childProblem({ root, child, env, runTool })))).filter((problem) => problem !== undefined)
  if (problems.length === 0) return `${wordList(children)} are present with an origin remote`
  throw setupError(`${wordList(problems)}. Clone and wire them with make -C ${root} clone.`)
}

const checkGitHooks = async ({ root, env, runTool }) => {
  const { stdout } = await runTool({ command: 'git', args: ['-C', root, 'config', '--get', 'core.hooksPath'], env })
  const hooksPath = stdout.trim()
  if (hooksPath === '.githooks') return 'core.hooksPath is .githooks'
  throw setupError(`core.hooksPath is ${hooksPath === '' ? 'not set' : hooksPath}, so the pre-commit gates do not run. Set it with make -C ${root} install.`)
}

const checkHedyLink = async ({ root, env, runTool }) => {
  const { exitCode, stdout } = await runTool({ command: 'npm', args: ['root', '--global'], env })
  if (exitCode !== 0) throw setupError(`npm root --global failed, so the hedy link cannot be checked. Check the npm install, then run make -C ${root} install.`)
  const globalModules = stdout.trim()
  const link = join(globalModules, 'hedy')
  const linkedHedy = await realpathOrUndefined(link)
  const checkoutHedy = join(root, 'hedy')
  if (linkedHedy === undefined) throw setupError(`hedy is not linked into ${globalModules}. Link it with make -C ${root} install.`)
  if (linkedHedy !== checkoutHedy) throw setupError(`The linked hedy runs from ${linkedHedy}, not from this checkout. Link this checkout with make -C ${root} install.`)
  return `${link} links to ${checkoutHedy}`
}

const checkHedyPackages = async ({ root, env, runTool }) => {
  const hedyFolder = join(root, 'hedy')
  const modules = join(hedyFolder, 'node_modules')
  const manifest = join(hedyFolder, 'package.json')
  const { exitCode } = await runTool({ command: 'npm', args: ['ls', '--prefix', hedyFolder, '--depth', '0'], env })
  if (exitCode === 0) return `the packages under ${modules} match ${manifest}`
  throw setupError(`The packages under ${modules} do not match ${manifest}. Install them with make -C ${root} install.`)
}

const checkDocsRepoInstall = async ({ root }) => {
  if ((await findStat(stat, join(root, 'trade-imports-documentation')))?.isDirectory() !== true) {
    return 'not checked, because the docs repo is not cloned'
  }
  const { docsRepo } = await locateDocsRepo(root)
  return `${docsRepo} links node_modules/@defra/delivery-info-arch-tooling`
}

const checkCurrentFolder = async ({ root, env, cwd }) => {
  if (!isInside(cwd, root)) return `${cwd} is outside the workspace`
  const typed = env.PWD
  if (typed === undefined || typed === cwd || await realpathOrUndefined(typed) !== cwd) return `${cwd} is a real path`
  throw setupError(`The current folder ${typed} reaches the workspace through a symlink. Start sessions and commands from ${cwd}.`)
}

const checkHomeFolderLinks = async ({ root, homedir }) => {
  const links = []
  for (const entry of await readdir(homedir, { withFileTypes: true })) {
    const link = join(homedir, entry.name)
    if (entry.isSymbolicLink() && await realpathOrUndefined(link) === root) links.push(link)
  }
  if (links.length === 0) return `no symlink in ${homedir} points at the checkout`
  const one = links.length === 1
  throw setupError(`${wordList(links)} ${one ? 'points' : 'point'} at the checkout, so a path typed through ${one ? 'it' : 'them'} loads no path-scoped rule. Remove ${one ? 'it' : 'them'} with unlink ${links.join(' ')}.`)
}

const checkLocalAllowRules = async ({ root, homedir }) => {
  const settings = await readJsonOrUndefined(join(root, '.claude', 'settings.local.json'))
  if (settings === undefined) return 'there is no .claude/settings.local.json'
  const spellings = isInside(root, homedir) ? [root, `~/${relative(homedir, root)}`] : [root]
  const offending = (settings.permissions?.allow ?? []).filter((rule) => spellings.some((spelling) => rule.includes(spelling)))
  if (offending.length === 0) return 'no allow rule in .claude/settings.local.json names the checkout by an absolute or home-relative path'
  throw setupError(`.claude/settings.local.json allows ${wordList(offending)}, which name the checkout by an absolute or home-relative path, so a command typed relative to the workspace root does not match. Rewrite each rule relative to the workspace root.`)
}

const checkWorkingDirectoryPin = async ({ root }) => {
  const pin = 'CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR'
  const local = (await readJsonOrUndefined(join(root, '.claude', 'settings.local.json')))?.env?.[pin]
  const project = (await readJsonOrUndefined(join(root, '.claude', 'settings.json')))?.env?.[pin]
  const value = local ?? project
  if (value === '1') return `${pin} is "1"`
  const effect = 'so a cd in a session moves later Bash calls and the file tools'
  const nextStep = local === undefined
    ? `Set ${pin} to "1" in the env block of .claude/settings.json.`
    : `Remove ${pin} from .claude/settings.local.json.`
  throw setupError(`${pin} is ${value === undefined ? 'not set' : `"${value}"`}, ${effect}. ${nextStep}`)
}

/**
 * The workspace setup checks in report order. Each run takes
 * { root, env, cwd, homedir, nodeVersion, runTool }, where root is the
 * workspace's real path and runTool has the shape of runLocalTool, and resolves
 * to the detail of a pass or rejects with a HedyError naming the next step,
 * SETUP for a failed check.
 *
 * @type {readonly { name: string, run: (context: object) => Promise<string> }[]}
 */
export const SETUP_CHECKS = Object.freeze([
  { name: 'Node', run: checkNode },
  { name: 'Baseline tools', run: checkBaselineTools },
  { name: 'Child repos', run: checkChildRepos },
  { name: 'Git hooks', run: checkGitHooks },
  { name: 'hedy link', run: checkHedyLink },
  { name: 'hedy packages', run: checkHedyPackages },
  { name: 'Docs repo install', run: checkDocsRepoInstall },
  { name: 'Current folder', run: checkCurrentFolder },
  { name: 'Home folder links', run: checkHomeFolderLinks },
  { name: 'Local allow rules', run: checkLocalAllowRules },
  { name: 'Working-directory pin', run: checkWorkingDirectoryPin }
])
