import { lstat, realpath, stat } from 'node:fs/promises'
import { isAbsolute, join, matchesGlob, posix, relative, resolve, sep } from 'node:path'
import { HedyError } from '../../errors.js'
import { readTextFile } from '../jira/files.js'

const TOOLING_PACKAGE = 'node_modules/@defra/delivery-info-arch-tooling'

/**
 * Resolves to what statOf, such as stat or lstat, gives for path, else to
 * undefined when the path or a folder on the path does not exist. Rethrows any
 * other error.
 *
 * @param {(path: string) => Promise<import('node:fs').Stats>} statOf
 * @param {string} path
 */
export const findStat = async (statOf, path) => {
  try {
    return await statOf(path)
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return undefined
    throw error
  }
}

const realDocsRepo = async (workspaceRoot) => {
  const folder = join(workspaceRoot, 'trade-imports-documentation')
  if ((await findStat(stat, folder))?.isDirectory() !== true) {
    throw new HedyError('USAGE', `The docs repo is not at ${folder}. Clone it with make -C ~/trade-imports-arch-workspace clone, then run the command again.`)
  }
  return realpath(folder)
}

const checkToolingInstalled = async (docsRepo) => {
  const entry = join(docsRepo, ...TOOLING_PACKAGE.split('/'))
  if (await findStat(lstat, entry) === undefined) {
    throw new HedyError('USAGE', `The docs repo at ${docsRepo} is not installed: ${TOOLING_PACKAGE} is missing. Run npm --prefix ~/trade-imports-arch-workspace/trade-imports-documentation install, then run the command again.`)
  }
  if (await findStat(stat, entry) === undefined) {
    throw new HedyError('USAGE', `The docs repo at ${docsRepo} links ${TOOLING_PACKAGE} to a folder that does not exist. Clone the tooling with make -C ~/trade-imports-arch-workspace clone and run npm --prefix ~/trade-imports-arch-workspace/trade-imports-documentation install, then run the command again.`)
  }
}

/**
 * Resolves to the real path of <workspaceRoot>/trade-imports-documentation and
 * the path of its publish config. Rejects USAGE when the folder is missing, when
 * node_modules/@defra/delivery-info-arch-tooling is missing, and when that entry
 * is a link to a folder that does not exist.
 *
 * @param {string} workspaceRoot
 * @returns {Promise<{ docsRepo: string, configPath: string }>}
 */
export const locateDocsRepo = async (workspaceRoot) => {
  const docsRepo = await realDocsRepo(workspaceRoot)
  await checkToolingInstalled(docsRepo)
  return { docsRepo, configPath: join(docsRepo, 'scripts', 'confluence', 'confluence-config.json') }
}

const firstRegularFile = async (candidates) => {
  for (const candidate of candidates) {
    if ((await findStat(stat, candidate))?.isFile() === true) return candidate
  }
  return undefined
}

const pageFileFor = async ({ docsRepo, given, cwd }) => {
  const candidates = [resolve(cwd, given), join(docsRepo, given), join(docsRepo, 'docs', given)]
  const found = await firstRegularFile(candidates)
  if (found === undefined) {
    const [asGiven, inRepo, inDocs] = candidates
    throw new HedyError('USAGE', `The page ${given} is not a file at ${asGiven}, at ${inRepo} or at ${inDocs}. Give the path of a page, absolute or relative to the current folder, the docs repo or the docs folder, then run the command again.`)
  }
  return realpath(found)
}

const pathUnderDocs = (docsFolder, absolutePath) => {
  const relativePath = relative(docsFolder, absolutePath)
  if (relativePath === '' || relativePath === '..' || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
    throw new HedyError('USAGE', `The page ${absolutePath} is not under ${docsFolder}. Only pages under docs/ publish. Give a page under that folder, then run the command again.`)
  }
  return relativePath.split(sep).join('/')
}

const checkMarkdownName = (absolutePath) => {
  if (!absolutePath.endsWith('.md')) {
    throw new HedyError('USAGE', `The page ${absolutePath} is not a markdown page because its name does not end in .md. Give a page whose name ends in .md, then run the command again.`)
  }
}

/**
 * Resolves the page given as a path relative to cwd, to the docs repo or to its
 * docs folder, in that order, to the first that is a regular file. Rejects USAGE
 * when none is, when the file's real path is not under the real docs folder, and
 * when its name does not end in .md.
 *
 * @param {{ docsRepo: string, given: string, cwd: string }} options docsRepo is a real path
 * @returns {Promise<{ absolutePath: string, page: string, relativeToDocs: string }>}
 *   absolutePath is the real path; page is docs/<relativeToDocs>; both use / separators
 */
