import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { afterEach, describe, it, expect } from 'vitest'
import { isHedyError } from './errors.js'
import { createWorkspace } from './test-support/cli.js'
import { resolveWorkspaceRoot } from './workspace-root.js'

const created = []

const workspace = async (options) => {
  const root = await createWorkspace(options)
  created.push(root)
  return root
}

const emptyHome = async () => {
  const home = await mkdtemp(join(tmpdir(), 'hedy-home-'))
  created.push(home)
  return home
}

const homeWithCanonical = async (options) => {
  const home = await emptyHome()
  const canonical = await createWorkspace({ ...options, at: join(home, 'trade-imports-arch-workspace') })
  return { home, canonical }
}

const refusalOf = (resolveOptions) => {
  try {
    resolveWorkspaceRoot(resolveOptions)
  } catch (error) {
    return error
  }
  throw new Error('expected resolveWorkspaceRoot to refuse')
}

afterEach(async () => {
  await Promise.all(created.splice(0).map((path) => rm(path, { recursive: true, force: true })))
})

describe('resolveWorkspaceRoot order', () => {
  it('prefers the --workspace value over HEDY_WORKSPACE and the default location', async () => {
    const flag = await workspace()
    const fromEnv = await workspace()
    const { home } = await homeWithCanonical()
    expect(resolveWorkspaceRoot({ workspace: flag, env: { HEDY_WORKSPACE: fromEnv }, homedir: home })).toBe(flag)
  })

  it('uses HEDY_WORKSPACE over the default location when no --workspace value is given', async () => {
    const fromEnv = await workspace()
    const { home } = await homeWithCanonical()
    expect(resolveWorkspaceRoot({ env: { HEDY_WORKSPACE: fromEnv }, homedir: home })).toBe(fromEnv)
  })

  it('falls back to trade-imports-arch-workspace under the home folder', async () => {
    const { home, canonical } = await homeWithCanonical()
    expect(resolveWorkspaceRoot({ env: {}, homedir: home })).toBe(canonical)
  })

  it('treats an empty HEDY_WORKSPACE as unset', async () => {
    const { home, canonical } = await homeWithCanonical()
    expect(resolveWorkspaceRoot({ env: { HEDY_WORKSPACE: '' }, homedir: home })).toBe(canonical)
  })

  it('returns an absolute path for a --workspace value relative to the current folder', async () => {
    const root = await workspace()
    expect(resolveWorkspaceRoot({ workspace: relative(process.cwd(), root), env: {} })).toBe(root)
  })
})

describe('resolveWorkspaceRoot refusal', () => {
  it.each([
    ['a .claude folder', { claudeFolder: false }, 'it has no .claude folder.'],
    ['a Makefile', { makefile: false }, 'it has no Makefile.'],
    ['both', { claudeFolder: false, makefile: false }, 'it has no .claude folder and no Makefile.']
  ])('refuses a --workspace folder lacking %s with a USAGE error naming the path and what is missing', async (_label, parts, lacks) => {
    const root = await workspace(parts)
    const error = refusalOf({ workspace: root, env: {} })
    expect(isHedyError(error)).toBe(true)
    expect(error.code).toBe('USAGE')
    expect(error.message).toBe(`The folder ${root}, from --workspace, is not a workspace because ${lacks} Pass --workspace the path of a workspace checkout.`)
  })

  it('refuses a --workspace path that does not exist with a USAGE error naming it', () => {
    const error = refusalOf({ workspace: '/nonexistent', env: {} })
    expect(error.code).toBe('USAGE')
    expect(error.message).toContain('The folder /nonexistent, from --workspace,')
  })

  it('refuses a HEDY_WORKSPACE folder lacking a Makefile and says how to fix the variable', async () => {
    const root = await workspace({ makefile: false })
    const error = refusalOf({ env: { HEDY_WORKSPACE: root } })
    expect(error.code).toBe('USAGE')
    expect(error.message).toContain(`The folder ${root}, from HEDY_WORKSPACE,`)
    expect(error.message).toContain('Set HEDY_WORKSPACE to the path of a workspace checkout, or unset it.')
  })

  it('refuses a missing default location, naming it and giving the ln -s line', async () => {
    const home = await emptyHome()
    const error = refusalOf({ env: {}, homedir: home })
    expect(error.code).toBe('USAGE')
    expect(error.message).toContain(`The folder ${join(home, 'trade-imports-arch-workspace')}, from the default location,`)
    expect(error.message).toContain('ln -s <your-checkout> ~/trade-imports-arch-workspace')
  })

  it('refuses a default location whose .claude is a file, not a folder', async () => {
    const { home, canonical } = await homeWithCanonical({ claudeFolder: false })
    await writeFile(join(canonical, '.claude'), '')
    expect(refusalOf({ env: {}, homedir: home }).message).toContain('it has no .claude folder.')
  })

  it('refuses a default location whose Makefile is a folder, not a file', async () => {
    const { home, canonical } = await homeWithCanonical({ makefile: false })
    await createWorkspace({ at: join(canonical, 'Makefile'), claudeFolder: false, makefile: false })
    expect(refusalOf({ env: {}, homedir: home }).message).toContain('it has no Makefile.')
  })
})
