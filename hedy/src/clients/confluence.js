import { HedyError } from '../errors.js'
import { createAtlassianHttp } from './atlassian.js'

const anonymousCallerError = () => new HedyError(
  'AUTH',
  'whoami: Confluence treats the credentials as anonymous, so the account has no Confluence access. Check the account\'s Confluence licence, then run the command again.'
)

/**
 * Takes the credentials credentialsFromEnv returns and an optional timeoutMs
 * for each request, 30000 when not given. Requests go to the site's /wiki
 * path. Every method rejects with a HedyError whose message names Confluence.
 * whoami rejects with AUTH when Confluence answers as the anonymous user.
 *
 * @param {{ user: string, token: string, baseUrl: string }} credentials
 * @param {{ timeoutMs?: number }} [options]
 */
export const createConfluenceClient = ({ user, token, baseUrl }, { timeoutMs } = {}) => {
  const http = createAtlassianHttp({ service: 'Confluence', user, token, baseUrl, timeoutMs })
  return {
    whoami: async () => {
      const data = await http.get('/wiki/rest/api/user/current', 'whoami')
      if (data.type === 'anonymous') throw anonymousCallerError()
      return { displayName: data.displayName ?? null }
    }
  }
}
