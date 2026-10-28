import { cp, mkdir, readdir, utimes, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const FIXTURE_DOCS_REPO = fileURLToPath(new URL('../commands/confluence/__fixtures__/docs-repo', import.meta.url))
const FAKE_PUBLISHER = fileURLToPath(new URL('../../scripts/fake-publisher.js', import.meta.url))

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

/**
 * Makes npm run publish:confluence in docsRepo run the fake publisher. Writes
 * <docsRepo>/package.json, whose publish:confluence script runs
 * hedy/scripts/fake-publisher.js with --config
 * scripts/confluence/confluence-config.json, and writes scenario to
 * <docsRepo>/scripts/confluence/publisher-scenario.json. The fake, when run,
 * writes { cwd, args, env: { CONFLUENCE_USERNAME, CONFLUENCE_API_TOKEN,
 * CONFLUENCE_URL } } to the path this resolves to, then replays the scenario.
 *
 * @param {string} docsRepo the docs repo copy
 * @param {{ exitCode: number, stdout: string, stderr: string } | { hang: true }} scenario a publisher log fixture, or hang to never exit
 * @returns {Promise<string>} the path of <docsRepo>/scripts/confluence/publisher-call.json
 */
export const installFakePublisher = async (docsRepo, scenario) => {
  const packageJson = {
    name: 'hedy-docs-fixture',
    version: '1.0.0',
    private: true,
    scripts: { 'publish:confluence': `node "${FAKE_PUBLISHER}" --config scripts/confluence/confluence-config.json` }
  }
  const scriptsFolder = join(docsRepo, 'scripts', 'confluence')
  await writeFile(join(docsRepo, 'package.json'), `${JSON.stringify(packageJson, null, 2)}\n`)
  await writeFile(join(scriptsFolder, 'publisher-scenario.json'), `${JSON.stringify(scenario)}\n`)
  return join(scriptsFolder, 'publisher-call.json')
}
