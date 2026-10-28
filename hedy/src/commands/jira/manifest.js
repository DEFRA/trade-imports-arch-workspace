import { dirname, isAbsolute } from 'node:path'
import { z } from 'zod'
import { HedyError, toHedyError } from '../../errors.js'
import { parseJsonText, readTextFile } from './files.js'
import { issueKeySchema } from './issue-key.js'

export const MANIFEST_SCHEMA = 'hedy-ticket/1'

const PROJECT_MESSAGE = 'project must be a Jira project key such as ABC. Set project in the manifest, then run the command again.'
const SUMMARY_BLANK_MESSAGE = 'summary is blank. Write the issue\'s one-line title into summary in the manifest, then run the command again.'
const DESCRIPTION_FILE_MESSAGE = 'descriptionFile must be the path of the description file, relative to the manifest\'s folder. Set descriptionFile in the manifest, then run the command again.'
const LABELS_MESSAGE = 'labels must be a list of label names without spaces, none of them empty, such as ["hedy"]. Fix labels in the manifest, or remove it, then run the command again.'

const parentMessage = ({ input }) => `parent ${input} is not a Jira issue key such as ABC-123. Set parent to the key of the parent issue, or remove it, then run the command again.`

const isIssueKey = (value) => issueKeySchema.safeParse(value).success

const isRelativeWithoutParentSegments = (value) => !isAbsolute(value) && !value.split(/[/\\]/).includes('..')

const manifestFieldList = () => {
  const names = Object.keys(manifestSchema.shape)
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
}

const manifestShapeMessage = (issue) => issue.code === 'unrecognized_keys'
  ? `The manifest holds keys that are not manifest fields: ${issue.keys.join(', ')}. Remove them, then run the command again. The fields are ${manifestFieldList()}.`
  : `The manifest must be one JSON object with the fields ${manifestFieldList()}. Write the manifest as one object, then run the command again.`

export const manifestSchema = z.strictObject({
  schema: z.literal(MANIFEST_SCHEMA, {
    error: `schema must be "${MANIFEST_SCHEMA}". Set "schema": "${MANIFEST_SCHEMA}" in the manifest, then run the command again.`
  }),
  project: z.string({ error: PROJECT_MESSAGE }).trim().regex(/^[A-Z][A-Z0-9_]*$/, PROJECT_MESSAGE),
  type: z.enum(['Bug', 'Story', 'Task', 'Epic'], {
    error: 'type must be one of Bug, Story, Task or Epic. Set type in the manifest to one of them, then run the command again.'
  }),
  summary: z.string({ error: SUMMARY_BLANK_MESSAGE })
    .trim()
    .min(1, SUMMARY_BLANK_MESSAGE)
    .max(255, {
      error: ({ input }) => `summary is ${input.length} characters, over the limit of 255. Shorten summary in the manifest, then run the command again.`
    }),
  descriptionFile: z.string({ error: DESCRIPTION_FILE_MESSAGE })
    .min(1, DESCRIPTION_FILE_MESSAGE)
    .refine(isRelativeWithoutParentSegments, {
      error: 'descriptionFile must be a path relative to the manifest\'s folder, without .. segments. Set descriptionFile in the manifest, then run the command again.'
    }),
  priority: z.enum(['Lowest', 'Low', 'Medium', 'High', 'Highest'], {
    error: 'priority must be one of Lowest, Low, Medium, High or Highest. Set priority in the manifest to one of them, or remove it, then run the command again.'
  }).optional(),
  parent: z.string({ error: parentMessage }).refine(isIssueKey, { error: parentMessage }).optional(),
  labels: z.array(z.string({ error: LABELS_MESSAGE }).regex(/^\S+$/, LABELS_MESSAGE), { error: LABELS_MESSAGE }).default([])
}, { error: manifestShapeMessage })

const refuseMissingManifest = (path, error) => {
  throw new HedyError('USAGE', `No ticket manifest is at ${path}. Give --from the path of a ticket manifest, then run the command again.`, { cause: error })
}

const validateManifest = (value, path) => {
  const result = manifestSchema.safeParse(value)
  if (result.success) return result.data
  throw new HedyError('USAGE', `The manifest at ${path} is not valid. ${toHedyError(result.error).message}`, { cause: result.error })
}

/**
 * Resolves to the validated manifest at the absolute path and the folder that
 * holds it, the folder descriptionFile is relative to. Rejects with USAGE for
 * a missing file, a file that is not JSON or a manifest the schema refuses,
 * and with UNKNOWN for any other read error, each naming the path.
 *
 * @param {string} path
 * @returns {Promise<{ manifest: z.infer<typeof manifestSchema>, folder: string }>}
 */
export const loadManifest = async (path) => {
  const text = await readTextFile(path, { kind: 'manifest', missing: (error) => refuseMissingManifest(path, error) })
  const value = parseJsonText(text, { kind: 'manifest', path, nextStep: 'Fix the file so that it parses as JSON, then run the command again.' })
  return { manifest: validateManifest(value, path), folder: dirname(path) }
}
