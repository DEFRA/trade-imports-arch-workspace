/**
 * The markdown ends in exactly one newline.
 */
export const markdownFromHtml = (html) => [
  normaliseLineEndings,
  unwrapDocument,
  convertCodeBlocks,
  convertHeadings,
  convertBlockquotes,
  convertTables,
  convertHorizontalRules,
  convertLists,
  convertParagraphs,
  unwrapContainers,
  convertInline,
  stripTags,
  decodeEntities,
  collapseBlankLines,
  trimToOneClosingNewline
].reduce((markdown, step) => step(markdown), html)

const normaliseLineEndings = (html) => html.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

const unwrapDocument = (html) => html
  .replace(/<head[\s\S]*?<\/head>/gi, '')
  .replace(/<\/?(html|body)[^>]*>/gi, '')

const fence = (code, language) => '\n```' + language + '\n' + code.trim() + '\n```\n'

const convertCodeBlocks = (html) => html
  .replace(/<pre[^>]*>\s*<code[^>]*class="[^"]*language-(\w+)[^"]*"[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi,
    (_, language, code) => fence(decodeEntities(code), language))
  .replace(/<pre[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi,
    (_, code) => fence(decodeEntities(code), ''))
  .replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi,
    (_, code) => fence(decodeEntities(stripTags(code)), ''))

const convertHeadings = (html) => {
  let markdown = html
  for (let level = 6; level >= 1; level--) {
    const heading = new RegExp(`<h${level}[^>]*>([\\s\\S]*?)<\\/h${level}>`, 'gi')
    markdown = markdown.replace(heading, (_, content) => `\n${'#'.repeat(level)} ${stripTags(content).trim()}\n`)
  }
  return markdown
}

const quoteLines = (markdown) => markdown.split('\n').map((line) => `> ${line}`).join('\n') + '\n'

const convertBlockquotes = (html) => html.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi,
  (_, content) => quoteLines(markdownFromHtml(content)))

const convertTables = (html) => html.replace(/<table[\s\S]*?<\/table>/gi, (table) => convertTable(table))

const convertHorizontalRules = (html) => html.replace(/<hr[^>]*\/?>/gi, '\n---\n')

const convertParagraphs = (html) => html.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi,
  (_, content) => `\n${stripTags(convertInline(content)).trim()}\n`)

const unwrapContainers = (html) => html.replace(/<\/?(?:div|section|article|main|header|footer|nav|aside)[^>]*>/gi, '\n')

const collapseBlankLines = (markdown) => markdown.replace(/\n{3,}/g, '\n\n')

const trimToOneClosingNewline = (markdown) => markdown.trim() + '\n'

const convertInline = (html) => [
  [/<strong[^>]*>([\s\S]*?)<\/strong>/gi, (_, text) => `**${stripTags(text).trim()}**`],
  [/<b[^>]*>([\s\S]*?)<\/b>/gi, (_, text) => `**${stripTags(text).trim()}**`],
  [/<em[^>]*>([\s\S]*?)<\/em>/gi, (_, text) => `*${stripTags(text).trim()}*`],
  [/<i[^>]*>([\s\S]*?)<\/i>/gi, (_, text) => `*${stripTags(text).trim()}*`],
  [/<code[^>]*>([\s\S]*?)<\/code>/gi, (_, code) => `\`${decodeEntities(stripTags(code))}\``],
  [/<(?:s|strike|del)[^>]*>([\s\S]*?)<\/(?:s|strike|del)>/gi, (_, text) => `~~${stripTags(text).trim()}~~`],
  [/<a[^>]+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, text) => `[${stripTags(text).trim()}](${href})`],
  [/<a[^>]+href='([^']*)'[^>]*>([\s\S]*?)<\/a>/gi, (_, href, text) => `[${stripTags(text).trim()}](${href})`],
  [/<img[^>]+alt="([^"]*)"[^>]+src="([^"]*)"[^>]*\/?>/gi, (_, alt, src) => `![${alt}](${src})`],
  [/<img[^>]+src="([^"]*)"[^>]*\/?>/gi, (_, src) => `![](${src})`],
  [/<br\s*\/?>/gi, '\n'],
  [/<\/?(span|abbr|mark|time|cite|q|small|sub|sup)[^>]*>/gi, '']
].reduce((markdown, [pattern, replacement]) => markdown.replace(pattern, replacement), html)

const convertLists = (html) => {
  let markdown = html
  let previous
  do {
    previous = markdown
    markdown = markdown
      .replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, content) => `\n${convertListItems(content, { ordered: false })}\n`)
      .replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, content) => `\n${convertListItems(content, { ordered: true })}\n`)
  } while (markdown !== previous)
  return markdown
}

const listItemText = (itemHtml) => stripTags(convertInline(itemHtml)).trim().replace(/\n/g, '\n   ')

const convertListItems = (content, { ordered }) => {
  let itemNumber = 0
  const nextBullet = () => {
    itemNumber++
    return ordered ? `${itemNumber}.` : '-'
  }
  return content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, itemHtml) => `${nextBullet()} ${listItemText(itemHtml)}\n`).trim()
}

const tableCellText = (cellHtml) => stripTags(convertInline(cellHtml)).trim().replace(/\|/g, '\\|')

const tableRows = (tableHtml) => [...tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
  .map(([, rowHtml]) => [...rowHtml.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(([, cellHtml]) => tableCellText(cellHtml)))
  .filter((cells) => cells.length)

const convertTable = (tableHtml) => {
  const rows = tableRows(tableHtml)
  if (!rows.length) return ''

  const columnCount = Math.max(...rows.map((cells) => cells.length))
  const pipeRow = (cells) => `| ${[...cells, ...Array(columnCount - cells.length).fill('')].join(' | ')} |`
  const [header, ...body] = rows
  return '\n' + [pipeRow(header), pipeRow(Array(columnCount).fill('---')), ...body.map(pipeRow)].join('\n') + '\n'
}

const stripTags = (html) => html.replace(/<[^>]+>/g, '')

const decodeEntities = (html) => html
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&apos;/g, "'")
  .replace(/&nbsp;/g, ' ')
  .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
  .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
