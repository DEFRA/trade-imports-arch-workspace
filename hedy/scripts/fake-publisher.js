// Stands in for the docs repo's publisher under test.
// Usage: node fake-publisher.js [publisher arguments...]
// Reads scripts/confluence/publisher-scenario.json in the current folder,
// which holds { exitCode, stdout, stderr } or { hang: true }, writes
// scripts/confluence/publisher-call.json with the folder, the arguments and
// the three CONFLUENCE_* values it received, then prints the scenario's
// streams and exits with its code, or never exits when hang is true.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const folder = join(process.cwd(), 'scripts', 'confluence')
const scenario = JSON.parse(readFileSync(join(folder, 'publisher-scenario.json'), 'utf8'))

writeFileSync(join(folder, 'publisher-call.json'), JSON.stringify({
  cwd: process.cwd(),
  args: process.argv.slice(2),
  env: {
    CONFLUENCE_USERNAME: process.env.CONFLUENCE_USERNAME,
    CONFLUENCE_API_TOKEN: process.env.CONFLUENCE_API_TOKEN,
    CONFLUENCE_URL: process.env.CONFLUENCE_URL
  }
}, null, 2))

if (scenario.hang === true) {
  setInterval(() => {}, 60000)
} else {
  process.stdout.write(scenario.stdout)
  process.stderr.write(scenario.stderr)
  process.exitCode = scenario.exitCode
}
