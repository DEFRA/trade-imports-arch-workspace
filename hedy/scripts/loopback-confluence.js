// A loopback Confluence for capturing the publisher's log as fixtures.
// Usage: node loopback-confluence.js <capture folder>
// The folder holds tls/key.pem and tls/cert.pem, and a file named scenario
// whose text picks the answers: updated, created, skipped-no-label,
// upload-failed or broken-link. Every request is appended to requests.log
// in the folder, and ports.json records the https and http ports.
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer as createPlainServer } from 'node:http'
import { createServer as createSecureServer } from 'node:https'
import { join } from 'node:path'

const base = process.argv[2]
const scenario = () => readFileSync(join(base, 'scenario'), 'utf8').trim()
const log = (line) => appendFileSync(join(base, 'requests.log'), `${line}\n`)

const titles = { 101: 'Guide', 201: 'Publishing guide', 202: 'Components', 203: 'Figures', 204: 'Links', 301: 'Publishing guide' }
const idByTitle = (title) => Object.keys(titles).find((id) => titles[id] === title && id !== '301')

let origin = 'https://127.0.0.1'

const labelsFor = (id) => (scenario() === 'skipped-no-label' && id === '201')
  ? []
  : [{ prefix: 'global', name: 'generated', id: '9001', label: 'generated' }]

const adfFor = (id) => {
  const link = (href, text) => ({ type: 'paragraph', content: [{ type: 'text', text, marks: [{ type: 'link', attrs: { href } }] }] })
  if (id === '204' && scenario() === 'broken-link') {
    return { type: 'doc', version: 1, content: [link(`${origin}/wiki/spaces/HEDYDOCS/pages/999`, 'unlisted notes')] }
  }
  if (id === '201' || id === '301') {
    return { type: 'doc', version: 1, content: [link(`${origin}/wiki/spaces/HEDYDOCS/pages/202`, 'components page')] }
  }
  return { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Synthetic.' }] }] }
}

const pageBody = (id) => ({
  id,
  type: 'page',
  status: 'current',
  title: titles[id],
  space: { key: 'HEDYDOCS' },
  version: { number: 3, when: '2026-10-28T09:00:00.000Z', by: { displayName: 'Hedy Tester' } },
  ancestors: [],
  metadata: { labels: { results: labelsFor(id), start: 0, limit: 100, size: labelsFor(id).length } },
  body: {
    storage: { value: '<p>Synthetic.</p>', representation: 'storage' },
    atlas_doc_format: { value: JSON.stringify(adfFor(id)), representation: 'atlas_doc_format' }
  },
  _links: { webui: `/spaces/HEDYDOCS/pages/${id}` }
})

const exists = (title) => {
  const id = idByTitle(title)
  if (!id) return undefined
  if (scenario() === 'created' && id === '201') return undefined
  return id
}

const attachmentAnswer = () => scenario() === 'upload-failed'
  ? [500, { statusCode: 500, message: 'Internal server error' }]
  : [200, { results: [{ id: 'att90001', type: 'attachment', status: 'current', title: 'flow.svg', version: { number: 2 }, extensions: { mediaType: 'image/svg+xml', fileId: 'file-0001' } }], size: 1 }]

const routes = [
  ['GET', /^\/wiki\/rest\/api\/space(\?|$)/, () => [200, { results: [], start: 0, limit: 1, size: 0 }]],
  ['GET', /^\/wiki\/rest\/api\/user\/current/, () => [200, { type: 'known', displayName: 'Hedy Tester' }]],
  ['GET', /^\/wiki\/rest\/api\/content\/search\?/, () => [200, { results: [], start: 0, limit: 25, size: 0 }]],
  ['GET', /^\/wiki\/rest\/api\/content\?/, (url) => {
    const id = exists(url.searchParams.get('title'))
    return [200, { results: id ? [pageBody(id)] : [], start: 0, limit: 25, size: id ? 1 : 0 }]
  }],
  ['GET', /^\/wiki\/rest\/api\/content\/(\d+)\/label/, (url, match) => [200, { results: labelsFor(match[1]), start: 0, limit: 100, size: labelsFor(match[1]).length }]],
  ['POST', /^\/wiki\/rest\/api\/content\/(\d+)\/label/, () => [200, { results: [{ prefix: 'global', name: 'generated', id: '9001' }], size: 1 }]],
  ['GET', /^\/wiki\/rest\/api\/content\/(\d+)\/child\/attachment/, () => [200, { results: [], size: 0 }]],
  ['PUT', /^\/wiki\/rest\/api\/content\/(\d+)\/child\/attachment/, attachmentAnswer],
  ['GET', /^\/wiki\/rest\/api\/content\/(\d+)(\?|$)/, (url, match) => titles[match[1]]
    ? [200, pageBody(match[1])]
    : [404, { statusCode: 404, message: `No content found with id: ${match[1]}` }]],
  ['PUT', /^\/wiki\/rest\/api\/content\/(\d+)(\?|$)/, (url, match) => [200, pageBody(match[1])]],
  ['POST', /^\/wiki\/rest\/api\/content(\?|$)/, (url, match, body) => [201, { ...pageBody('301'), title: body?.title ?? 'Publishing guide', version: { number: 1 } }]],
  ['DELETE', /./, () => [204, null]]
]

const readBody = (request) => new Promise((resolve) => {
  const chunks = []
  request.on('data', (chunk) => chunks.push(chunk))
  request.on('end', () => {
    const text = Buffer.concat(chunks).toString('utf8')
    if (!/application\/json/.test(request.headers['content-type'] ?? '')) return resolve(undefined)
    try {
      resolve(JSON.parse(text))
    } catch {
      resolve(undefined)
    }
  })
})

const handle = async (request, response) => {
  const body = await readBody(request)
  const url = new URL(request.url, origin)
  const pathAndQuery = `${url.pathname}${url.search}`
  const route = routes.find(([method, pattern]) => method === request.method && pattern.test(pathAndQuery))
  const match = route ? pathAndQuery.match(route[1]) : null
  const [status, answer] = route ? route[2](url, match, body) : [404, { statusCode: 404, message: 'unmatched' }]
  log(`${scenario()} ${request.method} ${request.url} -> ${status}${route ? '' : ' UNMATCHED'} auth=${request.headers.authorization ? 'basic' : 'none'}`)
  response.writeHead(status, { 'content-type': 'application/json' })
  response.end(answer === null ? undefined : JSON.stringify(answer))
}

const tls = { key: readFileSync(join(base, 'tls/key.pem')), cert: readFileSync(join(base, 'tls/cert.pem')) }
const secure = createSecureServer(tls, handle)
const plain = createPlainServer(handle)
secure.listen(0, '127.0.0.1', () => {
  origin = `https://127.0.0.1:${secure.address().port}`
  plain.listen(0, '127.0.0.1', () => {
    writeFileSync(join(base, 'ports.json'), JSON.stringify({ https: secure.address().port, http: plain.address().port }))
    console.log(`listening https ${secure.address().port} http ${plain.address().port}`)
  })
})
