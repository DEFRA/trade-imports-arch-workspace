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
})
