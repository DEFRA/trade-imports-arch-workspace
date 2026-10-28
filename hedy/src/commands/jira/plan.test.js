import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, it, expect } from 'vitest'
import { readJsonFixture, rejectionOf } from '../../test-support/http.js'
import { manifestSchema } from './manifest.js'
import { MAX_DESCRIPTION_LENGTH, buildCreatePlan, buildFields, findWarnings, planIdOf } from './plan.js'

const fixturesUrl = new URL('./__fixtures__/', import.meta.url)
const fixtureManifest = manifestSchema.parse(await readJsonFixture(new URL('ticket.json', fixturesUrl)))
const { fields: sentFields } = await readJsonFixture(new URL('create-request.json', fixturesUrl))

const { priority: _priority, parent: _parent, ...manifestWithoutPriorityOrParent } = fixtureManifest

let folder

beforeEach(async () => {
  folder = await mkdtemp(join(tmpdir(), 'hedy-plan-'))
})

afterEach(async () => {
  await rm(folder, { recursive: true, force: true })
})

const writeDescription = (text) => writeFile(join(folder, fixtureManifest.descriptionFile), text)

describe('buildCreatePlan', () => {
  it('returns the fields of the captured create request for the fixture manifest and description', async () => {
    await copyFile(new URL(fixtureManifest.descriptionFile, fixturesUrl), join(folder, fixtureManifest.descriptionFile))
    const plan = await buildCreatePlan({ manifest: fixtureManifest, folder })
    expect(plan.fields).toEqual(sentFields)
  })

  it('returns the plan content, no warnings, the fields and the plan id of that content', async () => {
    await writeDescription('h3. Why\n\nA reason.\n')
    const plan = await buildCreatePlan({ manifest: fixtureManifest, folder })
    expect(plan).toEqual({
      planId: planIdOf(plan),
      project: 'HEDY',
      type: 'Task',
      summary: 'Raise Jira issues from a manifest with a dry run',
      priority: 'Medium',
      parent: 'HEDY-100',
      labels: ['hedy', 'fixtures'],
      description: 'h3. Why\n\nA reason.',
      warnings: [],
      fields: buildFields(fixtureManifest, 'h3. Why\n\nA reason.')
    })
    expect(plan.planId).toMatch(/^[0-9a-f]{64}$/)
  })

  it('gives null priority and parent, and fields without either, when the manifest has neither', async () => {
    await writeDescription('A reason.')
    const plan = await buildCreatePlan({ manifest: manifestWithoutPriorityOrParent, folder })
    expect([plan.priority, plan.parent]).toEqual([null, null])
    expect(Object.keys(plan.fields)).toEqual(['project', 'summary', 'description', 'issuetype', 'labels'])
  })

  it('strips every trailing newline from the description and keeps the inner blank lines', async () => {
    await writeDescription('line one\n\nline two\n\n\n')
    const plan = await buildCreatePlan({ manifest: fixtureManifest, folder })
    expect(plan.description).toBe('line one\n\nline two')
    expect(plan.fields.description).toBe('line one\n\nline two')
  })

  it('carries the warning for a description over the limit', async () => {
    await writeDescription('x'.repeat(MAX_DESCRIPTION_LENGTH + 1))
    const plan = await buildCreatePlan({ manifest: fixtureManifest, folder })
    expect(plan.warnings).toEqual(findWarnings(plan.description))
    expect(plan.warnings).toHaveLength(1)
  })

  it('refuses a missing description file with USAGE naming the path', async () => {
    const error = await rejectionOf(buildCreatePlan({ manifest: fixtureManifest, folder }))
    const path = join(folder, fixtureManifest.descriptionFile)
    expect(error.code).toBe('USAGE')
    expect(error.message).toBe(`No description file is at ${path}. Write the description into that file, or set descriptionFile to its path relative to the manifest, then run the command again.`)
  })

  it.each([
    ['empty', ''],
    ['only newlines', '\n\n'],
    ['only spaces and newlines', '  \n \n']
  ])('refuses a description file that is %s with USAGE naming the path', async (_label, text) => {
    await writeDescription(text)
    const error = await rejectionOf(buildCreatePlan({ manifest: fixtureManifest, folder }))
    const path = join(folder, fixtureManifest.descriptionFile)
    expect(error.code).toBe('USAGE')
    expect(error.message).toBe(`The description file at ${path} is blank. Write the description into the file, then run the command again.`)
  })

  it('refuses a description path it cannot read as a file with UNKNOWN naming the path', async () => {
    const path = join(folder, fixtureManifest.descriptionFile)
    await mkdir(path)
    const error = await rejectionOf(buildCreatePlan({ manifest: fixtureManifest, folder }))
    expect(error.code).toBe('UNKNOWN')
    expect(error.message).toBe(`The description file at ${path} could not be read. Check that the path is a regular file with read permission, then run the command again.`)
  })
})

