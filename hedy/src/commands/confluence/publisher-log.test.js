import { describe, it, expect } from 'vitest'
import { readJsonFixture } from '../../test-support/http.js'
import { readPublisherLog } from './publisher-log.js'

const fixturesUrl = new URL('./__fixtures__/', import.meta.url)

const GITHUB_URL_WARNING = '⚠️  No GitHub URL for folder path: docs/systems/HEDY/Guide'
const IMAGE_WARNING = '⚠️  Image not found: diagrams/nothing.svg (resolved to: /home/hedy/trade-imports-arch-workspace/trade-imports-documentation/docs/systems/HEDY/Guide/diagrams/nothing.svg)'
const UNRESOLVED_LINK_WARNING = '⚠️  Link not resolved to a Confluence page: ../../../notes/unlisted.md (not in publishPaths); left unchanged'
const UPLOAD_RETRY_WARNING = '⚠️  Upload of flow.svg answered HTTP 500, retrying once after 2000 ms: Internal server error'
const IMAGE_UPLOAD_ERROR = '❌ Failed to upload image (HTTP 500): Internal server error'
const PUBLISH_ERROR = '❌ Failed to publish docs/systems/HEDY/Guide/publishing.md: 1 image upload(s) failed: flow.svg'
const BROKEN_LINK = '❌ Broken link on \'Links\': https://example.atlassian.net/wiki/spaces/HEDYDOCS/pages/999 (no Confluence page has ID 999)'

const ONE_LINK_CHECKED = { checked: 1, pages: 1, broken: 0, unreachable: 0 }

const emptyReading = {
  outcome: 'nothing',
  id: undefined,
  failedImages: [],
  brokenLinks: [],
  errorLines: [],
  warnings: [],
  links: null
}

const logOf = ({ exitCode = 0, stdout = '', stderr = '' }) => ({ exitCode, stdout, stderr })

describe('readPublisherLog', () => {
  it.each([
    ['updated', { ...emptyReading, outcome: 'updated', id: '201', warnings: [GITHUB_URL_WARNING], links: ONE_LINK_CHECKED }],
    ['created', { ...emptyReading, outcome: 'created', id: '301', warnings: [GITHUB_URL_WARNING], links: ONE_LINK_CHECKED }],
    ['skipped-no-label', { ...emptyReading, outcome: 'skipped-no-label', warnings: [GITHUB_URL_WARNING] }],
    ['image-missing', {
      ...emptyReading,
      outcome: 'updated',
      id: '203',
      warnings: [GITHUB_URL_WARNING, IMAGE_WARNING],
      links: { checked: 0, pages: 1, broken: 0, unreachable: 0 }
    }],
    ['upload-failed', {
      ...emptyReading,
      outcome: 'failed',
      failedImages: ['flow.svg'],
      errorLines: [IMAGE_UPLOAD_ERROR, PUBLISH_ERROR],
      warnings: [GITHUB_URL_WARNING, UPLOAD_RETRY_WARNING]
    }],
    ['broken-link', {
      ...emptyReading,
      outcome: 'failed',
      id: '204',
      brokenLinks: [BROKEN_LINK],
      errorLines: [BROKEN_LINK],
      warnings: [UNRESOLVED_LINK_WARNING, GITHUB_URL_WARNING],
      links: { checked: 1, pages: 1, broken: 1, unreachable: 0 }
    }],
    ['nothing-matched', emptyReading]
  ])('reads the %s fixture into its outcome, id, failed images, broken links, error lines, warnings and link counts', async (name, expected) => {
    const log = await readJsonFixture(new URL(`publisher-${name}.json`, fixturesUrl))
    expect(readPublisherLog(log)).toEqual(expected)
  })

  it('reports none of the summary count lines as an error or a warning', () => {
    const stdout = [
      '  ✅ Successful: 0',
      '  ❌ Failed: 1',
      '  ⏭️  Skipped: 6',
      '  🔗 Broken links: 2',
      '  ⚠️  External links not reachable: 3'
    ].join('\n')
    const reading = readPublisherLog(logOf({ stdout }))
    expect([reading.errorLines, reading.warnings]).toEqual([[], []])
  })

  it('matches a line after trimming its leading and trailing whitespace and keeps the trimmed form', () => {
    const stderr = `      ✅ Updated successfully (ID: 7)   \n\t  ${BROKEN_LINK}  \n`
    const reading = readPublisherLog(logOf({ stderr }))
    expect([reading.outcome, reading.id, reading.brokenLinks]).toEqual(['updated', '7', [BROKEN_LINK]])
  })

  it('finds a success line on stdout as well as on stderr', () => {
    const reading = readPublisherLog(logOf({ stdout: '\n  ✅ Created successfully (ID: 42)\n' }))
    expect([reading.outcome, reading.id]).toEqual(['created', '42'])
  })

  it('reads a log with exit 1 and no success line as failed with no id', () => {
    const reading = readPublisherLog(logOf({ exitCode: 1, stderr: '  ❌ Error publishing page: timeout\n' }))
    expect([reading.outcome, reading.id]).toEqual(['failed', undefined])
  })

  it('keeps two broken link lines in the order the log gives them', () => {
    const second = '❌ Broken link on \'Links\': https://example.com/gone (HTTP 404)'
    const reading = readPublisherLog(logOf({ exitCode: 1, stderr: `  ${BROKEN_LINK}\n  ${second}\n` }))
    expect(reading.brokenLinks).toEqual([BROKEN_LINK, second])
  })

  it('gives both image names from a failed publish line that names two', () => {
    const stderr = '  ❌ Failed to publish docs/a.md: 2 image upload(s) failed: flow.svg, context.png\n'
    const reading = readPublisherLog(logOf({ exitCode: 1, stderr }))
    expect(reading.failedImages).toEqual(['flow.svg', 'context.png'])
  })
})
