import { readdir, stat } from 'node:fs/promises'
import { basename, dirname, extname, join, resolve } from 'node:path'
import { findStat } from './docs-repo.js'

const DIAGRAM_KINDS = [
  { kind: 'likec4', tag: /<LikeC4View[^>]*viewId="([^"]*)"/g, sourceExtension: '.c4' },
  { kind: 'mermaid', tag: /<MermaidDiagram[^>]*diagramId="([^"]*)"/g, sourceExtension: '.mmd' }
]

const filesOfEntry = (folder, entry) => {
  const path = join(folder, entry.name)
  if (entry.isDirectory()) return ['node_modules', 'generated', '.git'].includes(entry.name) ? [] : filesUnder(path)
  return entry.isFile() ? [path] : []
}

const filesUnder = async (folder) => {
  const entries = await readdir(folder, { withFileTypes: true })
  const files = await Promise.all(entries.map((entry) => filesOfEntry(folder, entry)))
  return files.flat()
}

const newestTimeOf = async (paths) => {
  const stats = await Promise.all(paths.map((path) => stat(path)))
  return Math.max(-Infinity, ...stats.map(({ mtimeMs }) => mtimeMs))
}

const newestSourceTimes = async (docsRepo) => {
  const files = await filesUnder(docsRepo)
  const entries = await Promise.all(DIAGRAM_KINDS.map(async ({ kind, sourceExtension }) =>
    [kind, await newestTimeOf(files.filter((path) => extname(path) === sourceExtension))]
  ))
  return Object.fromEntries(entries)
}

const exportStatus = (pngStat, newestSourceTime) => {
  if (pngStat?.isFile() !== true || pngStat.size === 0) return 'missing'
  return newestSourceTime > pngStat.mtimeMs ? 'stale' : 'present'
}

const embeddedDiagrams = (docsRepo, text) =>
  DIAGRAM_KINDS.flatMap(({ kind, tag }) => {
    const ids = new Set([...text.matchAll(tag)].map(([, id]) => id))
    return [...ids].map((id) => ({ kind, id, png: join(docsRepo, 'generated', 'diagrams', `${id}.png`) }))
  })

const diagramsOf = async (docsRepo, text) => {
  const embedded = embeddedDiagrams(docsRepo, text)
  if (embedded.length === 0) return []
  const sourceTimes = await newestSourceTimes(docsRepo)
  return Promise.all(embedded.map(async (diagram) =>
    ({ ...diagram, status: exportStatus(await findStat(stat, diagram.png), sourceTimes[diagram.kind]) })
  ))
}

const LIKEC4_EXPORTS = '/likec4-exports/'

const imageTargets = (text) => [...text.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map(([, target]) => target)

const isRemoteTarget = (target) => target.startsWith('http://') || target.startsWith('https://')

const isExportOfEmbeddedView = (target, diagrams) =>
  target.startsWith(LIKEC4_EXPORTS) &&
  diagrams.some(({ kind, id }) => kind === 'likec4' && id === basename(target, extname(target)))

const imageFileOf = ({ docsRepo, pagePath }, target) => target.startsWith(LIKEC4_EXPORTS)
  ? join(docsRepo, 'astro', 'public', target)
  : resolve(dirname(pagePath), target)

const imagesOf = async ({ docsRepo, pagePath, text, diagrams }) => {
  const targets = imageTargets(text).filter((target) => !isRemoteTarget(target) && !isExportOfEmbeddedView(target, diagrams))
  return Promise.all(targets.map(async (target) => {
    const found = await findStat(stat, imageFileOf({ docsRepo, pagePath }, target))
    return { path: target, status: found?.isFile() === true ? 'present' : 'missing' }
  }))
}

const fencedMermaidBlockCount = (text) => text.split('\n').filter((line) => line.startsWith('```mermaid')).length

const needsBuild = (diagrams, buildKind) => diagrams.some(({ kind, status }) => kind === buildKind && status !== 'present')

const buildScriptsFor = (diagrams) =>
  [['mermaid', 'build:mmd'], ['likec4', 'build:diagrams']]
    .filter(([kind]) => needsBuild(diagrams, kind))
    .map(([, script]) => script)

/**
 * Resolves to what the page embeds and the builds its diagrams need. Each
 * distinct LikeC4 viewId, then each distinct MermaidDiagram diagramId, gives one
 * diagram whose export is generated/diagrams/<id>.png: missing when absent or
 * empty, stale when a .c4 or .mmd file, outside folders named node_modules,
 * generated and .git, is newer, else present. Each markdown image, read with
 * the publisher's own pattern so a title inside the brackets is part of the
 * target, gives one image unless the target starts with http:// or https://,
 * or is the /likec4-exports/ export of a LikeC4 view the page embeds. A
 * /likec4-exports/ target resolves under astro/public and any other against
 * the page's folder, and the image is present when that is a regular file.
 *
 * @param {{ docsRepo: string, pagePath: string, text: string }} options
 * @returns {Promise<{
 *   diagrams: { kind: 'likec4' | 'mermaid', id: string, png: string, status: 'present' | 'missing' | 'stale' }[],
 *   images: { path: string, status: 'present' | 'missing' }[],
 *   fencedMermaidBlocks: number,
 *   buildNeeded: string[],
 *   buildCommands: string[]
 * }>} buildNeeded lists build:mmd, then build:diagrams, for the kinds with an export not present
 */
export const inventoryAssets = async ({ docsRepo, pagePath, text }) => {
  const diagrams = await diagramsOf(docsRepo, text)
  const buildNeeded = buildScriptsFor(diagrams)
  return {
    diagrams,
    images: await imagesOf({ docsRepo, pagePath, text, diagrams }),
    fencedMermaidBlocks: fencedMermaidBlockCount(text),
    buildNeeded,
    buildCommands: buildNeeded.map((script) => `npm --prefix ~/trade-imports-arch-workspace/trade-imports-documentation run ${script}`)
  }
}
