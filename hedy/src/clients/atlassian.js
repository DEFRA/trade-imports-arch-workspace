import { HedyError } from '../errors.js'

const listInProse = (items) =>
  items.length === 1 ? items[0] : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`

const missingCredentialsError = (names) => new HedyError('AUTH', names.length === 1
  ? `${names[0]} is not set. Set it in the workspace .env file.`
  : `${listInProse(names)} are not set. Set them in the workspace .env file.`)

/**
 * Reads the Atlassian credentials from JIRA_USER, JIRA_TOKEN and JIRA_BASE_URL.
 * Throws one AUTH HedyError naming every variable that is missing or empty.
 *
 * @param {Record<string, string | undefined>} env
 * @returns {{ user: string, token: string, baseUrl: string }}
 */
export const credentialsFromEnv = (env) => {
  const { JIRA_USER: user, JIRA_TOKEN: token, JIRA_BASE_URL: baseUrl } = env
  const missing = Object.entries({ JIRA_USER: user, JIRA_TOKEN: token, JIRA_BASE_URL: baseUrl })
    .filter(([, value]) => !value)
    .map(([name]) => name)
  if (missing.length > 0) throw missingCredentialsError(missing)
  return { user, token, baseUrl }
}

const basicAuthorization = (user, token) => `Basic ${Buffer.from(`${user}:${token}`).toString('base64')}`

const connectionError = ({ service, action }, cause) => new HedyError(
  'NETWORK',
  `${action}: ${service} could not be reached. Check the network connection and JIRA_BASE_URL in the workspace .env file, then run the command again.`,
  { cause }
)

const parsedBody = (text, { service, action }) => {
  try {
    return JSON.parse(text)
  } catch {
    throw new HedyError('PARSE', `${action}: ${service} answered with a body that is not JSON. Check that JIRA_BASE_URL in the workspace .env file is the Atlassian site address.`)
  }
}

const badRequestReasons = (body) => {
  const fieldReasons = Object.entries(body?.errors ?? {}).map(([field, reason]) => `${field}: ${reason}`)
  const reasons = [...(body?.errorMessages ?? []), ...fieldReasons]
  return reasons.length === 0 && body?.message ? [body.message] : reasons
}

const badRequestError = ({ service, action }, body) => {
  const reasons = badRequestReasons(body)
  return new HedyError('USAGE', reasons.length === 0
    ? `${action}: ${service} refused the request without giving a reason. Check the values given, then run the command again.`
    : `${action}: ${service} refused the request. ${service} said ${listInProse(reasons.map((reason) => `"${reason}"`))}. Correct the request, then run the command again.`)
}

const statusError = (context, { status, text }) => {
  const { service, action } = context
  switch (status) {
    case 400:
      return badRequestError(context, parsedBody(text, context))
    case 401:
      return new HedyError('AUTH', `${action}: ${service} rejected the credentials in JIRA_USER and JIRA_TOKEN. Check both in the workspace .env file.`)
    case 403:
      return new HedyError('AUTH', `${action}: ${service} refused the account in JIRA_USER access to this resource. Check the account's ${service} permissions, then run the command again.`)
    case 404:
      return new HedyError('NOT_FOUND', `${action}: ${service} found nothing at the requested address. Check the key or id given, and that JIRA_BASE_URL in the workspace .env file is the Atlassian site address.`)
    case 429:
      return new HedyError('RATE_LIMIT', `${action}: ${service} is rate limiting requests. Wait a minute and run the command again.`)
    default:
      return new HedyError('NETWORK', `${action}: ${service} answered ${status}. Run the command again. If the failure repeats, check the Atlassian status page.`)
  }
}

const fetchText = async (url, headers, context) => {
  try {
    const response = await fetch(url, { headers })
    return { status: response.status, text: await response.text() }
  } catch (error) {
    throw connectionError(context, error)
  }
}

/**
 * Returns get(path, action), which resolves to the parsed JSON body of a
 * GET on baseUrl + path. Every failure is a HedyError whose message starts
 * with the action and names the service.
 *
 * @param {{ service: string, user: string, token: string, baseUrl: string }} options
 *   service is the product name used in messages
 * @returns {{ get: (path: string, action: string) => Promise<unknown> }}
 */
export const createAtlassianHttp = ({ service, user, token, baseUrl }) => {
  const root = baseUrl.replace(/\/+$/, '')
  const headers = { Authorization: basicAuthorization(user, token), Accept: 'application/json' }
  return {
    get: async (path, action) => {
      const context = { service, action }
      const response = await fetchText(`${root}${path}`, headers, context)
      if (response.status >= 400) throw statusError(context, response)
      return parsedBody(response.text, context)
    }
  }
}