export const resolvePage = async ({ docsRepo, given, cwd }) => {
  const absolutePath = await pageFileFor({ docsRepo, given, cwd })
  const relativeToDocs = pathUnderDocs(await realpath(join(docsRepo, 'docs')), absolutePath)
  checkMarkdownName(absolutePath)
  return { absolutePath, page: `docs/${relativeToDocs}`, relativeToDocs }
}

const parsedConfig = (text, configPath) => {
  try {
    return JSON.parse(text)
  } catch (error) {
    throw new HedyError('PARSE', `The publish config at ${configPath} is not JSON. Fix the syntax in the file, then run the command again.`, { cause: error })
  }
}

const isPlainObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value)

const checkConfigShape = (config, configPath) => {
  const refusal = (problem) => new HedyError('USAGE', `The publish config at ${configPath} ${problem}, then run the command again.`)
  if (!isPlainObject(config.spaceMapping)) throw refusal('has no spaceMapping object. Add spaceMapping, an object from folder names to space keys')
  if (!Array.isArray(config.publishPaths)) throw refusal('has no publishPaths list. Add publishPaths, the list of the pages to publish')
  if (config.options?.dryRun === true) throw refusal('sets options.dryRun, so the publisher would publish nothing. Set options.dryRun to false')
}

/**
 * Resolves to the parsed publish config. Rejects USAGE when the file is missing,
 * PARSE when the text is not JSON, and USAGE when spaceMapping is not a plain
 * object, when publishPaths is not a list, or when options.dryRun is true.
 *
 * @param {string} configPath
 */
export const readPublishConfig = async (configPath) => {
  const text = await readTextFile(configPath, {
    kind: 'publish config',
    missing: () => {
      throw new HedyError('USAGE', `The publish config is not at ${configPath}. Check the docs repo checkout, then run the command again.`)
    }
  })
  const config = parsedConfig(text, configPath)
  checkConfigShape(config, configPath)
  return config
}

const excludePatternMatches = (pattern, relativeToDocs) => {
  const expression = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$')
  return expression.test(posix.basename(relativeToDocs)) || expression.test(relativeToDocs)
}

const entryListsPage = (entry, relativeToDocs) => {
  if (!entry.path || entry.type === 'diagram') return false
  if (!entry.path.includes('*')) return entry.path === relativeToDocs
  const excludes = entry.exclude ?? []
  return matchesGlob(relativeToDocs, entry.path) && !excludes.some((pattern) => excludePatternMatches(pattern, relativeToDocs))
}

/**
 * Returns the first publishPaths entry that lists the page, by the publisher's
 * rules, else undefined. A diagram entry lists no page. A path holding * is a
 * glob, and its exclude patterns, * as any text and ? as one character, remove
 * a page whose file name or path under docs they match.
 *
 * @param {{ publishPaths: object[] }} config
 * @param {string} relativeToDocs the page's path under docs, / separated
 */
export const publishEntryFor = (config, relativeToDocs) =>
  config.publishPaths.find((entry) => entryListsPage(entry, relativeToDocs))

const mappedSpace = (spaceMapping, relativeToDocs) => {
  const [top, system] = relativeToDocs.split('/')
  if (top === 'systems') return spaceMapping[system]
  if (top === 'trade' || top === 'Trade') return spaceMapping.trade || spaceMapping.Trade
  return undefined
}

/**
 * Returns the space key for the page by the publisher's rule: systems/<name>/
 * gives spaceMapping[name], and trade/ or Trade/ gives spaceMapping.trade, else
 * spaceMapping.Trade. Throws USAGE naming configPath, or the publish config in
 * words, when the rule gives no space.
 *
 * @param {{ spaceMapping: Record<string, string> }} config
 * @param {string} relativeToDocs the page's path under docs, / separated
 * @param {string} [configPath]
 * @returns {string}
 */
export const spaceFor = (config, relativeToDocs, configPath) => {
  const space = mappedSpace(config.spaceMapping, relativeToDocs)
  if (!space) {
    throw new HedyError('USAGE', `No spaceMapping entry gives a space for ${relativeToDocs}. Add the entry to ${configPath ?? 'the publish config'}, then run the command again.`)
  }
  return space
}
