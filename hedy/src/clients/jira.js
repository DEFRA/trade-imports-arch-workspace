import { createAtlassianHttp } from './atlassian.js'

/**
 * Takes the credentials credentialsFromEnv returns. Every method rejects with
 * a HedyError whose message names Jira.
 *
 * @param {{ user: string, token: string, baseUrl: string }} credentials
 */
export const createJiraClient = ({ user, token, baseUrl }) => {
  const http = createAtlassianHttp({ service: 'Jira', user, token, baseUrl })
  return {
    whoami: async () => {
      const data = await http.get('/rest/api/2/myself', 'whoami')
      return { displayName: data.displayName ?? null }
    }
  }
}
