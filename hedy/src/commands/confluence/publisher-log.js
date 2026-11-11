const trimmedLinesOf = ({ stdout, stderr }) =>
  [stderr, stdout].flatMap((text) => text.split('\n')).map((line) => line.trim())

const isSummaryCountLine = (line) =>
  /^(✅ Successful|❌ Failed|⏭️ {2}Skipped|🔗 Broken links|⚠️ {2}External links not reachable): \d+$/u.test(line)

const successOf = (lines) => {
  const match = lines.map((line) => line.match(/^✅ (Updated|Created) successfully \(ID: (\d+)\)$/u)).find(Boolean)
  return match && { mode: match[1].toLowerCase(), id: match[2] }
}

const hasSkipLine = (lines) =>
  lines.includes('⏭️  Skipping: Page exists but is not safe to update (no \'generated\' label)')

const outcomeOf = ({ exitCode, success, skipped }) => {
  if (exitCode !== 0) return 'failed'
  if (success) return success.mode
  return skipped ? 'skipped-no-label' : 'nothing'
}

const failedImagesOf = (lines) => {
  const match = lines.map((line) => line.match(/^❌ Failed to publish .+: \d+ image upload\(s\) failed: (.+)$/u)).find(Boolean)
  return match ? match[1].split(', ') : []
}

const brokenLinksOf = (lines) => lines.filter((line) => line.startsWith('❌ Broken link on '))

const errorLinesOf = (lines) => lines.filter((line) => line.startsWith('❌'))

const warningsOf = (lines) => lines.filter((line) => line.startsWith('⚠️'))

const linkCountsOf = (lines) => {
  const match = lines
    .map((line) => line.match(/^🔗 Links checked: (\d+) on (\d+) page\(s\); broken (\d+), external unreachable (\d+)$/u))
    .find(Boolean)
  if (!match) return null
  const [checked, pages, broken, unreachable] = match.slice(1).map(Number)
  return { checked, pages, broken, unreachable }
}

/**
 * Reads the outcome of one publisher run from its exit code and its two
 * streams. Each line of stderr, then of stdout, is trimmed before matching,
 * and the summary count lines are ignored.
 *
 * outcome is 'failed' for a non-zero exit code, else 'updated' or 'created'
 * from the success line, else 'skipped-no-label' from the skip line, else
 * 'nothing'. id holds the success line's page id as text, or undefined
 * without a success line. failedImages holds the image names of the failed
 * publish line. brokenLinks, errorLines and warnings hold the trimmed lines
 * in log order. links holds the numbers of the links-checked line, or null
 * without that line.
 *
 * @param {{ exitCode: number | null, stdout: string, stderr: string }} log
 * @returns {{ outcome: 'failed' | 'updated' | 'created' | 'skipped-no-label' | 'nothing', id: string | undefined, failedImages: string[], brokenLinks: string[], errorLines: string[], warnings: string[], links: { checked: number, pages: number, broken: number, unreachable: number } | null }}
 */
export const readPublisherLog = ({ exitCode, stdout, stderr }) => {
  const lines = trimmedLinesOf({ stdout, stderr }).filter((line) => !isSummaryCountLine(line))
  const success = successOf(lines)
  return {
    outcome: outcomeOf({ exitCode, success, skipped: hasSkipLine(lines) }),
    id: success?.id,
    failedImages: failedImagesOf(lines),
    brokenLinks: brokenLinksOf(lines),
    errorLines: errorLinesOf(lines),
    warnings: warningsOf(lines),
    links: linkCountsOf(lines)
  }
}
