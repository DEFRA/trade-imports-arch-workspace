import { mkdir, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, it, expect } from 'vitest'
import { createWorkspace } from '../../test-support/cli.js'
import { copyFixtureDocsRepo } from '../../test-support/docs-repo.js'
import { rejectionOf } from '../../test-support/http.js'
import { locateDocsRepo, publishEntryFor, readPublishConfig, resolvePage, spaceFor } from './docs-repo.js'

let workspace
let docsRepo
let configPath

beforeEach(async () => {
  workspace = await createWorkspace()
  await copyFixtureDocsRepo(workspace)
  docsRepo = await realpath(join(workspace, 'trade-imports-documentation'))
  configPath = join(docsRepo, 'scripts', 'confluence', 'confluence-config.json')
})

afterEach(async () => {
  await rm(workspace, { recursive: true, force: true })
})

const toolingEntry = () => join(docsRepo, 'node_modules', '@defra', 'delivery-info-arch-tooling')

const fixtureConfig = async () => JSON.parse(await readFile(configPath, 'utf8'))

const writeConfig = async (config) => {
  const path = join(workspace, 'config.json')
  await writeFile(path, typeof config === 'string' ? config : JSON.stringify(config))
  return path
}

describe('locateDocsRepo', () => {
  it('resolves to the real path of the docs repo copy and the publish config path inside the copy', async () => {
    expect(await locateDocsRepo(workspace)).toEqual({ docsRepo, configPath })
  })

  it('refuses a workspace without the docs repo with USAGE naming the folder and the clone command', async () => {
    await rm(docsRepo, { recursive: true })
    const error = await rejectionOf(locateDocsRepo(workspace))
    expect(error.code).toBe('USAGE')
    expect(error.message).toBe(`The docs repo is not at ${join(workspace, 'trade-imports-documentation')}. Clone it with make -C ~/trade-imports-arch-workspace clone, then run the command again.`)
  })

  it('refuses a docs repo without the tooling package with USAGE naming the repo and the install command', async () => {
    await rm(toolingEntry(), { recursive: true })
    const error = await rejectionOf(locateDocsRepo(workspace))
    expect(error.code).toBe('USAGE')
    expect(error.message).toBe(`The docs repo at ${docsRepo} is not installed: node_modules/@defra/delivery-info-arch-tooling is missing. Run npm --prefix ~/trade-imports-arch-workspace/trade-imports-documentation install, then run the command again.`)
  })

  it('refuses a tooling package linked to a folder that does not exist with USAGE naming the clone and the install commands', async () => {
    await rm(toolingEntry(), { recursive: true })
    await symlink(join(workspace, 'delivery-info-arch-tooling'), toolingEntry())
    const error = await rejectionOf(locateDocsRepo(workspace))
    expect(error.code).toBe('USAGE')
    expect(error.message).toBe(`The docs repo at ${docsRepo} links node_modules/@defra/delivery-info-arch-tooling to a folder that does not exist. Clone the tooling with make -C ~/trade-imports-arch-workspace clone and run npm --prefix ~/trade-imports-arch-workspace/trade-imports-documentation install, then run the command again.`)
  })

  it('rejects with the file system error, not as a missing folder, when the tooling package is a link that loops', async () => {
    await rm(toolingEntry(), { recursive: true })
    await symlink(toolingEntry(), toolingEntry())
    const error = await rejectionOf(locateDocsRepo(workspace))
    expect(error.code).toBe('ELOOP')
  })

  it('accepts a tooling package linked to a folder that exists', async () => {
    await rm(toolingEntry(), { recursive: true })
    await mkdir(join(workspace, 'delivery-info-arch-tooling'))
    await symlink(join(workspace, 'delivery-info-arch-tooling'), toolingEntry())
    expect(await locateDocsRepo(workspace)).toEqual({ docsRepo, configPath })
  })
})

