import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'

const readEnvText = (path) => {
  try {
    return readFileSync(path, 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') return ''
    throw error
  }
}

/**
 * Sets in env each variable from the dotenv file at path whose name env lacks.
 * The environment wins: a name already in env, even with an empty value, is
 * left untouched. A missing file sets nothing; any other read error is thrown.
 *
 * @param {Record<string, string | undefined>} env
 * @param {string} path
 * @returns {string[]} the names set, sorted
 */
export const fillEnvFromFile = (env, path) => {
  const parsed = parseEnv(readEnvText(path))
  const absentNames = Object.keys(parsed).filter((name) => !(name in env)).sort()
  for (const name of absentNames) env[name] = parsed[name]
  return absentNames
}
