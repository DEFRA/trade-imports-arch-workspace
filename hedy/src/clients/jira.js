import { createAtlassianHttp } from './atlassian.js'

/**
 * Takes the credentials credentialsFromEnv returns and an optional timeoutMs
 * for each request, 30000 when not given. Every method rejects with a
 * HedyError whose message names Jira.
 *
 * @param {{ user: string, token: string, baseUrl: string }} credentials
 * @param {{ timeoutMs?: number }} [options]
 */
export const createJiraClient = ({ user, token, baseUrl }, { timeoutMs } = {}) => {
  const http = createAtlassianHttp({ service: 'Jira', user, token, baseUrl, timeoutMs })
  return {
    whoami: async () => {
      const data = await http.get('/rest/api/2/myself', 'whoami')
      return { displayName: data.displayName ?? null }
    }
  }
}
