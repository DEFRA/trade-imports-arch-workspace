import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, it, expect } from 'vitest'
import { rejectionOf } from '../../test-support/http.js'
import { isSecretPath, parseJsonText, pathInside, readTextFile } from './files.js'

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

  const writeSecretsFile = async () => {
    const realFolder = await realpath(folder)
    const secretsPath = join(realFolder, '.env')
    await writeFile(secretsPath, 'JIRA_TOKEN=abc\n')
    return { realFolder, secretsPath }
  }

  it('refuses a secrets file with USAGE naming the kind and the path once, without the file\'s values', async () => {
    const { secretsPath } = await writeSecretsFile()
    const error = await rejectionOf(readTextFile(secretsPath, { kind: 'notes file', missing: () => 'missing' }))
    expect(error.code).toBe('USAGE')
    expect(error.message).toBe(`The notes file at ${secretsPath} is a secrets file that hedy never reads. Give the path of a notes file that holds no secrets, then run the command again.`)
    expect(error.message).not.toContain('abc')
  })

  it('refuses a link to a secrets file with USAGE naming the link path and the real path, without the file\'s values', async () => {
    const { realFolder, secretsPath } = await writeSecretsFile()
    const linkPath = join(realFolder, 'notes.txt')
    await symlink(secretsPath, linkPath)
    const error = await rejectionOf(readTextFile(linkPath, { kind: 'notes file', missing: () => 'missing' }))
    expect(error.code).toBe('USAGE')
    expect(error.message).toBe(`The notes file at ${linkPath} is ${secretsPath}, a secrets file that hedy never reads. Give the path of a notes file that holds no secrets, then run the command again.`)
    expect(error.message).not.toContain('abc')
  })

  it('returns the text of a link to a file that holds no secrets', async () => {
    const realFolder = await realpath(folder)
    await writeFile(join(realFolder, 'notes.txt'), 'line one\n')
    await symlink(join(realFolder, 'notes.txt'), join(realFolder, 'link.txt'))
    expect(await readTextFile(join(realFolder, 'link.txt'), { kind: 'notes file', missing: () => 'missing' })).toBe('line one\n')
  })
})

describe('isSecretPath', () => {
  it.each([
    '.env',
    '.env.local',
    'sub/.env.production',
    'production.env',
    'my.env.txt',
    '.npmrc',
    '.netrc',
    'credentials',
    'credentials.json',
    'secrets',
    'secrets.yaml',
    '.aws/config',
    '.ssh/id_ed25519',
    'home/.ssh/keys/one'
  ])('is true for the real path <tmp>/%s, as the Bash guard\'s patterns are', (relativePath) => {
    expect(isSecretPath(join(folder, relativePath))).toBe(true)
  })

  it.each([
    'notes.txt',
    'environment.md',
    'release.environment',
    'dotenv-guide.md',
    '.envrc',
    'credentials-guide.md',
    'aws/config',
    '.env.d/one',
    'defra.env.staging/docs/page.md'
  ])('is false for the real path <tmp>/%s, since the .env patterns apply to the file name and not to its folders', (relativePath) => {
    expect(isSecretPath(join(folder, relativePath))).toBe(false)
  })
})

describe('pathInside', () => {
  it.each([
    [join('a', 'b'), 'b'],
    [join('a', 'b', 'c'), 'b/c']
  ])('gives the / separated path of <tmp>/%s inside <tmp>/a', (relativePath, expected) => {
    expect(pathInside(join(folder, 'a'), join(folder, relativePath))).toBe(expected)
  })

  it.each(['a', 'ab/c', '', 'other/a/b'])('is undefined for <tmp>/%s, which is not inside <tmp>/a', (relativePath) => {
    expect(pathInside(join(folder, 'a'), join(folder, relativePath))).toBeUndefined()
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
