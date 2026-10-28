import { join } from 'node:path'
import { credentialsFromEnv } from './clients/atlassian.js'
import { fillEnvFromFile } from './env-file.js'

/**
 * Fills env from the .env file in the workspace root, then returns the
 * Atlassian credentials from env. A variable already in env wins over the
 * file. Throws one AUTH HedyError naming every credential variable that is
 * missing or empty, or an UNKNOWN HedyError naming the .env path when the
 * file exists but cannot be read.
 *
 * @param {{ env: Record<string, string | undefined>, workspaceRoot: () => string }} options
 * @returns {{ user: string, token: string, baseUrl: string }}
 */
export const loadCredentials = ({ env, workspaceRoot }) => {
  fillEnvFromFile(env, join(workspaceRoot(), '.env'))
  return credentialsFromEnv(env)
}
