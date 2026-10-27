import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { HedyError } from './errors.js'

const readEnvText = (path) => {
  try {
    return readFileSync(path, 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') return ''
    throw new HedyError(
      'UNKNOWN',
      `The .env file at ${path} could not be read. Check that the path is a regular file with read permission, then run the command again.`,
      { cause: error }
    )
  }
}

const namesAbsentFrom = (env, parsed) => Object.keys(parsed).filter((name) => !(name in env)).sort()

const isSingleQuotedIn = (text, name) => {
  const definition = new RegExp(String.raw`^[ \t]*(?:export[ \t]+)?${RegExp.escape(name)}[ \t]*=[ \t]*(.?)`, 'gm')
  return [...text.matchAll(definition)].at(-1)?.[1] === "'"
}

const expandReferences = (value, valueOfName) =>
  value.replace(/\\\$|\$(?:\{([A-Za-z_]\w*)\}|([A-Za-z_]\w*))/g, (match, braced, bare) =>
    match === '\\$' ? '$' : valueOfName(braced ?? bare))

const expandedValueReader = (text, parsed) => {
  const namesBeingExpanded = new Set()
  const expandedValueOf = (name) => {
    if (!Object.hasOwn(parsed, name) || namesBeingExpanded.has(name)) return ''
    if (isSingleQuotedIn(text, name)) return parsed[name]
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
 * expanded to the file's own expanded value for that name, else the empty
 * string; a reference never reads env. A value the file gives in single
 * quotes is kept literal, and \$ is a literal $. A reference that closes a
 * cycle expands to the empty string. A missing file sets nothing; any other
 * read error throws an UNKNOWN HedyError naming the path.
 *
 * @param {Record<string, string | undefined>} env
 * @param {string} path
 * @returns {string[]} the names set, sorted
 */
export const fillEnvFromFile = (env, path) => {
  const text = readEnvText(path)
  const parsed = parseEnv(text)
  const expandedValueOf = expandedValueReader(text, parsed)
  const absentNames = namesAbsentFrom(env, parsed)
  for (const name of absentNames) env[name] = expandedValueOf(name)
  return absentNames
}
