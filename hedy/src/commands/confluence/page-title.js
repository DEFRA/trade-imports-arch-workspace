import { basename, extname } from 'node:path'

const frontmatterTitle = (text) => {
  const match = text.match(/^---\s*\ntitle:\s*(.+?)\s*\n/)
  return match?.[1].trim().replace(/^["']|["']$/g, '')
}

const headingTitle = (text) => text.match(/^#\s+(.+?)$/m)?.[1].trim()

const fileNameTitle = (filePath) =>
  basename(filePath, extname(filePath)).replace(/-/g, ' ').replace(/adr/gi, 'ADR-')

/**
 * Returns the title the publisher gives the page: the frontmatter title on the
 * line after the opening fence, without one leading and one trailing quote, when
 * not empty; else the first level-one heading; else the file's base name without
 * its extension, with each - as a space and each adr, in any case, as ADR-.
 *
 * @param {string} text the page's markdown
 * @param {string} filePath the page's path
 * @returns {string}
 */
export const titleOf = (text, filePath) => frontmatterTitle(text) || headingTitle(text) || fileNameTitle(filePath)
