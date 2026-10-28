import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, it, expect } from 'vitest'
import { rejectionOf } from '../../test-support/http.js'
import { parseJsonText, readTextFile } from './files.js'

let folder

beforeEach(async () => {
  folder = await mkdtemp(join(tmpdir(), 'hedy-files-'))
})

afterEach(async () => {
  await rm(folder, { recursive: true, force: true })
})

describe('readTextFile', () => {
  it('returns the text of a readable file', async () => {
    const path = join(folder, 'notes.txt')
    await writeFile(path, 'line one\nline two\n')
    expect(await readTextFile(path, { kind: 'notes file', missing: () => 'missing' })).toBe('line one\nline two\n')
  })

  it('returns what missing returns for a missing file, passing missing the ENOENT error', async () => {
    const path = join(folder, 'missing.txt')
    expect(await readTextFile(path, { kind: 'notes file', missing: (error) => `missing: ${error.code}` })).toBe('missing: ENOENT')
  })

  it('refuses a folder at the path with UNKNOWN naming the kind and the path, keeping the read error as the cause', async () => {
    const path = join(folder, 'notes.txt')
    await mkdir(path)
    const error = await rejectionOf(readTextFile(path, { kind: 'notes file', missing: () => 'missing' }))
    expect(error.code).toBe('UNKNOWN')
    expect(error.message).toBe(`The notes file at ${path} could not be read. Check that the path is a regular file with read permission, then run the command again.`)
    expect(error.cause.code).toBe('EISDIR')
  })
})

describe('parseJsonText', () => {
  const where = { kind: 'notes file', path: '/tmp/notes.json', nextStep: 'Fix the notes, then run the command again.' }

  it('returns the parsed value of JSON text', () => {
    expect(parseJsonText('{"a":[1,null]}', where)).toEqual({ a: [1, null] })
  })

  it('refuses text that is not JSON with USAGE naming the kind, the path and the next step, keeping the parse error as the cause', async () => {
    const error = await rejectionOf((async () => parseJsonText('not json', where))())
    expect(error.code).toBe('USAGE')
    expect(error.message).toBe('The notes file at /tmp/notes.json is not JSON. Fix the notes, then run the command again.')
    expect(error.cause).toBeInstanceOf(SyntaxError)
  })
})
