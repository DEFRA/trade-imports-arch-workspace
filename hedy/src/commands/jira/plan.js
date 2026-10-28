import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
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

const readDescriptionText = async (path) => {
  try {
    return await readFile(path, 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new HedyError(
        'USAGE',
        `No description file is at ${path}. Write the description into that file, or set descriptionFile to its path relative to the manifest, then run the command again.`,
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
 * Resolves to the create plan for a validated manifest. The description is
 * the text of descriptionFile, read relative to folder, without its trailing
 * newlines. priority and parent are null when the manifest leaves them out.
 * Rejects with USAGE naming the path when the file is missing or blank, and
 * with UNKNOWN naming the path for any other read error.
 *
 * @param {{ manifest: import('zod').infer<typeof import('./manifest.js').manifestSchema>, folder: string }} options
 */
export const buildCreatePlan = async ({ manifest, folder }) => {
  const path = resolve(folder, manifest.descriptionFile)
  const description = withoutTrailingNewlines(await readDescriptionText(path))
  refuseBlankDescription(description, path)
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
