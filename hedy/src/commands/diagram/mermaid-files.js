import { readdir, stat } from 'node:fs/promises'
import { join, sep } from 'node:path'

const LEFT_OUT_FOLDERS = new Set(['node_modules', 'build', 'generated'])

const isLeftOut = (folderName) => LEFT_OUT_FOLDERS.has(folderName) || folderName.startsWith('.')

const isMermaidSource = (relativePath) => {
  const segments = relativePath.split(sep)
  const holdsDiagrams = /\.(md|mmd)$/.test(segments.at(-1))
  return holdsDiagrams && !segments.slice(0, -1).some(isLeftOut)
}

const isFolder = async (path) => {
  const status = await stat(path).catch((error) => {
    if (['ENOENT', 'ENOTDIR'].includes(error.code)) return undefined
    throw error
  })
  return status?.isDirectory() === true
}

const filesUnder = async (folder) =>
  (await readdir(folder, { recursive: true })).filter(isMermaidSource).sort().map((relativePath) => join(folder, relativePath))

/**
 * Resolves to the files to check, in the order given: each folder gives the
 * .mmd files and Markdown pages beneath it in path order, leaving out
 * node_modules, build, generated and folders whose names start with a dot.
 * A path that names a file, or names nothing, is kept as given.
 *
 * @param {string[]} paths
 * @returns {Promise<string[]>}
 */
export const mermaidFiles = async (paths) => {
  const lists = await Promise.all(paths.map(async (path) => (await isFolder(path)) ? filesUnder(path) : [path]))
  return lists.flat()
}
