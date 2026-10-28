import { readFile, realpath } from 'node:fs/promises'
import { isAbsolute, relative, sep } from 'node:path'
import { HedyError } from '../../errors.js'

/**
 * Returns true when realPath names a secrets file, by the Bash guard's
 * patterns applied to the file name: a name that ends in .env or holds
 * .env., a file named .npmrc, .netrc, credentials or secrets, a name that
 * starts with credentials. or secrets., or any file under a folder named
 * .aws or .ssh.
 *
 * @param {string} realPath
 */
export const isSecretPath = (realPath) => {
  const segments = realPath.split(sep)
  const name = segments.at(-1)
  const secretFolders = ['.aws', '.ssh']
  return name.endsWith('.env') || name.includes('.env.') ||
    /^(\.npmrc|\.netrc|credentials(\..*)?|secrets(\..*)?)$/.test(name) ||
    segments.slice(0, -1).some((segment) => secretFolders.includes(segment))
}

/**
 * Returns the path of realPath inside realFolder with / separators, or
 * undefined when realPath is realFolder itself or lies outside the folder.
 *
 * @param {string} realFolder
 * @param {string} realPath
 */
export const pathInside = (realFolder, realPath) => {
  const relativePath = relative(realFolder, realPath)
  const outside = relativePath === '' || relativePath === '..' || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)
  return outside ? undefined : relativePath.split(sep).join('/')
}

const refuseSecretPath = ({ path, realPath, kind }) => {
  if (!isSecretPath(realPath)) return
  const where = realPath === path ? `${path} is` : `${path} is ${realPath},`
  throw new HedyError(
    'USAGE',
    `The ${kind} at ${where} a secrets file that hedy never reads. Give the path of a ${kind} that holds no secrets, then run the command again.`
  )
}

/**
 * Resolves to the UTF-8 text of the file at path. A missing file resolves
 * to what missing(error) returns, and missing may throw instead. A path
 * whose real path isSecretPath names rejects with USAGE naming kind, path
 * and the real path, before the file is read. Any other read error rejects
 * with UNKNOWN naming kind and path.
 *
 * @param {string} path
 * @param {{ kind: string, missing: (error: NodeJS.ErrnoException) => unknown }} options
 */
export const readTextFile = async (path, { kind, missing }) => {
  try {
    const realPath = await realpath(path)
    refuseSecretPath({ path, realPath, kind })
    return await readFile(realPath, 'utf8')
  } catch (error) {
    if (error instanceof HedyError) throw error
    if (error.code === 'ENOENT') return missing(error)
    throw new HedyError(
      'UNKNOWN',
      `The ${kind} at ${path} could not be read. Check that the path is a regular file with read permission, then run the command again.`,
      { cause: error }
    )
  }
}

/**
 * Returns the value the JSON text holds. Throws USAGE naming kind and path,
 * then nextStep, when the text is not JSON.
 *
 * @param {string} text
 * @param {{ kind: string, path: string, nextStep: string }} options
 */
export const parseJsonText = (text, { kind, path, nextStep }) => {
  try {
    return JSON.parse(text)
  } catch (error) {
    throw new HedyError('USAGE', `The ${kind} at ${path} is not JSON. ${nextStep}`, { cause: error })
  }
}