describe('resolvePage', () => {
  const publishing = () => ({
    absolutePath: join(docsRepo, 'docs', 'systems', 'HEDY', 'Guide', 'publishing.md'),
    page: 'docs/systems/HEDY/Guide/publishing.md',
    relativeToDocs: 'systems/HEDY/Guide/publishing.md'
  })

  it.each([
    ['an absolute path', () => join(docsRepo, 'docs/systems/HEDY/Guide/publishing.md')],
    ['a path relative to the docs repo', () => 'docs/systems/HEDY/Guide/publishing.md'],
    ['a path relative to the docs folder', () => 'systems/HEDY/Guide/publishing.md']
  ])('resolves the publishing page given as %s to its real path, its docs page and its path under docs', async (_, given) => {
    expect(await resolvePage({ docsRepo, given: given(), cwd: workspace })).toEqual(publishing())
  })

  it('resolves a path given relative to cwd against cwd', async () => {
    const cwd = join(docsRepo, 'docs', 'systems', 'HEDY')
    expect(await resolvePage({ docsRepo, given: 'Guide/publishing.md', cwd })).toEqual(publishing())
  })

  it('refuses a page that exists nowhere with USAGE naming the three places tried', async () => {
    const error = await rejectionOf(resolvePage({ docsRepo, given: 'nowhere.md', cwd: workspace }))
    expect(error.code).toBe('USAGE')
    expect(error.message).toBe(`The page nowhere.md is not a file at ${join(workspace, 'nowhere.md')}, at ${join(docsRepo, 'nowhere.md')} or at ${join(docsRepo, 'docs', 'nowhere.md')}. Give the path of a page, absolute or relative to the current folder, the docs repo or the docs folder, then run the command again.`)
  })

  it('refuses a page whose name does not end in .md with USAGE naming the page', async () => {
    const error = await rejectionOf(resolvePage({ docsRepo, given: 'docs/systems/HEDY/Guide/diagrams/flow.svg', cwd: workspace }))
    expect(error.code).toBe('USAGE')
    expect(error.message).toBe(`The page ${join(docsRepo, 'docs/systems/HEDY/Guide/diagrams/flow.svg')} is not a markdown page because its name does not end in .md. Give a page whose name ends in .md, then run the command again.`)
  })

  it('refuses a link inside docs whose target is a page outside docs with USAGE naming the target and the docs folder', async () => {
    const outside = join(docsRepo, 'outside.md')
    await writeFile(outside, '# Outside\n')
    await symlink(outside, join(docsRepo, 'docs', 'linked.md'))
    const error = await rejectionOf(resolvePage({ docsRepo, given: 'docs/linked.md', cwd: workspace }))
    expect(error.code).toBe('USAGE')
    expect(error.message).toBe(`The page ${outside} is not under ${join(docsRepo, 'docs')}. Only pages under docs/ publish. Give a page under that folder, then run the command again.`)
  })
})

describe('readPublishConfig', () => {
  it('resolves to the parsed fixture config', async () => {
    expect(await readPublishConfig(configPath)).toEqual(await fixtureConfig())
  })

  it('refuses a missing config with USAGE naming the path', async () => {
    const path = join(workspace, 'missing.json')
    const error = await rejectionOf(readPublishConfig(path))
    expect(error.code).toBe('USAGE')
    expect(error.message).toBe(`The publish config is not at ${path}. Check the docs repo checkout, then run the command again.`)
  })

  it('refuses a config that is not JSON with PARSE naming the path, keeping the parse error as the cause', async () => {
    const path = await writeConfig('{not json')
    const error = await rejectionOf(readPublishConfig(path))
    expect(error.code).toBe('PARSE')
    expect(error.message).toBe(`The publish config at ${path} is not JSON. Fix the syntax in the file, then run the command again.`)
    expect(error.cause).toBeInstanceOf(SyntaxError)
  })

  it.each([
    ['spaceMapping is a string', { spaceMapping: 'HEDY' }, 'has no spaceMapping object. Add spaceMapping, an object from folder names to space keys'],
    ['spaceMapping is a list', { spaceMapping: [] }, 'has no spaceMapping object. Add spaceMapping, an object from folder names to space keys'],
    ['publishPaths is an object', { publishPaths: { path: 'notes/unlisted.md' } }, 'has no publishPaths list. Add publishPaths, the list of the pages to publish'],
    ['options.dryRun is true', { options: { dryRun: true } }, 'sets options.dryRun, so the publisher would publish nothing. Set options.dryRun to false']
  ])('refuses a config where %s with USAGE naming the path and the fix', async (_, change, fragment) => {
    const path = await writeConfig({ ...await fixtureConfig(), ...change })
    const error = await rejectionOf(readPublishConfig(path))
    expect(error.code).toBe('USAGE')
    expect(error.message).toBe(`The publish config at ${path} ${fragment}, then run the command again.`)
  })
})

