import { chmod, mkdir, mkdtemp, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, it, expect } from 'vitest'
import { runLocalTool } from '../../local-tool.js'
import { createWorkspace } from '../../test-support/cli.js'
import { copyFixtureDocsRepo } from '../../test-support/docs-repo.js'
import { rejectionOf } from '../../test-support/http.js'
import { SETUP_CHECKS } from './setup-checks.js'

const created = []

const tempFolder = async (prefix) => {
  const folder = await realpath(await mkdtemp(join(tmpdir(), prefix)))
  created.push(folder)
  return folder
}

let root
let home

beforeEach(async () => {
  root = await realpath(await createWorkspace())
  created.push(root)
  home = await tempFolder('hedy-home-')
})

afterEach(async () => {
  await Promise.all(created.splice(0).map((path) => rm(path, { recursive: true, force: true })))
})

const contextFor = (overrides = {}) => ({
  root,
  env: process.env,
  cwd: root,
  homedir: home,
  nodeVersion: '24.15.0',
  runTool: runLocalTool,
  ...overrides
})

const checkNamed = (name) => SETUP_CHECKS.find((check) => check.name === name)

const runCheck = (name, overrides) => checkNamed(name).run(contextFor(overrides))

const failureOf = async (name, overrides) => {
  const error = await rejectionOf(runCheck(name, overrides))
  expect(error.code).toBe('SETUP')
  return error.message
}

const git = (args, cwd = root) => runLocalTool({ command: 'git', args, cwd, env: process.env })

const writeJson = (path, value) => writeFile(path, JSON.stringify(value))

describe('SETUP_CHECKS', () => {
  it('lists the checks in report order', () => {
    expect(SETUP_CHECKS.map(({ name }) => name)).toEqual([
      'Node',
      'Baseline tools',
      'Child repos',
      'Git hooks',
      'hedy link',
      'hedy packages',
      'Docs repo install',
      'Current folder',
      'Home folder links',
      'Local allow rules',
      'Working-directory pin'
    ])
  })
})

describe('the Node check', () => {
  it('passes Node 24 and names the version', async () => {
    expect(await runCheck('Node')).toBe('Node 24.15.0')
  })

  it('fails Node 22 with SETUP, naming the version and make install', async () => {
    expect(await failureOf('Node', { nodeVersion: '22.11.0' })).toBe(`Node 22.11.0 is older than 24. Install Node 24 or later, then run make -C ${root} install.`)
  })
})

describe('the baseline tools check', () => {
  const binWith = async (tools) => {
    const bin = await tempFolder('hedy-bin-')
    for (const tool of tools) {
      await writeFile(join(bin, tool), '#!/bin/sh\n')
      await chmod(join(bin, tool), 0o755)
    }
    return bin
  }

  it('passes when bash, curl, jq and git are executables on PATH', async () => {
    const bin = await binWith(['bash', 'curl', 'jq', 'git'])
    expect(await runCheck('Baseline tools', { env: { PATH: bin } })).toBe('bash, curl, jq and git are on PATH')
  })

  it('fails naming each missing tool in baseline order, and counts a file without the execute bit as missing', async () => {
    const bin = await binWith(['bash', 'git'])
    await writeFile(join(bin, 'jq'), '')
    expect(await failureOf('Baseline tools', { env: { PATH: bin } })).toBe('curl and jq are not on PATH. Install them, then run the check again.')
  })
})

describe('the child repos check', () => {
  beforeEach(async () => {
    await writeFile(join(root, 'Makefile'), 'GIT_BASE ?= x\nCHILDREN := alpha beta\n')
  })

  const cloneChild = async (child, { origin }) => {
    await mkdir(join(root, child))
    await git(['init', '--quiet'], join(root, child))
    if (origin) await git(['remote', 'add', 'origin', `git@example.com:${child}.git`], join(root, child))
  }

  it('passes when every child in the CHILDREN line is a folder with an origin remote', async () => {
    await cloneChild('alpha', { origin: true })
    await cloneChild('beta', { origin: true })
    expect(await runCheck('Child repos')).toBe('alpha and beta are present with an origin remote')
  })

  it('fails naming a missing child and a child without an origin remote, with make clone', async () => {
    await cloneChild('alpha', { origin: false })
    expect(await failureOf('Child repos')).toBe(`alpha has no origin remote and beta is not cloned. Clone and wire them with make -C ${root} clone.`)
  })

  it('fails when the Makefile has no CHILDREN line', async () => {
    await writeFile(join(root, 'Makefile'), 'all:\n')
    expect(await failureOf('Child repos')).toBe(`The Makefile at ${join(root, 'Makefile')} has no CHILDREN line. Restore the line, then run the check again.`)
  })
})

