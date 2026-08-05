#!/usr/bin/env node
/**
 * html_to_md.js
 *
 * Converts Confluence export HTML to Markdown.
 * Reads from stdin, writes to stdout. No npm dependencies.
 *
 * Usage:
 *   echo "<h1>Hello</h1>" | node html_to_md.js
 *   cat page.html | node html_to_md.js
 */

'use strict';

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  process.stdout.write(convert(input));
});

function convert(html) {
  let md = html;

  // ── Pre-processing ──────────────────────────────────────────────────────────

  // Normalise line endings
  md = md.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Strip <head>...</head>
  md = md.replace(/<head[\s\S]*?<\/head>/gi, '');

  // Unwrap <html>, <body> wrapper tags (keep inner content)
  md = md.replace(/<\/?(html|body)[^>]*>/gi, '');

  // ── Block elements ──────────────────────────────────────────────────────────

  // Code blocks — handle before inline code to avoid double-processing
  // Confluence wraps code in <pre><code class="language-X">
  md = md.replace(/<pre[^>]*>\s*<code[^>]*class="[^"]*language-(\w+)[^"]*"[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi,
    (_, lang, code) => `\n\`\`\`${lang}\n${decodeEntities(code).trim()}\n\`\`\`\n`);

  // Generic <pre><code> without language
  md = md.replace(/<pre[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi,
    (_, code) => `\n\`\`\`\n${decodeEntities(code).trim()}\n\`\`\`\n`);

  // <pre> without <code>
  md = md.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi,
    (_, code) => `\n\`\`\`\n${decodeEntities(stripTags(code)).trim()}\n\`\`\`\n`);

  // Headings
  for (let i = 6; i >= 1; i--) {
    const hashes = '#'.repeat(i);
    md = md.replace(new RegExp(`<h${i}[^>]*>([\\s\\S]*?)<\\/h${i}>`, 'gi'),
      (_, content) => `\n${hashes} ${stripTags(content).trim()}\n`);
  }

  // Blockquote
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi,
    (_, content) => convert(content).split('\n').map(l => `> ${l}`).join('\n') + '\n');

  // Tables — simple pass converting rows to pipe syntax
  md = md.replace(/<table[\s\S]*?<\/table>/gi, table => convertTable(table));

  // Horizontal rule
  md = md.replace(/<hr[^>]*\/?>/gi, '\n---\n');

  // Lists — convert recursively then flatten
  md = convertLists(md);

  // Paragraphs
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi,
    (_, content) => `\n${stripTags(convertInline(content)).trim()}\n`);

  // Divs / sections — pass through content
  md = md.replace(/<\/?(?:div|section|article|main|header|footer|nav|aside)[^>]*>/gi, '\n');

  // ── Inline elements ─────────────────────────────────────────────────────────

  md = convertInline(md);

  // ── Strip remaining tags ────────────────────────────────────────────────────

  md = stripTags(md);

  // ── Entity decoding ─────────────────────────────────────────────────────────

  md = decodeEntities(md);

  // ── Whitespace cleanup ──────────────────────────────────────────────────────

  // Collapse 3+ blank lines to 2
  md = md.replace(/\n{3,}/g, '\n\n');

  // Trim leading/trailing whitespace
  md = md.trim();

  return md + '\n';
}

// ── Inline conversion ─────────────────────────────────────────────────────────

function convertInline(html) {
  let md = html;

  // Bold — strong before b to avoid partial matches
  md = md.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, (_, c) => `**${stripTags(c).trim()}**`);
  md = md.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, (_, c) => `**${stripTags(c).trim()}**`);

  // Italic
  md = md.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, (_, c) => `*${stripTags(c).trim()}*`);
  md = md.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, (_, c) => `*${stripTags(c).trim()}*`);

  // Inline code
  md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_, c) => `\`${decodeEntities(stripTags(c))}\``);

  // Strikethrough
  md = md.replace(/<(?:s|strike|del)[^>]*>([\s\S]*?)<\/(?:s|strike|del)>/gi,
    (_, c) => `~~${stripTags(c).trim()}~~`);

  // Links — preserve href
  md = md.replace(/<a[^>]+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
    (_, href, text) => `[${stripTags(text).trim()}](${href})`);

  // Links with single quotes
  md = md.replace(/<a[^>]+href='([^']*)'[^>]*>([\s\S]*?)<\/a>/gi,
    (_, href, text) => `[${stripTags(text).trim()}](${href})`);

  // Images
  md = md.replace(/<img[^>]+alt="([^"]*)"[^>]+src="([^"]*)"[^>]*\/?>/gi,
    (_, alt, src) => `![${alt}](${src})`);
  md = md.replace(/<img[^>]+src="([^"]*)"[^>]*\/?>/gi,
    (_, src) => `![](${src})`);

  // Line break
  md = md.replace(/<br\s*\/?>/gi, '\n');

  // Span / abbr / mark — strip tag, keep content
  md = md.replace(/<\/?(span|abbr|mark|time|cite|q|small|sub|sup)[^>]*>/gi, '');

  return md;
}

// ── List conversion ───────────────────────────────────────────────────────────

function convertLists(html) {
  // Process lists from innermost outward using a depth counter
  let md = html;
  let prev;
  do {
    prev = md;
    // Unordered list
    md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, content) => {
      return '\n' + convertListItems(content, false) + '\n';
    });
    // Ordered list
    md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, content) => {
      return '\n' + convertListItems(content, true) + '\n';
    });
  } while (md !== prev);

  return md;
}

function convertListItems(content, ordered) {
  let counter = 0;
  return content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, itemContent) => {
    counter++;
    const bullet = ordered ? `${counter}.` : '-';
    const text = stripTags(convertInline(itemContent)).trim().replace(/\n/g, '\n   ');
    return `${bullet} ${text}\n`;
  }).trim();
}

// ── Table conversion ──────────────────────────────────────────────────────────

function convertTable(tableHtml) {
  const rows = [];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;

  while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
    const cells = [];
    const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
      cells.push(stripTags(convertInline(cellMatch[1])).trim().replace(/\|/g, '\\|'));
    }
    if (cells.length) rows.push(cells);
  }

  if (!rows.length) return '';

  const colCount = Math.max(...rows.map(r => r.length));
  const pad = (row) => {
    while (row.length < colCount) row.push('');
    return row;
  };

  const lines = [];
  rows.forEach((row, i) => {
    lines.push('| ' + pad(row).join(' | ') + ' |');
    if (i === 0) {
      lines.push('| ' + Array(colCount).fill('---').join(' | ') + ' |');
    }
  });

  return '\n' + lines.join('\n') + '\n';
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function stripTags(html) {
  return html.replace(/<[^>]+>/g, '');
}

function decodeEntities(html) {
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}
