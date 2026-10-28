import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { z } from 'zod'
import { HedyError } from '../../errors.js'

export const MAX_DESCRIPTION_LENGTH = 32767

/**
 * Returns the Jira create payload's fields for a validated manifest. priority
 * and parent appear only when the manifest sets them, and labels is a copy.
 */
export const buildFields = (manifest, description) => ({
  project: { key: manifest.project },
  summary: manifest.summary,
  description,
  issuetype: { name: manifest.type },
  labels: [...manifest.labels],
  ...(manifest.priority ? { priority: { name: manifest.priority } } : {}),
  ...(manifest.parent ? { parent: { key: manifest.parent } } : {})
})

/**
 * @param {string} description
 * @returns {string[]} one warning when the description is longer than MAX_DESCRIPTION_LENGTH, else none
 */
export const findWarnings = (description) => description.length > MAX_DESCRIPTION_LENGTH
  ? [`The description is ${description.length.toLocaleString('en-GB')} characters, over Jira's limit of ${MAX_DESCRIPTION_LENGTH.toLocaleString('en-GB')}. Shorten the description file, then run the command again.`]
  : []

/**
 * Returns the SHA-256 hex digest of the plan's content: project, type,
 * summary, description, priority, parent and labels, as JSON with sorted
 * keys. The labels' order does not change the id, an absent priority or
 * parent counts as null, and every other key the argument holds is ignored.
 */
export const planIdOf = ({ project, type, summary, description, priority, parent, labels }) => {
  const content = { project, type, summary, description, priority: priority ?? null, parent: parent ?? null, labels: labels.toSorted() }
  const canonicalJson = JSON.stringify(content, Object.keys(content).sort())
  return createHash('sha256').update(canonicalJson).digest('hex')
}

/**
 * Validates a --confirm value: 64 lowercase hex characters, the form of
 * every plan id a dry run prints.
 */
export const planIdSchema = z.string().regex(/^[0-9a-f]{64}$/, {
  error: ({ input }) => `The plan id ${input} is not one a dry run printed. Run the dry run, then confirm the 64-character plan id it prints.`
})

/**
 * Throws USAGE when the plan id a caller confirmed is not the plan id of the
 * plan as it stands now.
 */
export const refuseStalePlan = (confirmedPlanId, planId) => {
  if (confirmedPlanId === planId) return
  throw new HedyError('USAGE', 'The plan has changed since the dry run. Run the dry run again, then confirm the new plan id.')
}

const readDescriptionText = async (path) => {
  try {
    return await readFile(path, 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new HedyError(
        'USAGE',
        `No description file is at ${path}. Write the description into that file, or give the path of the file that holds the description, then run the command again.`,
        { cause: error }
      )
    }
    throw new HedyError(
      'UNKNOWN',
      `The description file at ${path} could not be read. Check that the path is a regular file with read permission, then run the command again.`,
      { cause: error }
    )
  }
}

const withoutTrailingNewlines = (text) => text.replace(/\n+$/, '')

const refuseBlankDescription = (description, path) => {
  if (/\S/.test(description)) return
  throw new HedyError('USAGE', `The description file at ${path} is blank. Write the description into the file, then run the command again.`)
}

/**
 * Resolves to the text of the description file at path without its trailing
 * newlines. Rejects with USAGE naming the path when the file is missing or
 * blank, and with UNKNOWN naming the path for any other read error.
 *
 * @param {string} path
 * @returns {Promise<string>}
 */
export const readDescription = async (path) => {
  const description = withoutTrailingNewlines(await readDescriptionText(path))
  refuseBlankDescription(description, path)
  return description
}

/**
 * Resolves to the create plan for a validated manifest. The description is
 * read with readDescription from descriptionFile, relative to folder.
 * priority and parent are null when the manifest leaves them out.
 *
 * @param {{ manifest: z.infer<typeof import('./manifest.js').manifestSchema>, folder: string }} options
 */
export const buildCreatePlan = async ({ manifest, folder }) => {
  const description = await readDescription(resolve(folder, manifest.descriptionFile))
  const content = {
    project: manifest.project,
    type: manifest.type,
    summary: manifest.summary,
    priority: manifest.priority ?? null,
    parent: manifest.parent ?? null,
    labels: [...manifest.labels],
    description
  }
  return { planId: planIdOf(content), ...content, warnings: findWarnings(description), fields: buildFields(manifest, description) }
}

const valueLines = (value) => {
  const lines = Array.isArray(value) ? value : [value]
  return lines.length === 0 || !lines[0] ? ['none'] : lines
}

/**
 * Returns a dry run's text: one line per row, the values aligned two columns
 * after the longest label, then a blank line, the description, a blank line
 * and nextStep. A row's value is text, null, or a list with one line per
 * item. A null value, empty text or an empty list prints as none.
 *
 * @param {{ rows: [string, string | null | string[]][], description: string, nextStep: string }} options
 */
export const renderPlan = ({ rows, description, nextStep }) => {
  const width = Math.max(...rows.map(([label]) => label.length)) + 2
  const fieldLines = rows.flatMap(([label, value]) =>
    valueLines(value).map((line, index) => `${(index === 0 ? `${label}:` : '').padEnd(width)}${line}`))
  return [...fieldLines, '', description, '', nextStep].join('\n')
}

/**
 * Returns the two lines a confirmed write prints: the key, then Created,
 * Updated or Unchanged for mode created, updated or unchanged, and the URL.
 *
 * @param {{ mode: 'created' | 'updated' | 'unchanged', key: string, url: string }} outcome
 */
export const renderWriteOutcome = ({ mode, key, url }) => {
  const outcomeWords = { created: 'Created', updated: 'Updated', unchanged: 'Unchanged' }
  return `${key}\n${outcomeWords[mode]}: ${url}`
}
