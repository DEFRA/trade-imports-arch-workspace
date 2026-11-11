import { z } from 'zod'
import { createConfluenceClient, pageIdInPath } from '../../clients/confluence.js'
import { loadCredentials } from '../../credentials.js'
import { HedyError } from '../../errors.js'
import { markdownFromHtml } from '../../html-to-markdown.js'
import { runAction } from '../../run-action.js'

const pageInputSchema = z.object({
  reference: z.string(),
  format: z.enum(['markdown', 'html'], '--format must be markdown or html. Run the command again with one of them.')
})

/**
 * Reads a page reference: digits are a page id, a URL whose path holds
 * /pages/ and digits gives that id, and a URL whose path starts with /wiki/x/
 * is a share link. Throws USAGE for anything else.
 *
 * @param {string} reference
 * @returns {{ id: string } | { shareLink: string }}
 */
export const pageReferenceOf = (reference) => {
  if (/^\d+$/.test(reference)) return { id: reference }
  const url = URL.parse(reference)
  const pageId = url && pageIdInPath(url.pathname)
  if (pageId) return { id: pageId }
  if (url?.pathname.startsWith('/wiki/x/')) return { shareLink: reference }
  throw new HedyError(
    'USAGE',
    `The reference ${reference} is not a Confluence page. Give a page id, a page URL holding /pages/ and the id, or a share link holding /wiki/x/, then run the command again.`
  )
}

const markdownBodyOf = (html) => (html === '' ? '' : markdownFromHtml(html))

/**
 * Returns the Confluence client's page projection for the reference, with the
 * body as markdown unless format is html. An empty body stays empty in both
 * formats. Rejects with USAGE for a reference pageReferenceOf refuses, before
 * loadCredentials runs.
 *
 * @param {{ reference: string, format?: 'markdown' | 'html', env: Record<string, string | undefined>, workspaceRoot: () => string }} options
 */
export const runPage = async ({ reference, format = 'markdown', env, workspaceRoot }) => {
  const pageReference = pageReferenceOf(reference)
  const client = createConfluenceClient(loadCredentials({ env, workspaceRoot }))
  const id = pageReference.id ?? await client.pageIdFromShortLink(pageReference.shareLink)
  const page = await client.page(id)
  return format === 'html' ? page : { ...page, body: markdownBodyOf(page.body) }
}

/**
 * Returns the page's header rows: Space, Version as the number and when, By
 * as the author or unknown, and Source as the page URL.
 *
 * @returns {[string, string][]}
 */
export const pageRows = ({ space, version, url }) => [
  ['Space', space],
  ['Version', `${version.number} (${version.when})`],
  ['By', version.by ?? 'unknown'],
  ['Source', url]
]

const renderPage = (page) => {
  const [space, version, by, source] = pageRows(page).map(([label, value]) => `${label}: ${value}`)
  return [
    `# ${page.title}`,
    [space, version, by].join(' | '),
    source,
    '',
    ...(page.body === '' ? [] : [page.body.replace(/\n$/, '')])
  ].join('\n')
}

export const register = (group, { stdout, stderr, setExitCode, env, workspaceRoot }) => {
  group
    .command('page')
    .description('Print one Confluence page with its title, version and body')
    .argument('<reference>', 'The page id, the page URL or a share link')
    .option('--format <format>', 'Print the body as markdown or html', 'markdown')
    .action((reference, options, command) => runAction(() => {
      const validated = pageInputSchema.parse({ reference, format: options.format })
      return runPage({ ...validated, env, workspaceRoot })
    }, {
      json: command.optsWithGlobals().json === true,
      render: renderPage,
      stdout,
      stderr,
      setExitCode
    }))
}