describe('the git hooks check', () => {
  beforeEach(async () => {
    await git(['init', '--quiet'])
  })

  it('passes when core.hooksPath is .githooks', async () => {
    await git(['config', 'core.hooksPath', '.githooks'])
    expect(await runCheck('Git hooks')).toBe('core.hooksPath is .githooks')
  })

  it.each([
    ['not set', null],
    ['/tmp/hooks', '/tmp/hooks']
  ])('fails when core.hooksPath is %s, with make install', async (shown, value) => {
    if (value !== null) await git(['config', 'core.hooksPath', value])
    expect(await failureOf('Git hooks')).toBe(`core.hooksPath is ${shown}, so the pre-commit gates do not run. Set it with make -C ${root} install.`)
  })
})

describe('the hedy link check', () => {
  let prefix
  let globalModules

  beforeEach(async () => {
    prefix = await tempFolder('hedy-npm-prefix-')
    globalModules = join(prefix, 'lib', 'node_modules')
    await mkdir(globalModules, { recursive: true })
    await mkdir(join(root, 'hedy'))
  })

  const linkEnv = () => ({ ...process.env, npm_config_prefix: prefix })

  it('passes when the global hedy link resolves to this checkout\'s hedy folder', async () => {
    await symlink(join(root, 'hedy'), join(globalModules, 'hedy'))
    expect(await runCheck('hedy link', { env: linkEnv() })).toBe(`${join(globalModules, 'hedy')} links to ${join(root, 'hedy')}`)
  })

  it('fails naming the other checkout when the link resolves elsewhere', async () => {
    const other = await tempFolder('hedy-other-')
    await symlink(other, join(globalModules, 'hedy'))
    expect(await failureOf('hedy link', { env: linkEnv() })).toBe(`The linked hedy runs from ${other}, not from this checkout. Link this checkout with make -C ${root} install.`)
  })

  it('fails when hedy is not linked at all', async () => {
    expect(await failureOf('hedy link', { env: linkEnv() })).toBe(`hedy is not linked into ${globalModules}. Link it with make -C ${root} install.`)
  })
})

describe('the hedy packages check', () => {
  const writeHedyPackage = async (dependencies) => {
    await mkdir(join(root, 'hedy'))
    await writeJson(join(root, 'hedy', 'package.json'), { name: 'hedy-fixture', version: '1.0.0', dependencies })
  }

  it('passes when npm ls finds every declared package installed', async () => {
    await writeHedyPackage({})
    expect(await runCheck('hedy packages')).toBe(`the packages under ${join(root, 'hedy', 'node_modules')} match ${join(root, 'hedy', 'package.json')}`)
  })

  it('fails when a declared package is not installed, with make install', async () => {
    await writeHedyPackage({ 'left-pad': '1.3.0' })
    expect(await failureOf('hedy packages')).toBe(`The packages under ${join(root, 'hedy', 'node_modules')} do not match ${join(root, 'hedy', 'package.json')}. Install them with make -C ${root} install.`)
  })
})

describe('the docs repo install check', () => {
  it('passes without checking when the docs repo is not cloned, because the child repos check reports that', async () => {
    expect(await runCheck('Docs repo install')).toBe('not checked, because the docs repo is not cloned')
  })

  it('passes when the docs repo links its tooling package', async () => {
    await copyFixtureDocsRepo(root)
    const docsRepo = await realpath(join(root, 'trade-imports-documentation'))
    expect(await runCheck('Docs repo install')).toBe(`${docsRepo} links node_modules/@defra/delivery-info-arch-tooling`)
  })

  it('fails with the docs repo check\'s own USAGE error when the tooling package is missing', async () => {
    await copyFixtureDocsRepo(root)
    const docsRepo = await realpath(join(root, 'trade-imports-documentation'))
    await rm(join(docsRepo, 'node_modules', '@defra', 'delivery-info-arch-tooling'), { recursive: true })
    const error = await rejectionOf(runCheck('Docs repo install'))
    expect(error.code).toBe('USAGE')
    expect(error.message).toContain(`Run npm --prefix ${docsRepo} install`)
  })
})

