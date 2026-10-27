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

const namesAbsentFrom = (env, parsed) => Object.keys(parsed).filter((name) => !(name in env)).sort()

const expandReferences = (value, valueOfName) =>
  value.replace(/\$(?:\{([A-Za-z_]\w*)\}|([A-Za-z_]\w*))/g, (_, braced, bare) => valueOfName(braced ?? bare))

const expandedValueReader = (env, parsed) => {
  const namesBeingExpanded = new Set()
  const expandedValueOf = (name) => {
    if (name in env) return env[name]
    if (!(name in parsed) || namesBeingExpanded.has(name)) return ''
    namesBeingExpanded.add(name)
    const expandedValue = expandReferences(parsed[name], expandedValueOf)
    namesBeingExpanded.delete(name)
    return expandedValue
  }
  return expandedValueOf
}

/**
 * Sets in env each variable from the dotenv file at path whose name env lacks.
 * The environment wins: a name already in env, even with an empty value, is
 * left untouched. Each value set has its $NAME and ${NAME} references
 * expanded: to env's value, else the file's expanded value, else the empty
 * string. A reference that closes a cycle expands to the empty string. A
 * missing file sets nothing; any other read error is thrown.
 *
 * @param {Record<string, string | undefined>} env
 * @param {string} path
 * @returns {string[]} the names set, sorted
 */
export const fillEnvFromFile = (env, path) => {
  const parsed = parseEnv(readEnvText(path))
  const absentNames = namesAbsentFrom(env, parsed)
  const expandedValueOf = expandedValueReader(env, parsed)
  const expandedValues = absentNames.map(expandedValueOf)
  absentNames.forEach((name, index) => { env[name] = expandedValues[index] })
  return absentNames
}
