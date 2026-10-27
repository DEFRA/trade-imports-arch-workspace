import { createAtlassianHttp } from './atlassian.js'

/**
 * Takes the credentials credentialsFromEnv returns. Requests go to the site's
 * /wiki path. Every method rejects with a HedyError whose message names
 * Confluence.
 *
 * @param {{ user: string, token: string, baseUrl: string }} credentials
 */
export const createConfluenceClient = ({ user, token, baseUrl }) => {
  const http = createAtlassianHttp({ service: 'Confluence', user, token, baseUrl })
  return {
    whoami: async () => {
      const data = await http.get('/wiki/rest/api/user/current', 'whoami')
      return { displayName: data.displayName ?? null }
    }
  }
}
