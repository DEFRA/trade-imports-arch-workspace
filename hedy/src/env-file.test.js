import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, it, expect } from 'vitest'
import { fillEnvFromFile } from './env-file.js'

const created = []

const tempFolder = async () => {
  const folder = await mkdtemp(join(tmpdir(), 'hedy-env-'))
  created.push(folder)
  return folder
}

const envFileHolding = async (text) => {
  const path = join(await tempFolder(), '.env')
  await writeFile(path, text)
  return path
}

const bracedReference = (name) => '$' + '{' + name + '}'

const readErrorOf = (env, path) => {
  try {
    fillEnvFromFile(env, path)
  } catch (error) {
    return error
  }
  throw new Error('expected fillEnvFromFile to throw')
}

afterEach(async () => {
  await Promise.all(created.splice(0).map((path) => rm(path, { recursive: true, force: true })))
})

describe('fillEnvFromFile', () => {
  it('sets each variable absent from env and returns their names sorted', async () => {
    const path = await envFileHolding('BETA=2\nALPHA=1\nGAMMA=3\n')
    const env = {}
    expect(fillEnvFromFile(env, path)).toEqual(['ALPHA', 'BETA', 'GAMMA'])
    expect(env).toEqual({ BETA: '2', ALPHA: '1', GAMMA: '3' })
  })

  it('leaves a variable already in env untouched, including one set to the empty string', async () => {
    const path = await envFileHolding('KEPT=from-file\nEMPTY=from-file\nZADDED=from-file\nADDED=from-file\n')
    const env = { KEPT: 'from-env', EMPTY: '' }
    expect(fillEnvFromFile(env, path)).toEqual(['ADDED', 'ZADDED'])
    expect(env).toEqual({ KEPT: 'from-env', EMPTY: '', ADDED: 'from-file', ZADDED: 'from-file' })
  })

  it('returns no names and sets nothing when the file is missing', async () => {
    const path = join(await tempFolder(), '.env')
    const env = { KEPT: 'from-env' }
    expect(fillEnvFromFile(env, path)).toEqual([])
    expect(env).toEqual({ KEPT: 'from-env' })
  })

  it('rethrows a read error other than a missing file', async () => {
    const folder = await tempFolder()
    const env = {}
    expect(readErrorOf(env, folder).code).toBe('EISDIR')
    expect(env).toEqual({})
  })

  it('parses an export line, a double-quoted value with a space and skips a comment line', async () => {
    const path = await envFileHolding('# a comment\nexport EXPORTED=yes\nQUOTED="two words"\n')
    const env = {}
    expect(fillEnvFromFile(env, path)).toEqual(['EXPORTED', 'QUOTED'])
    expect(env).toEqual({ EXPORTED: 'yes', QUOTED: 'two words' })
  })

  it('expands a $NAME reference to a name defined on a later line and sets both names', async () => {
    const path = await envFileHolding('JIRA_TOKEN=$ATLASSIAN_TOKEN\nATLASSIAN_TOKEN=abc\n')
    const env = {}
    expect(fillEnvFromFile(env, path)).toEqual(['ATLASSIAN_TOKEN', 'JIRA_TOKEN'])
    expect(env).toEqual({ ATLASSIAN_TOKEN: 'abc', JIRA_TOKEN: 'abc' })
  })

  it('expands a braced reference', async () => {
    const path = await envFileHolding(`JIRA_TOKEN=${bracedReference('ATLASSIAN_TOKEN')}\nATLASSIAN_TOKEN=abc\n`)
    const env = {}
    expect(fillEnvFromFile(env, path)).toEqual(['ATLASSIAN_TOKEN', 'JIRA_TOKEN'])
    expect(env).toEqual({ ATLASSIAN_TOKEN: 'abc', JIRA_TOKEN: 'abc' })
  })

  it('expands a referenced value that itself holds a reference', async () => {
    const path = await envFileHolding(`FIRST=$SECOND\nSECOND=${bracedReference('THIRD')}!\nTHIRD=deep\n`)
    const env = {}
    expect(fillEnvFromFile(env, path)).toEqual(['FIRST', 'SECOND', 'THIRD'])
    expect(env).toEqual({ FIRST: 'deep!', SECOND: 'deep!', THIRD: 'deep' })
  })

  it('expands a reference to a name env holds to the env value, even when the file defines that name', async () => {
    const path = await envFileHolding('JIRA_TOKEN=$ATLASSIAN_TOKEN\nATLASSIAN_TOKEN=from-file\n')
    const env = { ATLASSIAN_TOKEN: 'from-env' }
    expect(fillEnvFromFile(env, path)).toEqual(['JIRA_TOKEN'])
    expect(env).toEqual({ ATLASSIAN_TOKEN: 'from-env', JIRA_TOKEN: 'from-env' })
  })

  it('expands a reference to a name neither env nor the file defines to the empty string', async () => {
    const path = await envFileHolding(`BARE=a$UNKNOWNb\nBRACED=a${bracedReference('UNKNOWN')}b\n`)
    const env = {}
    expect(fillEnvFromFile(env, path)).toEqual(['BARE', 'BRACED'])
    expect(env).toEqual({ BARE: 'a', BRACED: 'ab' })
  })

  it('expands a reference inside a longer value in place', async () => {
    const path = await envFileHolding('JIRA_BASE_URL=https://$SITE.atlassian.net\nSITE=defra\n')
    const env = {}
    expect(fillEnvFromFile(env, path)).toEqual(['JIRA_BASE_URL', 'SITE'])
    expect(env).toEqual({ JIRA_BASE_URL: 'https://defra.atlassian.net', SITE: 'defra' })
  })

  it.each([
    ['a digit', 'COST=cost $1\n', 'cost $1'],
    ['a space', 'COST="cost $ 1"\n', 'cost $ 1'],
    ['the end of the value', 'COST=cost$\n', 'cost$']
  ])('keeps a $ followed by %s literal', async (_, text, expected) => {
    const path = await envFileHolding(text)
    const env = {}
    expect(fillEnvFromFile(env, path)).toEqual(['COST'])
    expect(env).toEqual({ COST: expected })
  })

  it('expands each name in a two-line reference cycle to the empty string', async () => {
    const path = await envFileHolding('FIRST=$SECOND\nSECOND=$FIRST\n')
    const env = {}
    expect(fillEnvFromFile(env, path)).toEqual(['FIRST', 'SECOND'])
    expect(env).toEqual({ FIRST: '', SECOND: '' })
  })
})
