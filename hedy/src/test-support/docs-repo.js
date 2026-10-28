import { cp, mkdir, readdir, utimes, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const FIXTURE_DOCS_REPO = fileURLToPath(new URL('../commands/confluence/__fixtures__/docs-repo', import.meta.url))

const setEveryFileTime = async (folder, time) => {
  const entries = await readdir(folder, { recursive: true, withFileTypes: true })
  const files = entries.filter((entry) => entry.isFile())
  await Promise.all(files.map((entry) => utimes(join(entry.parentPath, entry.name), time, time)))
}

/**
 * Copies the fixture docs repo to <root>/trade-imports-documentation, gives
 * every copied file one and the same modification time, so every diagram export
 * the fixture holds reads as present, and creates
 * node_modules/@defra/delivery-info-arch-tooling/ in the copy as a real folder
 * holding a package.json named @defra/delivery-info-arch-tooling.
 *
 * @param {string} root the workspace folder
 * @returns {Promise<string>} the copy's path
 */
export const copyFixtureDocsRepo = async (root) => {
  const copy = join(root, 'trade-imports-documentation')
  await cp(FIXTURE_DOCS_REPO, copy, { recursive: true })
  await setEveryFileTime(copy, new Date('2026-01-01T00:00:00Z'))
  const tooling = join(copy, 'node_modules', '@defra', 'delivery-info-arch-tooling')
  await mkdir(tooling, { recursive: true })
  await writeFile(join(tooling, 'package.json'), `${JSON.stringify({ name: '@defra/delivery-info-arch-tooling' })}\n`)
  return copy
}
