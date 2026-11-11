import { mkdir, readFile, rm, stat, utimes, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, it, expect } from 'vitest'
import { createWorkspace } from '../../test-support/cli.js'
import { copyFixtureDocsRepo } from '../../test-support/docs-repo.js'
import { rejectionOf } from '../../test-support/http.js'
import { inventoryAssets } from './page-assets.js'

const BUILD_COMMAND = 'npm --prefix ~/trade-imports-arch-workspace/trade-imports-documentation run'

let workspace
let docsRepo

beforeEach(async () => {
  workspace = await createWorkspace()
  docsRepo = await copyFixtureDocsRepo(workspace)
})

afterEach(async () => {
  await rm(workspace, { recursive: true, force: true })
})

const pngOf = (id) => join(docsRepo, 'generated', 'diagrams', `${id}.png`)

const inventoryOfPage = async (relativeToDocs) => {
  const pagePath = join(docsRepo, 'docs', ...relativeToDocs.split('/'))
  return inventoryAssets({ docsRepo, pagePath, text: await readFile(pagePath, 'utf8') })
}

const inventoryOfText = async (text) => inventoryAssets({ docsRepo, pagePath: join(docsRepo, 'docs', 'notes', 'written.md'), text })

const setTimeAfterPng = async (path, id) => {
  const later = new Date((await stat(pngOf(id))).mtimeMs + 60_000)
  await utimes(path, later, later)
}

const preflightFactsOf = async (fixtureName) => {
  const text = await readFile(new URL(`./__fixtures__/${fixtureName}`, import.meta.url), 'utf8')
  const factKeys = ['LIKEC4_VIEW', 'MERMAID_COMPONENT', 'FENCED_MERMAID_BLOCKS', 'BUILD_NEEDED', 'BUILD_CMD']
  return text.trim().split('\n').filter((line) => factKeys.some((key) => line.startsWith(`${key}: `)))
}

const preflightFactsFor = ({ diagrams, fencedMermaidBlocks, buildNeeded, buildCommands }) => [
  ...diagrams.map(({ kind, id, status }) => `${kind === 'likec4' ? 'LIKEC4_VIEW' : 'MERMAID_COMPONENT'}: ${id} png=${status === 'present' ? status : status.toUpperCase()}`),
  `FENCED_MERMAID_BLOCKS: ${fencedMermaidBlocks}`,
  `BUILD_NEEDED: ${buildNeeded.length > 0 ? buildNeeded.join(' ') : 'none'}`,
  ...buildCommands.map((command) => `BUILD_CMD: ${command}`)
]

