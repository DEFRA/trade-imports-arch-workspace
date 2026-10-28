import { z } from 'zod'
import { createConfluenceClient } from '../../clients/confluence.js'
import { loadCredentials } from '../../credentials.js'
import { HedyError, toHedyError } from '../../errors.js'
import { runLocalTool } from '../../local-tool.js'
import { runAction } from '../../run-action.js'
import { readTextFile } from '../jira/files.js'
import { locateDocsRepo, publishEntryFor, readPublishConfig, resolvePage, spaceFor } from './docs-repo.js'
import { inventoryAssets } from './page-assets.js'
import { titleOf } from './page-title.js'
import { readPublisherLog } from './publisher-log.js'

const publishInputSchema = z.object({
  page: z.string().min(1, 'The page path is empty. Give the path of a docs page, then run the command again.')
})

const checkListed = (config, { relativeToDocs, configPath }) => {
  if (publishEntryFor(config, relativeToDocs) === undefined) {
    throw new HedyError('USAGE', `The page ${relativeToDocs} is not listed in publishPaths in ${configPath}, or its entry excludes the page, so the publisher would publish nothing. Add an entry with path ${relativeToDocs}, then run the command again.`)
  }
}

const readPageText = (absolutePath) => readTextFile(absolutePath, {
  kind: 'page',
  missing: () => {
    throw new HedyError('USAGE', `The page at ${absolutePath} is no longer there. Check the docs repo checkout, then run the command again.`)
  }
})

const fencedMermaidNote = ({ buildNeeded, fencedMermaidBlocks }) =>
  buildNeeded.includes('build:mmd') && fencedMermaidBlocks > 0
    ? ` The page also holds ${fencedMermaidBlocks} fenced Mermaid block(s). Check each block renders before the build.`
    : ''

const checkDiagramExports = (assets, pagePath) => {
  if (assets.buildNeeded.length === 0) return
  const notPresent = assets.diagrams
    .filter(({ status }) => status !== 'present')
    .map(({ kind, id, status }) => `${kind} ${id} (${status})`)
  throw new HedyError('USAGE', `The page ${pagePath} embeds diagrams whose exports are missing or stale: ${notPresent.join(', ')}. Run ${assets.buildCommands.join(' and ')}, then run the command again.${fencedMermaidNote(assets)}`)
}

const checkImageFiles = (assets, pagePath) => {
  const missing = assets.images.filter(({ status }) => status === 'missing').map(({ path }) => path)
  if (missing.length > 0) {
    throw new HedyError('USAGE', `The page ${pagePath} embeds images that are not files: ${missing.join(', ')}. Add each file or correct the path in the page, then run the command again.`)
  }
}

const checkGeneratedLabel = (existing, { title, space }) => {
  if (existing !== undefined && !existing.labels.includes('generated')) {
    throw new HedyError('USAGE', `Confluence holds a page titled "${title}" in space ${space} at ${existing.url} without the label generated, so the publisher would leave the page alone. Add the label generated to the page in Confluence, then run the command again.`)
  }
}

const checkLocalFiles = async ({ page, workspaceRoot, cwd }) => {
  const { docsRepo, configPath } = await locateDocsRepo(workspaceRoot())
  const { absolutePath, page: pagePath, relativeToDocs } = await resolvePage({ docsRepo, given: page, cwd })
  const config = await readPublishConfig(configPath)
  checkListed(config, { relativeToDocs, configPath })
  const space = spaceFor(config, relativeToDocs, configPath)
  const text = await readPageText(absolutePath)
  const assets = await inventoryAssets({ docsRepo, pagePath: absolutePath, text })
  checkDiagramExports(assets, pagePath)
  checkImageFiles(assets, pagePath)
  return { docsRepo, configPath, pagePath, space, title: titleOf(text, absolutePath) }
}

const checkConfluence = async ({ env, workspaceRoot, title, space }) => {
  const credentials = loadCredentials({ env, workspaceRoot })
  const client = createConfluenceClient(credentials)
  await client.whoami()
  checkGeneratedLabel(await client.pageByTitle(title, space), { title, space })
  return { credentials, client }
}

const runPublisher = async ({ docsRepo, pagePath, env, credentials, client, timeoutMs, stderr }) => {
  const result = await runLocalTool({
    command: 'npm',
    args: ['run', 'publish:confluence', '--', '--file', pagePath],
    cwd: docsRepo,
    env: {
      ...env,
      CONFLUENCE_USERNAME: credentials.user,
      CONFLUENCE_API_TOKEN: credentials.token,
      CONFLUENCE_URL: client.siteAddress
    },
    timeoutMs,
    onOutput: ({ chunk }) => stderr.write(chunk)
  })
  if (result.timedOut) {
    throw new HedyError('NETWORK', `The publisher did not finish within ${timeoutMs / 60000} minutes and was stopped. Check the page in Confluence, then run the command again.`)
  }
  return result
}

const reasonOf = (reading) => reading.errorLines[0] ?? 'no reason given'

