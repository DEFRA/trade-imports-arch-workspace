import { readFile } from 'node:fs/promises'
import { describe, it, expect } from 'vitest'
import { markdownFromHtml } from './html-to-markdown.js'

const readFixture = (name) => readFile(new URL(`./__fixtures__/${name}`, import.meta.url), 'utf8')

describe('markdownFromHtml', () => {
  it('converts the captured Confluence body to the captured markdown byte for byte', async () => {
    const [html, markdown] = await Promise.all([readFixture('confluence-body.html'), readFixture('confluence-body.md')])
    expect(markdownFromHtml(html)).toBe(markdown)
  })

  it.each([
    { rule: 'an h2 becomes a ## heading', html: '<h2>Title</h2>', markdown: '## Title\n' },
    { rule: 'strong becomes ** emphasis', html: '<strong>bold</strong>', markdown: '**bold**\n' },
    { rule: 'b becomes ** emphasis', html: '<b>bold</b>', markdown: '**bold**\n' },
    { rule: 'em becomes * emphasis', html: '<em>stress</em>', markdown: '*stress*\n' },
    { rule: 'code becomes backticks with its entities decoded', html: '<code>a &amp;&amp; b</code>', markdown: '`a && b`\n' },
    { rule: 'pre code with a language class becomes a fence naming the language', html: '<pre><code class="language-js">const a = 1</code></pre>', markdown: '```js\nconst a = 1\n```\n' },
    { rule: 'a with href becomes a link', html: '<a href="https://example.test/page">a page</a>', markdown: '[a page](https://example.test/page)\n' },
    { rule: 'img with alt then src becomes an image', html: '<img alt="diagram" src="/diagram.png" />', markdown: '![diagram](/diagram.png)\n' },
    { rule: 'ul items become - items', html: '<ul><li>one</li><li>two</li></ul>', markdown: '- one\n- two\n' },
    { rule: 'ol items become numbered items', html: '<ol><li>one</li><li>two</li></ol>', markdown: '1. one\n2. two\n' },
    { rule: 'a two-row table becomes a pipe table with a separator row', html: '<table><tr><th>Name</th><th>Value</th></tr><tr><td>timeout</td><td>30</td></tr></table>', markdown: '| Name | Value |\n| --- | --- |\n| timeout | 30 |\n' },
    { rule: 'blockquote becomes > lines', html: '<blockquote><p>one</p><p>two</p></blockquote>', markdown: '> one\n> \n> two\n>\n' },
    { rule: 'br becomes a newline', html: 'a<br>b<br />c', markdown: 'a\nb\nc\n' },
    { rule: 'hr becomes ---', html: '<hr />', markdown: '---\n' },
    { rule: '&amp; decodes to &', html: 'a &amp; b', markdown: 'a & b\n' },
    { rule: '&#39; decodes to an apostrophe', html: 'it&#39;s', markdown: 'it\'s\n' },
    { rule: '&#x27; decodes to an apostrophe', html: 'it&#x27;s', markdown: 'it\'s\n' },
    { rule: 'three blank lines collapse to one', html: 'a\n\n\n\nb', markdown: 'a\n\nb\n' },
    { rule: 'surrounding whitespace trims to exactly one closing newline', html: '\n\n<p>text</p>\n\n\n', markdown: 'text\n' }
  ])('$rule', ({ html, markdown }) => {
    expect(markdownFromHtml(html)).toBe(markdown)
  })
})
