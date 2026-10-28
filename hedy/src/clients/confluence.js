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

const offSiteRedirectError = (action, location) => new HedyError(
  'USAGE',
  `${action}: Confluence share link led off the Atlassian site in JIRA_BASE_URL, to ${location}, so hedy will not send the credentials there. Open the link in a browser and give the page id from the address, then run the command again.`
)

const noPageReachedError = (action, hops, location) => new HedyError(
  'USAGE',
  `${action}: Confluence redirected the share link ${hops} times without reaching a page, last to ${location}. Open the link in a browser and give the page id from the address, then run the command again.`
)

const pagePath = (id) => {
  const query = new URLSearchParams({ expand: 'body.view,version,space,metadata.labels' })
  return `/wiki/rest/api/content/${encodeURIComponent(id)}?${query}`
}

const versionProjection = (version) => ({
  number: version?.number ?? null,
  when: version?.when ?? null,
  by: version?.by?.displayName ?? null
})

const labelNames = (data) => (data.metadata?.labels?.results ?? []).map(({ name }) => name)

const pageUrl = (normalisedBaseUrl, spaceKey, id) => `${normalisedBaseUrl}/wiki/spaces/${spaceKey}/pages/${id}`

const pageProjection = (data, normalisedBaseUrl) => ({
  id: data.id,
  title: data.title ?? null,
  space: data.space?.key ?? null,
  version: versionProjection(data.version),
  url: pageUrl(normalisedBaseUrl, data.space?.key, data.id),
  labels: labelNames(data),
  body: data.body?.view?.value ?? ''
})

const pageByTitlePath = (title, spaceKey) => {
  const query = new URLSearchParams({ spaceKey, title, expand: 'version,metadata.labels' })
  return `/wiki/rest/api/content?${query}`
}

const titledPageProjection = (data, normalisedBaseUrl, spaceKey) => ({
  id: data.id,
  title: data.title ?? null,
  status: data.status ?? null,
  version: versionProjection(data.version),
  url: pageUrl(normalisedBaseUrl, spaceKey, data.id),
  labels: labelNames(data)
})

/**
 * Returns the digits after /pages/ in a URL path, or undefined when the path
 * holds none.
 *
 * @param {string} path
 * @returns {string | undefined}
 */
export const pageIdInPath = (path) => /\/pages\/(\d+)/.exec(path)?.[1]

const isOnSite = (url, siteOrigin) => url?.origin === siteOrigin

const pageIdAtEndOfRedirects = async ({ http, siteOrigin, action }, shareLink) => {
  const maxHops = 5
  let target = shareLink
  let location
  for (let hop = 0; hop < maxHops; hop++) {
    location = await http.redirectTarget(`${target.pathname}${target.search}`, action)
    target = URL.parse(location, http.normalisedBaseUrl)
    if (!isOnSite(target, siteOrigin)) throw offSiteRedirectError(action, location)
    const pageId = pageIdInPath(target.pathname)
    if (pageId) return pageId
  }
  throw noPageReachedError(action, maxHops, location)
}

/**
 * Takes the credentials credentialsFromEnv returns and an optional timeoutMs
 * for each request, 30000 when not given. Requests go to the site's /wiki
 * path. Every method rejects with a HedyError whose message names Confluence.
 * whoami rejects with AUTH when Confluence answers as the anonymous user.
 * page gives an empty body when the answer holds none.
 * pageByTitle(title, spaceKey) resolves to the first page with that title in
 * the space, as { id, title, status, version, url, labels }, or to undefined
 * when Confluence finds no such page.
 * pageIdFromShortLink follows at most 5 redirects, each on the origin of
 * baseUrl, to the first location whose path holds a page id. It sends no
 * request off that origin and rejects with USAGE instead, and rejects with
 * USAGE when the redirects reach no page.
 *
 * @param {{ user: string, token: string, baseUrl: string }} credentials
 * @param {{ timeoutMs?: number }} [options]
 */
export const createConfluenceClient = ({ user, token, baseUrl }, { timeoutMs } = {}) => {
  const http = createAtlassianHttp({ service: 'Confluence', user, token, baseUrl, timeoutMs })
  const siteOrigin = new URL(http.normalisedBaseUrl).origin
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
    pageByTitle: async (title, spaceKey) => {
      const data = await http.get(pageByTitlePath(title, spaceKey), `page titled "${title}" in space ${spaceKey}`)
      const [firstResult] = data.results ?? []
      return firstResult && titledPageProjection(firstResult, http.normalisedBaseUrl, spaceKey)
    },
    pageIdFromShortLink: async (link) => {
      const action = `page ${link}`
      const parsedLink = URL.parse(link)
      if (!isOnSite(parsedLink, siteOrigin)) throw offSiteLinkError(action)
      return pageIdAtEndOfRedirects({ http, siteOrigin, action }, parsedLink)
    }
  }
}