const writtenThenFailedError = (reading, { title, pagePath, pageUrl }) => {
  if (reading.failedImages.length > 0) {
    return new HedyError('NETWORK', `The publisher wrote the page ${title} at ${pageUrl}, but ${reading.failedImages.length} image upload(s) failed: ${reading.failedImages.join(', ')}. Run the command again to upload the images.`)
  }
  if (reading.brokenLinks.length > 0) {
    return new HedyError('USAGE', `The publisher wrote the page ${title} at ${pageUrl}, but the link check found broken links: ${reading.brokenLinks.join('; ')}. Fix the links in ${pagePath}, then run the command again.`)
  }
  return new HedyError('UNKNOWN', `The publisher wrote the page ${title} at ${pageUrl} and then failed: ${reasonOf(reading)}. Read the publisher's log above, then run the command again.`)
}

const notWrittenError = (reading, { title, space, pagePath, configPath }) => {
  switch (reading.outcome) {
    case 'skipped-no-label':
      return new HedyError('USAGE', `Confluence holds a page titled "${title}" in space ${space} without the label generated, so the publisher left the page alone. Add the label generated to the page in Confluence, then run the command again.`)
    case 'failed':
      return new HedyError('UNKNOWN', `The publisher failed before publishing ${pagePath}: ${reasonOf(reading)}. Read the publisher's log above, then run the command again.`)
    default:
      return new HedyError('UNKNOWN', `The publisher published nothing for ${pagePath} and gave no reason. Check that ${configPath} lists the page and that the docs repo is installed, then run the command again.`)
  }
}

const readBack = async (client, reading, { title, pageUrl }) => {
  try {
    return await client.page(reading.id)
  } catch (error) {
    const inner = toHedyError(error)
    throw new HedyError(inner.code, `The publisher reported the page ${title} ${reading.outcome} as ${reading.id} at ${pageUrl}, but reading the page back failed: ${inner.message} Open the page in Confluence to check it, then run the command again if needed.`, { cause: inner })
  }
}

const publishedOutcome = async ({ result, client, preflight }) => {
  const reading = readPublisherLog(result)
  if (reading.id === undefined) throw notWrittenError(reading, preflight)
  const pageUrl = client.pageUrl(preflight.space, reading.id)
  if (result.exitCode !== 0) throw writtenThenFailedError(reading, { ...preflight, pageUrl })
  const back = await readBack(client, reading, { title: preflight.title, pageUrl })
  return {
    mode: reading.outcome,
    page: preflight.pagePath,
    id: reading.id,
    title: back.title,
    space: preflight.space,
    url: back.url,
    version: back.version,
    warnings: reading.warnings,
    links: reading.links
  }
}

/**
 * Publishes one docs page through the docs repo's publisher and resolves to
 * { mode, page, id, title, space, url, version, warnings, links }. The checks
 * run in this order and the first failure rejects: the docs repo and its
 * install, the page path, the publish config, the publishPaths entry, the
 * space, the diagram exports, the image files, the credentials and the
 * Confluence probe, and the generated label on a page Confluence already
 * holds under the title. Then npm run publish:confluence runs in the docs
 * repo with env plus CONFLUENCE_USERNAME, CONFLUENCE_API_TOKEN and
 * CONFLUENCE_URL as its whole environment, and its output is relayed to
 * stderr as the output arrives. A run past timeoutMs rejects NETWORK. A
 * page id in the log with exit code 0 leads to the read back and the result.
 * A page id with a non-zero exit rejects NETWORK for failed image uploads,
 * USAGE for broken links, else UNKNOWN. No page id rejects USAGE for the
 * generated-label skip, else UNKNOWN.
 *
 * @param {{
 *   page: string, env: Record<string, string | undefined>, workspaceRoot: () => string,
 *   cwd?: string, timeoutMs?: number, stderr: { write: (chunk: string) => unknown }
 * }} options
 */
export const runPublish = async ({ page, env, workspaceRoot, cwd = process.cwd(), timeoutMs = 600000, stderr }) => {
  const preflight = await checkLocalFiles({ page, workspaceRoot, cwd })
  const { credentials, client } = await checkConfluence({ env, workspaceRoot, ...preflight })
  const result = await runPublisher({ ...preflight, env, credentials, client, timeoutMs, stderr })
  return publishedOutcome({ result, client, preflight })
}

const linksLine = ({ checked, pages, broken, unreachable }) =>
  `Links checked: ${checked} on ${pages} page(s); broken ${broken}, external unreachable ${unreachable}`

const renderPublish = ({ mode, title, url, warnings, links }) => [
  title,
  `${mode === 'created' ? 'Created' : 'Updated'}: ${url}`,
  ...warnings,
  ...(links === null ? [] : [linksLine(links)])
].join('\n')

export const register = (group, { stdout, stderr, setExitCode, env, workspaceRoot }) => {
  group
    .command('publish')
    .description('Publish one docs page to Confluence through the docs repo\'s publisher')
    .argument('<page>', 'The page path, absolute or relative to the current folder, the docs repo or its docs folder')
    .action((page, _options, command) => runAction(() => {
      const validated = publishInputSchema.parse({ page })
      return runPublish({ ...validated, env, workspaceRoot, stderr })
    }, {
      json: command.optsWithGlobals().json === true,
      render: renderPublish,
      stdout,
      stderr,
      setExitCode
    }))
}
