import { HedyError } from '../errors.js'
import { createAtlassianHttp } from './atlassian.js'

const anonymousCallerError = () => new HedyError(
  'AUTH',
  'whoami: Confluence treats the credentials as anonymous, so the account has no Confluence access. Check the account\'s Confluence licence, then run the command again.'
)

const offSiteLinkError = (action) => new HedyError(
  'USAGE',
  `${action}: Confluence share link is not on the Atlassian site in JIRA_BASE_URL, so hedy will not send the credentials to it. Give a link on that site or the page id, then run the command again.`
)

const noPageIdError = (action, location) => new HedyError(
  'USAGE',
  `${action}: Confluence redirected the link to ${location}, which holds no page id. Open the link in a browser and give the page id from the address, then run the command again.`
)

const pagePath = (id) => {
  const query = new URLSearchParams({ expand: 'body.view,version,space,metadata.labels' })
  return `/wiki/rest/api/content/${encodeURIComponent(id)}?${query}`
}

const pageProjection = (data, normalisedBaseUrl) => ({
  id: data.id,
  title: data.title ?? null,
  space: data.space?.key ?? null,
  version: {
    number: data.version?.number ?? null,
    when: data.version?.when ?? null,
    by: data.version?.by?.displayName ?? null
  },
  url: `${normalisedBaseUrl}/wiki/spaces/${data.space?.key}/pages/${data.id}`,
  labels: (data.metadata?.labels?.results ?? []).map(({ name }) => name),
  body: data.body?.view?.value ?? null
})

const pageIdIn = (location) => /\/pages\/(\d+)/.exec(location)?.[1]

/**
 * Takes the credentials credentialsFromEnv returns and an optional timeoutMs
 * for each request, 30000 when not given. Requests go to the site's /wiki
 * path. Every method rejects with a HedyError whose message names Confluence.
 * whoami rejects with AUTH when Confluence answers as the anonymous user.
 * pageIdFromShortLink sends no request for a link whose origin is not the
 * origin of baseUrl, and rejects with USAGE instead.
 *
 * @param {{ user: string, token: string, baseUrl: string }} credentials
 * @param {{ timeoutMs?: number }} [options]
 */
export const createConfluenceClient = ({ user, token, baseUrl }, { timeoutMs } = {}) => {
  const http = createAtlassianHttp({ service: 'Confluence', user, token, baseUrl, timeoutMs })
  const siteOrigin = URL.parse(http.normalisedBaseUrl)?.origin
  return {
    whoami: async () => {
      const data = await http.get('/wiki/rest/api/user/current', 'whoami')
      if (data.type === 'anonymous') throw anonymousCallerError()
      return { displayName: data.displayName ?? null }
    },
    page: async (id) => {
      const data = await http.get(pagePath(id), `page ${id}`)
      return pageProjection(data, http.normalisedBaseUrl)
    },
    pageIdFromShortLink: async (link) => {
      const action = `page ${link}`
      const parsedLink = URL.parse(link)
      if (!parsedLink || parsedLink.origin !== siteOrigin) throw offSiteLinkError(action)
      const location = await http.redirectTarget(`${parsedLink.pathname}${parsedLink.search}`, action)
      const pageId = pageIdIn(location)
      if (!pageId) throw noPageIdError(action, location)
      return pageId
    }
  }
}
