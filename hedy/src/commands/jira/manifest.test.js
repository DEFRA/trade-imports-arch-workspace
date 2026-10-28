import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, it, expect } from 'vitest'
import { readJsonFixture, rejectionOf } from '../../test-support/http.js'
import { MANIFEST_SCHEMA, loadManifest, manifestSchema } from './manifest.js'

const fixtureUrl = new URL('./__fixtures__/ticket.json', import.meta.url)
const fixtureManifest = await readJsonFixture(fixtureUrl)

const manifestWithout = (...keys) => Object.fromEntries(Object.entries(fixtureManifest).filter(([key]) => !keys.includes(key)))

let folder

beforeEach(async () => {
  folder = await mkdtemp(join(tmpdir(), 'hedy-manifest-'))
})

afterEach(async () => {
  await rm(folder, { recursive: true, force: true })
})

const writeManifestText = async (text) => {
  const path = join(folder, 'ticket.json')
  await writeFile(path, text)
  return path
}

describe('manifestSchema', () => {
  it('accepts the fixture manifest, whose schema is hedy-ticket/1, and returns it unchanged', () => {
    expect(fixtureManifest.schema).toBe(MANIFEST_SCHEMA)
    expect(MANIFEST_SCHEMA).toBe('hedy-ticket/1')
    expect(manifestSchema.parse(fixtureManifest)).toEqual(fixtureManifest)
  })

  it('defaults labels to an empty list when the manifest has none', () => {
    expect(manifestSchema.parse(manifestWithout('labels')).labels).toEqual([])
  })

  it('accepts a manifest without priority or parent and leaves both out', () => {
    expect(manifestSchema.parse(manifestWithout('priority', 'parent'))).toEqual(manifestWithout('priority', 'parent'))
  })

  it('trims the spaces around project and summary', () => {
    const parsed = manifestSchema.parse({ ...fixtureManifest, project: '  HEDY ', summary: ' Raise issues  ' })
    expect([parsed.project, parsed.summary]).toEqual(['HEDY', 'Raise issues'])
  })

  it('accepts a summary of exactly 255 characters', () => {
    expect(manifestSchema.parse({ ...fixtureManifest, summary: 'x'.repeat(255) }).summary).toHaveLength(255)
  })
})

describe('loadManifest', () => {
  it('resolves to the parsed manifest and the folder that holds the manifest for a copy of the fixture', async () => {
    const path = join(folder, 'ticket.json')
    await copyFile(fixtureUrl, path)
    expect(await loadManifest(path)).toEqual({ manifest: fixtureManifest, folder })
  })

  it.each([
    ['a schema value other than hedy-ticket/1', { schema: 'hedy-ticket/2' }, 'schema must be "hedy-ticket/1"'],
    ['a blank project', { project: '  ' }, 'project must be a Jira project key'],
    ['a type outside Bug, Story, Task and Epic', { type: 'Subtask' }, 'type must be one of Bug, Story, Task or Epic'],
    ['a summary of 256 characters', { summary: 'x'.repeat(256) }, 'summary is 256 characters, over the limit of 255'],
    ['a blank summary', { summary: '   ' }, 'summary is blank'],
    ['a missing descriptionFile', { descriptionFile: undefined }, 'descriptionFile must be the path of the description file'],
    ['a priority outside Lowest, Low, Medium, High and Highest', { priority: 'Urgent' }, 'priority must be one of Lowest, Low, Medium, High or Highest'],
    ['a parent that is not an issue key', { parent: 'HEDY_100' }, 'parent HEDY_100 is not a Jira issue key such as ABC-123'],
    ['labels that are not a list', { labels: 'hedy' }, 'labels must be a list of label names'],
    ['an empty label', { labels: ['hedy', ''] }, 'labels must be a list of label names'],
    ['an unknown key', { assignee: 'someone' }, 'The manifest holds keys that are not manifest fields: assignee.']
  ])('refuses %s with USAGE naming the path and the field', async (_label, change, fragment) => {
    const path = await writeManifestText(JSON.stringify({ ...fixtureManifest, ...change }))
    const error = await rejectionOf(loadManifest(path))
    expect(error.code).toBe('USAGE')
    expect(error.message).toContain(`The manifest at ${path} is not valid.`)
    expect(error.message).toContain(fragment)
    expect(error.message).toContain('then run the command again')
  })

  it('lists the known fields when it refuses an unknown key', async () => {
    const path = await writeManifestText(JSON.stringify({ ...fixtureManifest, assignee: 'someone' }))
    const error = await rejectionOf(loadManifest(path))
    expect(error.message).toContain('The fields are schema, project, type, summary, descriptionFile, priority, parent and labels.')
  })

  it('refuses JSON that is not an object with USAGE naming the path', async () => {
    const path = await writeManifestText('["hedy"]')
    const error = await rejectionOf(loadManifest(path))
    expect(error.code).toBe('USAGE')
    expect(error.message).toContain(`The manifest at ${path} is not valid.`)
    expect(error.message).toContain('The manifest must be one JSON object')
  })

  it('refuses a missing file with USAGE naming the path and the --from option', async () => {
    const path = join(folder, 'missing.json')
    const error = await rejectionOf(loadManifest(path))
    expect(error.code).toBe('USAGE')
    expect(error.message).toBe(`No ticket manifest is at ${path}. Give --from the path of a ticket manifest, then run the command again.`)
  })

  it('refuses a file that is not JSON with USAGE naming the path', async () => {
    const path = await writeManifestText('schema: hedy-ticket/1')
    const error = await rejectionOf(loadManifest(path))
    expect(error.code).toBe('USAGE')
    expect(error.message).toBe(`The manifest at ${path} is not JSON. Fix the file so that it parses as JSON, then run the command again.`)
  })

  it('refuses a path it cannot read as a file with UNKNOWN naming the path', async () => {
    const path = join(folder, 'ticket.json')
    await mkdir(path)
    const error = await rejectionOf(loadManifest(path))
    expect(error.code).toBe('UNKNOWN')
    expect(error.message).toBe(`The manifest at ${path} could not be read. Check that the path is a regular file with read permission, then run the command again.`)
  })
})
