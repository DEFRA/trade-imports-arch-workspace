import { realpath, rm, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
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
  it('prefers the --workspace value over the checkout hedy runs from', async () => {
    const flag = await workspace()
    const checkout = await workspace()
    expect(resolveWorkspaceRoot({ workspace: flag, checkoutRoot: checkout })).toBe(flag)
  })

  it('uses the checkout hedy runs from when no --workspace value is given', async () => {
    const checkout = await workspace()
    expect(resolveWorkspaceRoot({ checkoutRoot: checkout })).toBe(checkout)
  })

  it('defaults to the real path of the checkout that holds the hedy source', async () => {
    const checkout = await realpath(fileURLToPath(new URL('../..', import.meta.url)))
    expect(resolveWorkspaceRoot()).toBe(checkout)
  })

  it('returns an absolute path for a --workspace value relative to the current folder', async () => {
    const root = await workspace()
    expect(resolveWorkspaceRoot({ workspace: relative(process.cwd(), root) })).toBe(root)
  })
})

describe('resolveWorkspaceRoot refusal', () => {
  it.each([
    ['a .claude folder', { claudeFolder: false }, 'it has no .claude folder.'],
    ['a Makefile', { makefile: false }, 'it has no Makefile.'],
    ['both', { claudeFolder: false, makefile: false }, 'it has no .claude folder and no Makefile.']
  ])('refuses a --workspace folder lacking %s with a USAGE error naming the path and what is missing', async (_label, parts, lacks) => {
    const root = await workspace(parts)
    const error = refusalOf({ workspace: root })
    expect(isHedyError(error)).toBe(true)
    expect(error.code).toBe('USAGE')
    expect(error.message).toBe(`The folder ${root}, from --workspace, is not a workspace because ${lacks} Pass --workspace the path of a workspace checkout.`)
  })

  it('refuses a --workspace path that does not exist with a USAGE error naming it', () => {
    const error = refusalOf({ workspace: '/nonexistent' })
    expect(error.code).toBe('USAGE')
    expect(error.message).toContain('The folder /nonexistent, from --workspace,')
  })

  it('refuses a checkout lacking a Makefile, naming it and giving make install or --workspace as the next step', async () => {
    const checkout = await workspace({ makefile: false })
    const error = refusalOf({ checkoutRoot: checkout })
    expect(error.code).toBe('USAGE')
    expect(error.message).toBe(`The folder ${checkout}, from the checkout hedy runs from, is not a workspace because it has no Makefile. Install hedy from a workspace checkout with make install, or pass --workspace.`)
  })

  it('refuses a checkout whose .claude is a file, not a folder', async () => {
    const checkout = await workspace({ claudeFolder: false })
    await writeFile(join(checkout, '.claude'), '')
    expect(refusalOf({ checkoutRoot: checkout }).message).toContain('it has no .claude folder.')
  })

  it('refuses a checkout whose Makefile is a folder, not a file', async () => {
    const checkout = await workspace({ makefile: false })
    await createWorkspace({ at: join(checkout, 'Makefile'), claudeFolder: false, makefile: false })
    expect(refusalOf({ checkoutRoot: checkout }).message).toContain('it has no Makefile.')
  })
})
