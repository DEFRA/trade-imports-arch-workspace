import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, it, expect } from 'vitest'
import { mermaidFiles } from './mermaid-files.js'

let folder
beforeEach(async () => { folder = await mkdtemp(join(tmpdir(), 'hedy-mermaid-files-')) })
afterEach(() => rm(folder, { recursive: true, force: true }))

const plant = async (...names) => {
  for (const name of names) {
    await mkdir(dirname(join(folder, name)), { recursive: true })
    await writeFile(join(folder, name), '')
  }
}

describe('mermaidFiles', () => {
  it('lists the .mmd files and Markdown pages beneath a folder in path order, leaving out node_modules, build, generated and dot folders', async () => {
    await plant('b.md', 'a/c.mmd', 'a/z.txt', 'node_modules/x.mmd', 'build/x.md', 'a/generated/x.mmd', '.git/x.md', 'a/.cache/x.mmd')
    expect(await mermaidFiles([folder])).toEqual([join(folder, 'a/c.mmd'), join(folder, 'b.md')])
  })

  it('keeps a path that names a file, or names nothing, as given, so the reader reports it', async () => {
    await plant('one.txt')
    expect(await mermaidFiles([join(folder, 'one.txt'), join(folder, 'missing.mmd')])).toEqual([join(folder, 'one.txt'), join(folder, 'missing.mmd')])
  })
})
