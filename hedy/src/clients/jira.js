import { createAtlassianHttp } from './atlassian.js'

const ISSUE_FIELDS = ['summary', 'status', 'issuetype', 'priority', 'assignee', 'labels', 'parent', 'created', 'updated']

const issueProjection = ({ key, fields = {} }, normalisedBaseUrl) => ({
  key,
  url: `${normalisedBaseUrl}/browse/${key}`,
  summary: fields.summary ?? null,
  status: fields.status?.name ?? null,
  type: fields.issuetype?.name ?? null,
  priority: fields.priority?.name ?? null,
  assignee: fields.assignee?.displayName ?? null,
  labels: fields.labels ?? [],
  parent: fields.parent?.key ?? null,
  created: fields.created ?? null,
  updated: fields.updated ?? null
})

const issuePath = (key) => {
  const query = new URLSearchParams({ fields: [...ISSUE_FIELDS, 'description'].join(',') })
  return `/rest/api/2/issue/${encodeURIComponent(key)}?${query}`
}

const searchPagePath = (jql, { maxResults, nextPageToken }) => {
  const query = new URLSearchParams({ jql, fields: ISSUE_FIELDS.join(','), maxResults: String(maxResults) })
  if (nextPageToken) query.set('nextPageToken', nextPageToken)
  return `/rest/api/2/search/jql?${query}`
}

const nextPageTokenOf = (page) => (page.issues?.length > 0 ? page.nextPageToken : undefined)

/**
 * Takes the credentials credentialsFromEnv returns and an optional timeoutMs
 * for each request, 30000 when not given. Every method rejects with a
 * HedyError whose message names Jira. search returns at most max issues,
 * following nextPageToken across pages, and truncated, true only when it
 * stopped at max while Jira offered another page.
 *
 * @param {{ user: string, token: string, baseUrl: string }} credentials
 * @param {{ timeoutMs?: number }} [options]
 */
export const createJiraClient = ({ user, token, baseUrl }, { timeoutMs } = {}) => {
  const http = createAtlassianHttp({ service: 'Jira', user, token, baseUrl, timeoutMs })
  const project = (issue) => issueProjection(issue, http.normalisedBaseUrl)
  return {
    whoami: async () => {
      const data = await http.get('/rest/api/2/myself', 'whoami')
      return { displayName: data.displayName ?? null }
    },
    issue: async (key) => {
      const data = await http.get(issuePath(key), `issue ${key}`)
      return { ...project(data), description: data.fields?.description ?? null }
    },
    search: async (jql, { max }) => {
      const issues = []
      let nextPageToken
      do {
        const maxResults = Math.min(100, max - issues.length)
        const page = await http.get(searchPagePath(jql, { maxResults, nextPageToken }), 'search')
        issues.push(...(page.issues ?? []).slice(0, maxResults).map(project))
        nextPageToken = nextPageTokenOf(page)
      } while (nextPageToken && issues.length < max)
      return { issues, truncated: Boolean(nextPageToken) }
    }
  }
}
