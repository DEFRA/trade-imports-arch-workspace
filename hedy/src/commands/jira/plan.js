import { createHash } from 'node:crypto'
import { realpath } from 'node:fs/promises'
import { resolve } from 'node:path'
import { z } from 'zod'
import { HedyError } from '../../errors.js'
import { pathInside, readTextFile } from './files.js'

export const MAX_DESCRIPTION_LENGTH = 32767

/**
 * Returns the Jira create payload's fields for a create plan's content.
 * priority and parent appear only when the content sets them, and labels
 * is a copy.
 *
 * @param {{ project: string, type: string, summary: string, description: string, priority: string | null, parent: string | null, labels: string[] }} content
 */
export const buildFields = ({ project, type, summary, description, priority, parent, labels }) => ({
  project: { key: project },
  summary,
  description,
  issuetype: { name: type },
  labels: [...labels],
  ...(priority ? { priority: { name: priority } } : {}),
  ...(parent ? { parent: { key: parent } } : {})
})

/**
 * @param {string} description
 * @returns {string[]} one warning when the description is longer than MAX_DESCRIPTION_LENGTH, else none
 */
export const findWarnings = (description) => description.length > MAX_DESCRIPTION_LENGTH
  ? [`The description is ${description.length.toLocaleString('en-GB')} characters, over Jira's limit of ${MAX_DESCRIPTION_LENGTH.toLocaleString('en-GB')}. Shorten the description file before confirming.`]
  : []

/**
 * Returns the SHA-256 hex digest of the content as JSON with its keys
 * sorted, so the order of the keys does not change the id. The content's
 * values are text, null or lists of text.
 *
 * @param {Record<string, string | null | string[]>} content
 */
export const planIdOf = (content) =>
  createHash('sha256').update(JSON.stringify(content, Object.keys(content).sort())).digest('hex')

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

const refuseMissingDescription = (path, error) => {
  throw new HedyError(
    'USAGE',
    `No description file is at ${path}. Write the description into that file, or give the path of the file that holds the description, then run the command again.`,
    { cause: error }
  )
}

const withLfLineEndings = (text) => text.replace(/\r\n?/g, '\n')

const withoutTrailingNewlines = (text) => text.replace(/\n+$/, '')

const refuseBlankDescription = (description, path) => {
  if (/\S/.test(description)) return
  throw new HedyError('USAGE', `The description file at ${path} is blank. Write the description into the file, then run the command again.`)
}

/**
 * Resolves to the text of the description file at path with LF line endings
 * and without its trailing newlines. Rejects with USAGE naming the path when
 * the file is missing or blank, and with UNKNOWN naming the path for any
 * other read error.
 *
 * @param {string} path
 * @returns {Promise<string>}
 */
export const readDescription = async (path) => {
  const text = await readTextFile(path, { kind: 'description file', missing: (error) => refuseMissingDescription(path, error) })
  const description = withoutTrailingNewlines(withLfLineEndings(text))
  refuseBlankDescription(description, path)
  return description
}

const realPathOf = (path) => realpath(path).catch((error) => {
  if (['ENOENT', 'ENOTDIR', 'ELOOP'].includes(error.code)) return undefined
  throw error
})

const refuseDescriptionOutsideFolder = async ({ path, folder }) => {
  const realPath = await realPathOf(path)
  if (realPath === undefined || pathInside(await realpath(folder), realPath) !== undefined) return
  throw new HedyError(
    'USAGE',
    `The description file ${path} is a link to ${realPath}, outside the manifest's folder ${folder}. Put the description file inside that folder, then run the command again.`
  )
}

/**
 * Resolves to the create plan for a validated manifest. The description is
 * read with readDescription from descriptionFile, relative to folder.
 * Rejects with USAGE naming both paths and the folder when the description
 * file's real path lies outside the folder's real path. priority and parent
 * are null when the manifest leaves them out, and the plan id does not
 * depend on the order of the labels.
 *
 * @param {{ manifest: z.infer<typeof import('./manifest.js').manifestSchema>, folder: string }} options
 */
export const buildCreatePlan = async ({ manifest, folder }) => {
  const descriptionPath = resolve(folder, manifest.descriptionFile)
  await refuseDescriptionOutsideFolder({ path: descriptionPath, folder })
  const description = await readDescription(descriptionPath)
  const content = {
    project: manifest.project,
    type: manifest.type,
    summary: manifest.summary,
    priority: manifest.priority ?? null,
    parent: manifest.parent ?? null,
    labels: [...manifest.labels],
    description
  }
  return {
    planId: planIdOf({ ...content, labels: content.labels.toSorted() }),
    ...content,
    warnings: findWarnings(description),
    fields: buildFields(content)
  }
}

/**
 * Returns a row's value as text: a list joined with separator, and none for
 * null, undefined, empty text or an empty list.
 *
 * @param {string | null | undefined | string[]} value
 * @param {{ separator?: string }} [options]
 * @returns {string}
 */
export const rowValueText = (value, { separator = ', ' } = {}) => {
  const text = Array.isArray(value) ? value.join(separator) : value
  return text || 'none'
}

/**
 * Returns a dry run's text: one line per row, the values aligned two columns
 * after the longest label, then a blank line, the description, a blank line
 * and nextStep. A value holding newlines prints one line per line, each
 * continuation aligned under the first. A list prints one line per item, and
 * a null value, empty text or an empty list prints as none.
 *
 * @param {{ rows: [string, string | null | string[]][], description: string, nextStep: string }} options
 */
export const renderPlan = ({ rows, description, nextStep }) => {
  const width = Math.max(...rows.map(([label]) => label.length)) + 2
  const fieldLines = rows.flatMap(([label, value]) =>
    rowValueText(value, { separator: '\n' }).split('\n')
      .map((line, index) => `${(index === 0 ? `${label}:` : '').padEnd(width)}${line}`))
  return [...fieldLines, '', description, '', nextStep].join('\n')
}

/**
 * Returns a confirmed write's rows: Issue with the key, then Created, Updated
 * or Unchanged for mode created, updated or unchanged, with the URL.
 *
 * @param {{ mode: 'created' | 'updated' | 'unchanged', key: string, url: string }} outcome
 * @returns {[string, string][]}
 */
export const writeOutcomeRows = ({ mode, key, url }) => {
  const outcomeWords = { created: 'Created', updated: 'Updated', unchanged: 'Unchanged' }
  return [['Issue', key], [outcomeWords[mode], url]]
}

/**
 * Returns the two lines a confirmed write prints: the key, then the outcome
 * word and the URL from writeOutcomeRows.
 *
 * @param {{ mode: 'created' | 'updated' | 'unchanged', key: string, url: string }} outcome
 */
export const renderWriteOutcome = (outcome) => {
  const [[, key], [outcomeWord, url]] = writeOutcomeRows(outcome)
  return `${key}\n${outcomeWord}: ${url}`
}
