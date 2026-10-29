// Captures the publisher's log for each scenario as a hedy fixture.
// Usage: node capture-publisher-logs.js <tooling checkout> <output folder>
// Copies the fixture docs repo to a temporary workspace, links the tooling
// checkout into it as @defra/delivery-info-arch-tooling, starts the loopback
// Confluence from loopback-confluence.js with a self-signed certificate, runs
// npm run publish:confluence -- --file <page> once per scenario, and writes
// publisher-<scenario>.json holding { exitCode, stdout, stderr } with the
// loopback address replaced by the example site and the temporary workspace by
// /home/hedy/trade-imports-arch-workspace. Needs openssl on PATH.
import { spawn, spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const fixtureDocsRepo = resolvePath(here, '../src/commands/confluence/__fixtures__/docs-repo')
const loopback = join(here, 'loopback-confluence.js')

const scenarios = [
  ['updated', 'docs/systems/HEDY/Guide/publishing.md'],
  ['created', 'docs/systems/HEDY/Guide/publishing.md'],
  ['skipped-no-label', 'docs/systems/HEDY/Guide/publishing.md'],
  ['image-missing', 'docs/systems/HEDY/Guide/figures.md'],
  ['upload-failed', 'docs/systems/HEDY/Guide/publishing.md'],
  ['broken-link', 'docs/systems/HEDY/Guide/links.md'],
  ['nothing-matched', 'docs/notes/unlisted.md']
]

const [tooling, output] = process.argv.slice(2).map((given) => resolvePath(given))
if (!tooling || !output) {
  console.error('Usage: node capture-publisher-logs.js <tooling checkout> <output folder>')
  process.exit(2)
}

const workspace = mkdtempSync(join(tmpdir(), 'hedy-capture-'))
const docsRepo = join(workspace, 'trade-imports-documentation')
cpSync(fixtureDocsRepo, docsRepo, { recursive: true })
mkdirSync(join(docsRepo, 'node_modules', '@defra'), { recursive: true })
mkdirSync(join(docsRepo, 'node_modules', '.bin'), { recursive: true })
symlinkSync(tooling, join(docsRepo, 'node_modules', '@defra', 'delivery-info-arch-tooling'))
symlinkSync(join(tooling, 'bin', 'publish-to-confluence'), join(docsRepo, 'node_modules', '.bin', 'publish-to-confluence'))
writeFileSync(join(docsRepo, 'package.json'), `${JSON.stringify({
  name: 'hedy-docs-fixture',
  version: '1.0.0',
  private: true,
  scripts: { 'publish:confluence': 'publish-to-confluence --config scripts/confluence/confluence-config.json' }
}, null, 2)}\n`)

const capture = join(workspace, 'capture')
mkdirSync(join(capture, 'tls'), { recursive: true })
const openssl = spawnSync('openssl', [
  'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '2',
  '-keyout', join(capture, 'tls', 'key.pem'), '-out', join(capture, 'tls', 'cert.pem'),
  '-subj', '/CN=127.0.0.1', '-addext', 'subjectAltName=IP:127.0.0.1'
], { stdio: 'pipe' })
if (openssl.status !== 0) {
  console.error(`openssl failed: ${openssl.stderr}`)
  process.exit(1)
}

const server = spawn('node', [loopback, capture], { stdio: ['ignore', 'pipe', 'inherit'] })
const portsPath = join(capture, 'ports.json')
const waitForPorts = () => new Promise((resolve, reject) => {
  const startedAt = Date.now()
  const poll = () => {
    if (existsSync(portsPath)) return resolve(JSON.parse(readFileSync(portsPath, 'utf8')))
    if (Date.now() - startedAt > 10000) return reject(new Error('the loopback server did not start within 10 seconds'))
    setTimeout(poll, 100)
  }
  poll()
})

const publisherEnv = (origin) => {
  const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith('CONFLUENCE_')))
  return {
    ...env,
    CONFLUENCE_USERNAME: 'hedy@example.test',
    CONFLUENCE_API_TOKEN: 'synthetic-token',
    CONFLUENCE_URL: origin,
    NODE_EXTRA_CA_CERTS: join(capture, 'tls', 'cert.pem')
  }
}

const withTestSiteNames = (text, origin) => text
  .replaceAll(origin, 'https://example.atlassian.net')
  .replaceAll(workspace, '/home/hedy/trade-imports-arch-workspace')

const run = async () => {
  const ports = await waitForPorts()
  const origin = `https://127.0.0.1:${ports.https}`
  mkdirSync(output, { recursive: true })
  for (const [scenario, page] of scenarios) {
    writeFileSync(join(capture, 'scenario'), `${scenario}\n`)
    const result = spawnSync('npm', ['run', 'publish:confluence', '--', '--file', page], {
      cwd: docsRepo,
      env: publisherEnv(origin),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    })
    const fixture = {
      exitCode: result.status,
      stdout: withTestSiteNames(result.stdout, origin),
      stderr: withTestSiteNames(result.stderr, origin)
    }
    writeFileSync(join(output, `publisher-${scenario}.json`), `${JSON.stringify(fixture, null, 2)}\n`)
    console.log(`${scenario}: exit ${result.status}, ${result.stdout.length} stdout bytes, ${result.stderr.length} stderr bytes`)
  }
  cpSync(join(capture, 'requests.log'), join(output, 'requests.log'))
}

run()
  .catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
  .finally(() => {
    server.kill()
    rmSync(workspace, { recursive: true, force: true })
  })
