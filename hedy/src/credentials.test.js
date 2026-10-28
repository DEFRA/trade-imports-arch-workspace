import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, it, expect } from 'vitest'
import { loadCredentials } from './credentials.js'
import { isHedyError } from './errors.js'

let root

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'hedy-credentials-'))
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

const workspaceRoot = () => root

const writeEnvFile = (lines) => writeFile(join(root, '.env'), `${lines.join('\n')}\n`)

const thrownBy = (action) => {
  try {
    action()
  } catch (error) {
    return error
  }
  throw new Error('expected the call to throw')
}

describe('loadCredentials', () => {
  it('returns the credentials from the workspace .env and sets them in env when env holds none', async () => {
    await writeEnvFile(['JIRA_USER=file-user', 'JIRA_TOKEN=file-token', 'JIRA_BASE_URL=https://file.example'])
    const env = {}
    expect(loadCredentials({ env, workspaceRoot })).toEqual({
      user: 'file-user',
      token: 'file-token',
      baseUrl: 'https://file.example'
    })
    expect(env).toEqual({
      JIRA_USER: 'file-user',
      JIRA_TOKEN: 'file-token',
      JIRA_BASE_URL: 'https://file.example'
    })
  })

  it('returns the token from env over the token in the workspace .env', async () => {
    await writeEnvFile(['JIRA_USER=file-user', 'JIRA_TOKEN=file-token', 'JIRA_BASE_URL=https://file.example'])
    expect(loadCredentials({ env: { JIRA_TOKEN: 'env-token' }, workspaceRoot })).toEqual({
      user: 'file-user',
      token: 'env-token',
      baseUrl: 'https://file.example'
    })
  })

  it('throws one AUTH error naming all three variables when there is no .env and env holds none', () => {
    const error = thrownBy(() => loadCredentials({ env: {}, workspaceRoot }))
    expect(isHedyError(error)).toBe(true)
    expect(error.code).toBe('AUTH')
    expect(error.message).toContain('JIRA_USER, JIRA_TOKEN and JIRA_BASE_URL are not set')
  })

  it('throws an UNKNOWN error naming the .env path when that path is a folder', async () => {
    const envPath = join(root, '.env')
    await mkdir(envPath)
    const error = thrownBy(() => loadCredentials({ env: {}, workspaceRoot }))
    expect(isHedyError(error)).toBe(true)
    expect(error.code).toBe('UNKNOWN')
    expect(error.message).toContain(envPath)
  })
})