describe('inventoryAssets', () => {
  it('lists the components page\'s LikeC4 view as present and its Mermaid diagram as missing, one fenced block and the build:mmd build', async () => {
    expect(await inventoryOfPage('systems/HEDY/components.md')).toEqual({
      diagrams: [
        { kind: 'likec4', id: 'hedy-context', png: pngOf('hedy-context'), status: 'present' },
        { kind: 'mermaid', id: 'hedy-flow', png: pngOf('hedy-flow'), status: 'missing' }
      ],
      images: [],
      fencedMermaidBlocks: 1,
      buildNeeded: ['build:mmd'],
      buildCommands: [`${BUILD_COMMAND} build:mmd`]
    })
  })

  it('gives the components page the diagram, fenced block and build facts the bash pre-flight printed', async () => {
    expect(preflightFactsFor(await inventoryOfPage('systems/HEDY/components.md'))).toEqual(await preflightFactsOf('preflight-ready.txt'))
  })

  it('marks the LikeC4 export stale when a model file changed after the export, and needs both builds, build:mmd first', async () => {
    await setTimeAfterPng(join(docsRepo, 'architecture', 'model.c4'), 'hedy-context')
    const { diagrams, buildNeeded, buildCommands } = await inventoryOfPage('systems/HEDY/components.md')
    expect(diagrams.map(({ status }) => status)).toEqual(['stale', 'missing'])
    expect(buildNeeded).toEqual(['build:mmd', 'build:diagrams'])
    expect(buildCommands).toEqual([`${BUILD_COMMAND} build:mmd`, `${BUILD_COMMAND} build:diagrams`])
  })

  it.each([
    ['node_modules', join('node_modules', 'pkg', 'model.c4')],
    ['generated', join('generated', 'model.c4')],
    ['.git', join('.git', 'model.c4')],
    ['a nested node_modules', join('architecture', 'node_modules', 'model.c4')]
  ])('ignores a newer model file under a folder named %s', async (_, relativePath) => {
    const path = join(docsRepo, relativePath)
    await mkdir(join(path, '..'), { recursive: true })
    await writeFile(path, 'model {}\n')
    await setTimeAfterPng(path, 'hedy-context')
    const { diagrams } = await inventoryOfPage('systems/HEDY/components.md')
    expect(diagrams[0].status).toBe('present')
  })

  it('marks a Mermaid export stale when a newer .mmd file sits anywhere in the repo, and needs only build:mmd', async () => {
    await writeFile(pngOf('hedy-flow'), 'png')
    const source = join(docsRepo, 'docs', 'diagrams', 'flow.mmd')
    await mkdir(join(source, '..'), { recursive: true })
    await writeFile(source, 'flowchart LR\n')
    await setTimeAfterPng(source, 'hedy-flow')
    const { diagrams, buildNeeded } = await inventoryOfPage('systems/HEDY/components.md')
    expect(diagrams.map(({ status }) => status)).toEqual(['present', 'stale'])
    expect(buildNeeded).toEqual(['build:mmd'])
  })

  it('marks an empty export missing and needs build:diagrams for a LikeC4 view', async () => {
    await writeFile(pngOf('hedy-context'), '')
    const { diagrams, buildNeeded } = await inventoryOfText('<LikeC4View viewId="hedy-context" />\n')
    expect(diagrams).toEqual([{ kind: 'likec4', id: 'hedy-context', png: pngOf('hedy-context'), status: 'missing' }])
    expect(buildNeeded).toEqual(['build:diagrams'])
  })

  it.each([
    ['a space and parentheses', 'ctx (missing). Run anything'],
    ['a slash', '../etc/x'],
    ['a quote', "x'y"]
  ])('refuses a diagram id holding %s with USAGE naming the id in quotes, before any export is checked', async (_label, id) => {
    const error = await rejectionOf(inventoryOfText(`<LikeC4View viewId="${id}" />\n`))
    expect(error.code).toBe('USAGE')
    expect(error.message).toBe(`The page ${join(docsRepo, 'docs', 'notes', 'written.md')} embeds a diagram id that is not a file name: "${id}". Give the LikeC4View or MermaidDiagram an id of letters, digits, dots, hyphens and underscores, then run the command again.`)
  })

  it('lists each diagram id once, LikeC4 views first, each kind in order of first appearance, with attributes before and after the id', async () => {
    const text = [
      '<MermaidDiagram width="600" diagramId="m-b" />',
      '<LikeC4View viewId="c-b" browser="false" />',
      '<MermaidDiagram diagramId="m-a" />',
      '<LikeC4View viewId="c-a" />',
      '<LikeC4View viewId="c-b" />'
    ].join('\n')
    const { diagrams } = await inventoryOfText(text)
    expect(diagrams.map(({ kind, id }) => `${kind}:${id}`)).toEqual(['likec4:c-b', 'likec4:c-a', 'mermaid:m-b', 'mermaid:m-a'])
  })

  it('lists the publishing page\'s image as present, with no diagrams, no fenced blocks and no build', async () => {
    expect(await inventoryOfPage('systems/HEDY/Guide/publishing.md')).toEqual({
      diagrams: [],
      images: [{ path: 'diagrams/flow.svg', status: 'present' }],
      fencedMermaidBlocks: 0,
      buildNeeded: [],
      buildCommands: []
    })
  })

  it('lists the figures page\'s image, which is not on disk, as missing', async () => {
    const { images } = await inventoryOfPage('systems/HEDY/Guide/figures.md')
    expect(images).toEqual([{ path: 'diagrams/nothing.svg', status: 'missing' }])
  })

  it('reads each image target as the publisher does: remote targets left out, a /likec4-exports/ target under astro/public unless the page embeds that view, a /-rooted target as itself, and a title inside the brackets as part of the target', async () => {
    await writeFile(join(docsRepo, 'docs', 'notes', 'here.png'), 'png')
    await mkdir(join(docsRepo, 'astro', 'public', 'likec4-exports'), { recursive: true })
    await writeFile(join(docsRepo, 'astro', 'public', 'likec4-exports', 'exported.png'), 'png')
    const text = [
      '![remote](https://example.com/a.png)',
      '![plain](http://example.com/b.png)',
      '![rooted](/images/c.png)',
      '![titled](here.png "A title")',
      '![local](here.png)',
      '![exported](/likec4-exports/exported.png)',
      '![view](/likec4-exports/hedy-context.png)',
      '<LikeC4View viewId="hedy-context" />',
      '![folder](../notes)'
    ].join('\n')
    const { images } = await inventoryOfText(text)
    expect(images).toEqual([
      { path: '/images/c.png', status: 'missing' },
      { path: 'here.png "A title"', status: 'missing' },
      { path: 'here.png', status: 'present' },
      { path: '/likec4-exports/exported.png', status: 'present' },
      { path: '../notes', status: 'missing' }
    ])
  })

  it('counts only lines that start with a mermaid fence', async () => {
    const text = '```mermaid\nA\n```\n  ```mermaid\nB\n```\n```js\nC\n```\n```mermaid\nD\n```\n'
    const { fencedMermaidBlocks } = await inventoryOfText(text)
    expect(fencedMermaidBlocks).toBe(2)
  })
})