describe('publishEntryFor', () => {
  it.each([
    ['the glob entry for a guide page', 'systems/HEDY/Guide/publishing.md', 'systems/HEDY/Guide/*.md'],
    ['the literal entry for the components page', 'systems/HEDY/components.md', 'systems/HEDY/components.md']
  ])('returns %s', async (_, relativeToDocs, path) => {
    expect(publishEntryFor(await fixtureConfig(), relativeToDocs)?.path).toBe(path)
  })

  it.each([
    ['a guide page the glob entry excludes by file name', 'systems/HEDY/Guide/editorial-profile.md'],
    ['a page no entry lists', 'notes/unlisted.md'],
    ['a page in a subfolder that a single-star glob does not reach', 'systems/HEDY/Guide/diagrams/deep.md']
  ])('returns no entry for %s', async (_, relativeToDocs) => {
    expect(publishEntryFor(await fixtureConfig(), relativeToDocs)).toBeUndefined()
  })

  it.each([
    ['a literal path', 'notes/unlisted.md'],
    ['a glob', 'notes/*.md']
  ])('returns no entry for a page listed only by a diagram entry with %s', (_, path) => {
    const config = { publishPaths: [{ path, type: 'diagram' }] }
    expect(publishEntryFor(config, 'notes/unlisted.md')).toBeUndefined()
  })

  it('applies exclude patterns to the path under docs, with star as any text and question mark as one character', () => {
    const config = { publishPaths: [{ path: 'notes/**/*.md', exclude: ['notes/draft-?/*'] }] }
    expect(publishEntryFor(config, 'notes/draft-1/plan.md')).toBeUndefined()
    expect(publishEntryFor(config, 'notes/draft-10/plan.md')).toEqual(config.publishPaths[0])
  })

  it('ignores the exclude list of a literal entry', () => {
    const config = { publishPaths: [{ path: 'notes/unlisted.md', exclude: ['unlisted.md'] }] }
    expect(publishEntryFor(config, 'notes/unlisted.md')).toEqual(config.publishPaths[0])
  })

  it('skips an entry without a path and returns the first later entry that lists the page', () => {
    const config = { publishPaths: [{ type: 'markdown' }, { path: 'notes/*.md' }, { path: 'notes/unlisted.md' }] }
    expect(publishEntryFor(config, 'notes/unlisted.md')).toEqual({ path: 'notes/*.md' })
  })
})

describe('spaceFor', () => {
  it.each([
    ['a page under a mapped system folder', 'systems/HEDY/Guide/publishing.md', { HEDY: 'HEDYDOCS' }, 'HEDYDOCS'],
    ['a page under Trade, from the Trade mapping', 'Trade/overview.md', { Trade: 'TRADEDOCS' }, 'TRADEDOCS'],
    ['a page under trade, from the Trade mapping', 'trade/overview.md', { Trade: 'TRADEDOCS' }, 'TRADEDOCS'],
    ['a page under Trade, from the trade mapping before the Trade mapping', 'Trade/overview.md', { trade: 'LOWER', Trade: 'UPPER' }, 'LOWER']
  ])('gives the space for %s', (_, relativeToDocs, spaceMapping, space) => {
    expect(spaceFor({ spaceMapping }, relativeToDocs, configPath)).toBe(space)
  })

  it('gives the fixture spaces for the publishing page and the trade overview', async () => {
    const config = await fixtureConfig()
    expect([spaceFor(config, 'systems/HEDY/Guide/publishing.md', configPath), spaceFor(config, 'Trade/overview.md', configPath)]).toEqual(['HEDYDOCS', 'TRADEDOCS'])
  })

  it.each([
    ['a page outside systems and Trade', 'notes/unlisted.md'],
    ['a page under an unmapped system folder', 'systems/OTHER/page.md']
  ])('refuses %s with USAGE naming the page and the config', async (_, relativeToDocs) => {
    const error = await rejectionOf((async () => spaceFor(await fixtureConfig(), relativeToDocs, configPath))())
    expect(error.code).toBe('USAGE')
    expect(error.message).toBe(`No spaceMapping entry gives a space for ${relativeToDocs}. Add the entry to ${configPath}, then run the command again.`)
  })

  it('names the publish config in words when no config path is given', async () => {
    const error = await rejectionOf((async () => spaceFor({ spaceMapping: {} }, 'notes/unlisted.md'))())
    expect(error.message).toBe('No spaceMapping entry gives a space for notes/unlisted.md. Add the entry to the publish config, then run the command again.')
  })
})