describe('buildFields', () => {
  it('leaves out priority and parent when the manifest has neither', () => {
    expect(buildFields(manifestWithoutPriorityOrParent, 'A reason.')).toEqual({
      project: { key: 'HEDY' },
      summary: fixtureManifest.summary,
      description: 'A reason.',
      issuetype: { name: 'Task' },
      labels: ['hedy', 'fixtures']
    })
  })

  it('returns a copy of the labels, so changing the fields leaves the manifest unchanged', () => {
    const fields = buildFields(fixtureManifest, 'A reason.')
    fields.labels.push('extra')
    expect(fixtureManifest.labels).toEqual(['hedy', 'fixtures'])
  })
})

describe('planIdOf', () => {
  const content = {
    project: 'HEDY',
    type: 'Task',
    summary: 'Raise issues',
    description: 'A reason.',
    priority: 'Medium',
    parent: 'HEDY-100',
    labels: ['hedy', 'fixtures']
  }

  it('gives 64 hex characters, the same for the same content', () => {
    expect(planIdOf(content)).toMatch(/^[0-9a-f]{64}$/)
    expect(planIdOf({ ...content })).toBe(planIdOf(content))
  })

  it('gives the same id when the labels are reordered', () => {
    expect(planIdOf({ ...content, labels: ['fixtures', 'hedy'] })).toBe(planIdOf(content))
  })

  it('gives the same id for an absent priority and parent as for null ones', () => {
    const { priority: _absentPriority, parent: _absentParent, ...withoutPriorityOrParent } = content
    expect(planIdOf(withoutPriorityOrParent)).toBe(planIdOf({ ...content, priority: null, parent: null }))
  })

  it('ignores the plan id, warnings and fields a plan also holds', () => {
    expect(planIdOf({ ...content, planId: 'x', warnings: ['y'], fields: {} })).toBe(planIdOf(content))
  })

  it.each([
    ['project', { project: 'OTHER' }],
    ['type', { type: 'Bug' }],
    ['summary', { summary: 'Raise issues now' }],
    ['description', { description: 'Another reason.' }],
    ['priority', { priority: 'High' }],
    ['parent', { parent: 'HEDY-200' }],
    ['labels', { labels: ['hedy'] }]
  ])('gives a different id when the %s changes', (_field, change) => {
    expect(planIdOf({ ...content, ...change })).not.toBe(planIdOf(content))
  })
})

describe('findWarnings', () => {
  it('sets the limit at 32767 characters', () => {
    expect(MAX_DESCRIPTION_LENGTH).toBe(32767)
  })

  it.each([
    ['empty', ''],
    ['exactly at the limit', 'x'.repeat(32767)]
  ])('returns no warning for a description that is %s', (_label, description) => {
    expect(findWarnings(description)).toEqual([])
  })

  it('returns one warning naming the length and the limit for a description over the limit', () => {
    expect(findWarnings('x'.repeat(32768))).toEqual([
      'The description is 32,768 characters, over Jira\'s limit of 32,767. Shorten the description file, then run the command again.'
    ])
  })
})
