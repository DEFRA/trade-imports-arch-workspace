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

  it('throws an UNKNOWN HedyError naming the path and the next step on a read error other than a missing file, keeping the read error as the cause', async () => {
    const folder = await tempFolder()
    const env = {}
    const error = readErrorOf(env, folder)
    expect(error).toMatchObject({
      name: 'HedyError',
      code: 'UNKNOWN',
      message: `The .env file at ${folder} could not be read. Check that the path is a regular file with read permission, then run the command again.`
    })
    expect(error.cause.code).toBe('EISDIR')
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

  it('expands a reference to the file value of a name env also holds, leaving the env variable untouched', async () => {
    const path = await envFileHolding('JIRA_TOKEN=$ATLASSIAN_TOKEN\nATLASSIAN_TOKEN=from-file\n')
    const env = { ATLASSIAN_TOKEN: 'from-env' }
    expect(fillEnvFromFile(env, path)).toEqual(['JIRA_TOKEN'])
    expect(env).toEqual({ ATLASSIAN_TOKEN: 'from-env', JIRA_TOKEN: 'from-file' })
  })

  it('expands a reference to a name only env holds to the empty string', async () => {
    const path = await envFileHolding(`BARE=a$SECRETb\nBRACED=a${bracedReference('SECRET')}b\n`)
    const env = { SECRET: 'from-env' }
    expect(fillEnvFromFile(env, path)).toEqual(['BARE', 'BRACED'])
    expect(env).toEqual({ SECRET: 'from-env', BARE: 'a', BRACED: 'ab' })
  })

  it('expands a reference to a name neither env nor the file defines to the empty string', async () => {
    const path = await envFileHolding(`BARE=a$UNKNOWNb\nBRACED=a${bracedReference('UNKNOWN')}b\n`)
    const env = {}
    expect(fillEnvFromFile(env, path)).toEqual(['BARE', 'BRACED'])
    expect(env).toEqual({ BARE: 'a', BRACED: 'ab' })
  })

  it('expands a reference to a name the file does not define but every object inherits to the empty string', async () => {
    const path = await envFileHolding('INHERITED=a$constructor\n')
    const env = {}
    expect(fillEnvFromFile(env, path)).toEqual(['INHERITED'])
    expect(env).toEqual({ INHERITED: 'a' })
  })

  it.each([
    ['a plain line', "JIRA_TOKEN='abc$def'\n"],
    ['an export line with spaces around the equals sign', "  export JIRA_TOKEN = 'abc$def'\n"]
  ])('keeps a single-quoted value literal on %s', async (_, text) => {
    const path = await envFileHolding(`${text}def=expanded\n`)
    const env = {}
    fillEnvFromFile(env, path)
    expect(env.JIRA_TOKEN).toBe('abc$def')
  })

  it('takes the quoting of the last definition of a name', async () => {
    const path = await envFileHolding("JIRA_TOKEN='first'\nJIRA_TOKEN=\"abc$SITE\"\nSITE=defra\n")
    const env = {}
    fillEnvFromFile(env, path)
    expect(env.JIRA_TOKEN).toBe('abcdefra')
  })

  it.each([
    ['a double-quoted value', 'OTHER="x\\$HOME"\nHOME=from-file\n', 'x$HOME'],
    ['an unquoted value', 'OTHER=x\\$HOME\nHOME=from-file\n', 'x$HOME'],
    ['a braced reference', `OTHER="x\\${bracedReference('HOME')}"\nHOME=from-file\n`, `x${bracedReference('HOME')}`]
  ])('reads a backslash before $ in %s as a literal $ and no reference', async (_, text, expected) => {
    const path = await envFileHolding(text)
    const env = {}
    fillEnvFromFile(env, path)
    expect(env.OTHER).toBe(expected)
  })

  it('expands a double-quoted reference', async () => {
    const path = await envFileHolding('JIRA_TOKEN="$ATLASSIAN_TOKEN"\nATLASSIAN_TOKEN=abc\n')
    const env = {}
    fillEnvFromFile(env, path)
    expect(env.JIRA_TOKEN).toBe('abc')
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
