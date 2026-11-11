// Probe for round 3 of hedy prose check: aside stacking and the contact clause.
// Run from the workspace root:
//   node .claude/workareas/technical-authoring/round-3-probe.mjs <docs repo>
// The docs repo argument is the folder that holds the docs repo's docs/ folder.
//
// Aside stacking is defined by punctuation, so the census below finds every
// instance: each sentence of masked body text holding three or more " - ".
// The contact clause is a grammar pattern, so a corpus count would measure
// only the old gate's regex. The probe instead runs that regex over a fixed
// set of written sentences, each marked as a contact clause or not, and
// reports which ones it catches.

import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

const { maskText } = await import(pathToFileURL(resolve('hedy/src/commands/prose/masking.js')))

const DOCS = join(resolve(process.argv[2]), 'docs')
const THIRD_PARTY = ['systems/EUDP/TNT-WebServices', 'guidelines'].map((path) => join(DOCS, path))
const EXCLUDED = /__fixtures__\/|prose-gate-cases\/|\/tests\/expected\//

const markdownUnder = (folder) => readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
  const path = join(folder, entry.name)
  if (THIRD_PARTY.includes(path)) return []
  if (entry.isDirectory()) return markdownUnder(path)
  return entry.name.endsWith('.md') ? [path] : []
})

const repoFiles = execFileSync('git', ['ls-files', '*.md'], { encoding: 'utf8' })
  .split('\n')
  .filter((path) => path !== '' && !EXCLUDED.test(path))

const SENTENCE_END = /[.!?](?:\s|$)/
const spacedHyphens = (sentence) => sentence.split(' - ').length - 1

const stackedLines = (files) => files.flatMap((file) => maskText(readFileSync(file, 'utf8'))
  .split('\n')
  .map((line, index) => ({ file, line: index + 1, text: line }))
  .filter(({ text }) => text.split(SENTENCE_END).some((sentence) => spacedHyphens(sentence) >= 3)))

const census = (name, files) => {
  const hits = stackedLines(files)
  const inTables = hits.filter(({ text }) => text.trim().startsWith('|'))
  console.log(`## Aside stacking, ${name}`)
  console.log(`${files.length} files; ${hits.length} lines hold a sentence with 3 or more " - " (${inTables.length} of them table rows), in ${new Set(hits.map(({ file }) => file)).size} files`)
  for (const { file, line } of hits) console.log(`${file}:${line}`)
  console.log()
}

census('this repo', repoFiles)
census('docs repo', markdownUnder(DOCS))

const CONTACT = /\bonly (the |that |its )?([a-zA-Z'-]+ ){1,3}(reaches|sees|touches)\b/i

const SENTENCES = [
  [true, 'Sessions live in a store only the front door reaches.'],
  [true, 'The token only the browser sees is never logged.'],
  [true, 'The key the service holds signs every assertion.'],
  [true, 'The session only the backend can read expires after an hour.'],
  [true, 'The cookie the browser sends carries the session id.'],
  [true, 'It writes to a queue nothing else touches.'],
  [true, 'The record only its owner can change is locked.'],
  [true, 'A header the proxy strips never reaches the service.'],
  [true, 'The claims the token carries decide the roles.'],
  [true, 'The endpoint only the worker calls is not public.'],
  [false, 'Only the front door reaches the store.'],
  [false, 'Sessions live in a store that only the front door can access.'],
  [false, 'The service holds the key that signs every assertion.'],
]

console.log('## Contact clause, the old regex against written sentences')
console.log('| Contact clause | Caught | Sentence |')
console.log('| --- | --- | --- |')
for (const [isContact, sentence] of SENTENCES) {
  console.log(`| ${isContact ? 'yes' : 'no'} | ${CONTACT.test(sentence) ? 'yes' : 'no'} | ${sentence} |`)
}