describe('the current folder check', () => {
  it.each([
    ['PWD is the real path', (cwd) => ({ PWD: cwd })],
    ['PWD is unset', () => ({})]
  ])('passes when %s', async (_case, envFor) => {
    expect(await runCheck('Current folder', { env: envFor(root) })).toBe(`${root} is a real path`)
  })

  it('fails when PWD reaches the workspace through a symlink, naming both paths', async () => {
    const link = join(home, 'linked-workspace')
    await symlink(root, link)
    expect(await failureOf('Current folder', { env: { PWD: join(link, '.claude') }, cwd: join(root, '.claude') })).toBe(
      `The current folder ${join(link, '.claude')} reaches the workspace through a symlink. Start sessions and commands from ${join(root, '.claude')}.`
    )
  })

  it('passes when the current folder is outside the workspace, through a symlink or not', async () => {
    const outside = await tempFolder('hedy-outside-')
    const link = join(home, 'linked-outside')
    await symlink(outside, link)
    expect(await runCheck('Current folder', { env: { PWD: link }, cwd: outside })).toBe(`${outside} is outside the workspace`)
  })
})

describe('the home folder links check', () => {
  it('passes when no symlink in the home folder resolves to the checkout', async () => {
    await symlink(await tempFolder('hedy-elsewhere-'), join(home, 'elsewhere'))
    await symlink(join(home, 'missing-target'), join(home, 'dangling'))
    expect(await runCheck('Home folder links')).toBe(`no symlink in ${home} points at the checkout`)
  })

  it('fails naming each symlink to the checkout, with unlink', async () => {
    await symlink(root, join(home, 'workspace-link'))
    expect(await failureOf('Home folder links')).toBe(
      `${join(home, 'workspace-link')} points at the checkout, so a path typed through it loads no path-scoped rule. Remove it with unlink ${join(home, 'workspace-link')}.`
    )
  })
})

describe('the local allow rules check', () => {
  const localSettings = () => join(root, '.claude', 'settings.local.json')

  it('passes when there is no settings.local.json', async () => {
    expect(await runCheck('Local allow rules')).toBe('there is no .claude/settings.local.json')
  })

  it('passes when no allow rule names the checkout by an absolute or home-relative path', async () => {
    await writeJson(localSettings(), { permissions: { allow: ['Bash(make *)', 'Read(~/.config/**)'] } })
    expect(await runCheck('Local allow rules')).toBe('no allow rule in .claude/settings.local.json names the checkout by an absolute or home-relative path')
  })

  it('fails naming each rule that spells the checkout by its absolute path or by ~/', async () => {
    const relativeToHome = `~/${basename(root)}`
    await writeJson(localSettings(), {
      permissions: { allow: ['Bash(make *)', `Bash(make -C ${relativeToHome} *)`, `Read(${root}/**)`] }
    })
    expect(await failureOf('Local allow rules', { homedir: dirname(root) })).toBe(
      `.claude/settings.local.json allows Bash(make -C ${relativeToHome} *) and Read(${root}/**), which name the checkout by an absolute or home-relative path, so a command typed relative to the workspace root does not match. Rewrite each rule relative to the workspace root.`
    )
  })
})

describe('the working-directory pin check', () => {
  const PIN = 'CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR'

  it('passes when the project settings set the pin to "1"', async () => {
    await writeJson(join(root, '.claude', 'settings.json'), { env: { [PIN]: '1' } })
    expect(await runCheck('Working-directory pin')).toBe(`${PIN} is "1"`)
  })

  it('fails when settings.local.json turns the pin off, naming the key to remove', async () => {
    await writeJson(join(root, '.claude', 'settings.json'), { env: { [PIN]: '1' } })
    await writeJson(join(root, '.claude', 'settings.local.json'), { env: { [PIN]: '0' } })
    expect(await failureOf('Working-directory pin')).toBe(
      `${PIN} is "0", so a cd in a session moves later Bash calls and the file tools. Remove ${PIN} from .claude/settings.local.json.`
    )
  })

  it('fails when no settings file sets the pin, naming the project settings', async () => {
    expect(await failureOf('Working-directory pin')).toBe(
      `${PIN} is not set, so a cd in a session moves later Bash calls and the file tools. Set ${PIN} to "1" in the env block of .claude/settings.json.`
    )
  })
})
