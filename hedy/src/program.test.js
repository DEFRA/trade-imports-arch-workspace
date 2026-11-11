import { readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { runProgram } from './program.js'
import { createWorkspace, runCli } from './test-support/cli.js'
import { fakeStderr, fakeStdin, fakeStdout } from './test-support/menu-streams.js'

const { version } = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))

let root

beforeEach(async () => {
  root = await createWorkspace()
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

const run = async (args, env = { HEDY_WORKSPACE: root }) => {
  const out = []
  const err = []
  const codes = []
  await runProgram(args, {
    stdout: { write: (chunk) => out.push(chunk) },
    stderr: { write: (chunk) => err.push(chunk) },
    setExitCode: (code) => codes.push(code),
    env,
    homedir: '/nonexistent-home'
  })
  return { stdout: out.join(''), stderr: err.join(''), codes }
}

const envelopeOf = (stdout) => {
  const lines = stdout.split('\n')
  expect(lines).toHaveLength(2)
  expect(lines[1]).toBe('')
  return JSON.parse(lines[0])
}

describe('runProgram in text mode', () => {
  it('runs hello, printing the message and setting exit 0', async () => {
    const result = await run(['hello'])
    expect(result).toEqual({ stdout: 'Hello from hedy\n', stderr: '', codes: [0] })
  })

  it.each([
    [['hello', '--bogus'], 'The option --bogus is not recognised. Run the command with --help to list its options.'],
    [['hello', '--jsn'], 'The option --jsn is not recognised. Did you mean --json?'],
    [['nosuch'], 'The command nosuch is not recognised. Run hedy --help to list the commands.'],
    [['helo'], 'The command helo is not recognised. Did you mean one of hello, help?'],
    [['hello', 'extra'], 'The command hello does not take the arguments extra. Run it with --help to see its arguments.'],
    [['hello', '--', '--json'], 'The command hello does not take the arguments --json. Run it with --help to see its arguments.'],
    [['jira', 'ticket'], "The command needs the argument 'key'. Run it with --help to see its arguments."],
    [['jira', 'create'], "The command needs the option '--from <path>'. Run it with --help to see its options."],
    [['--workspace'], 'The option --workspace <path> needs a value. Put the value after the option.'],
    [[], 'No command was given. Run hedy --help to list the commands.']
  ])('turns the parse error for %j into one stderr line, nothing on stdout, exit 2', async (args, message) => {
    const result = await run(args)
    expect(result).toEqual({ stdout: '', stderr: `${message}\n`, codes: [2] })
  })

  it('refuses a --workspace folder that is not a workspace before hello runs, with one stderr line and exit 2', async () => {
    const result = await run(['--workspace', '/nonexistent', 'hello'])
    expect(result.stdout).toBe('')
    expect(result.stderr).toMatch(/^The folder \/nonexistent, from --workspace, is not a workspace because [^\n]+\n$/)
    expect(result.codes).toEqual([2])
  })

  it('refuses when no override is given and the default location under the home folder is missing', async () => {
    const result = await run(['hello'], {})
    expect(result.stderr).toContain('/nonexistent-home/trade-imports-arch-workspace, from the default location,')
    expect(result.codes).toEqual([2])
  })
})

describe('runProgram in JSON mode', () => {
  it('runs hello --json, printing one success envelope line with the message', async () => {
    const result = await run(['hello', '--json'])
    const envelope = envelopeOf(result.stdout)
    expect(envelope.ok).toBe(true)
    expect(envelope.hedy_version).toBe(version)
    expect(envelope.result).toEqual({ message: 'Hello from hedy' })
    expect(result.stderr).toBe('')
    expect(result.codes).toEqual([0])
  })

  it.each([
    [['hello', '--bogus', '--json'], '--bogus'],
    [['--json', 'nosuch'], 'nosuch'],
    [['--workspace', '/nonexistent', 'hello', '--json'], '/nonexistent']
  ])('turns the failure for %j into one USAGE failure envelope naming %s, nothing on stderr, exit 2', async (args, token) => {
    const result = await run(args)
    const envelope = envelopeOf(result.stdout)
    expect(envelope.ok).toBe(false)
    expect(envelope.errors).toHaveLength(1)
    expect(envelope.errors[0].code).toBe('USAGE')
    expect(envelope.errors[0].message).toContain(token)
    expect(result.stderr).toBe('')
    expect(result.codes).toEqual([2])
  })
})

describe('runProgram auth', () => {
  it('reads the .env file at the resolved workspace root, so only the variables missing from both are named', async () => {
    await writeFile(join(root, '.env'), 'JIRA_USER=file-user\n')
    const result = await run(['auth', '--json'])
    const envelope = envelopeOf(result.stdout)
    expect(envelope.errors).toHaveLength(1)
    expect(envelope.errors[0].code).toBe('AUTH')
    expect(envelope.errors[0].message).toMatch(/^JIRA_TOKEN and JIRA_BASE_URL are not set\./)
    expect(result.codes).toEqual([1])
  })
})

describe('runProgram help and version', () => {
  it.each([
    [['--help']],
    [['-h']],
    [['help']],
    [['help', 'hello']],
    [['hello', '--help']]
  ])('prints help for %j on stdout with no envelope and exit 0', async (args) => {
    const result = await run(args)
    expect(result.stdout).toMatch(/^Usage: hedy/)
    expect(result.stderr).toBe('')
    expect(result.codes).toEqual([0])
  })

  it('lists the global options and the hello command in the top-level help', async () => {
    const { stdout } = await run(['--help'])
    expect(stdout).toContain('--json')
    expect(stdout).toContain('--workspace <path>')
    expect(stdout).toMatch(/^ {2}hello\s/m)
  })

  it.each(['auth', 'jira', 'confluence'])('lists the %s command in the top-level help', async (name) => {
    const { stdout } = await run(['--help'])
    expect(stdout).toMatch(new RegExp(`^ {2}${name}\\s`, 'm'))
  })

  it.each([[['--version']], [['-V']], [['--version', '--json']]])('prints the package version for %j and exits 0', async (args) => {
    const result = await run(args)
    expect(result).toEqual({ stdout: `${version}\n`, stderr: '', codes: [0] })
  })
})

describe('runProgram with no command', () => {
  const NO_COMMAND = 'No command was given. Run hedy --help to list the commands.'

  const terminalMark = (name, terminals) => terminals.includes(name) ? { isTTY: true } : {}

  const runAt = async (args, { terminals = ['stdout', 'stdin'], launchCode = 0 } = {}) => {
    const out = []
    const err = []
    const codes = []
    const launches = []
    const deps = {
      stdout: { write: (chunk) => out.push(chunk), ...terminalMark('stdout', terminals) },
      stdin: terminalMark('stdin', terminals),
      stderr: { write: (chunk) => err.push(chunk) },
      setExitCode: (code) => codes.push(code),
      env: { HEDY_WORKSPACE: root },
      homedir: '/nonexistent-home'
    }
    await runProgram(args, {
      ...deps,
      launchMenu: async (options) => {
        launches.push(options)
        deps.stdout.write('menu opened\n')
        return launchCode
      }
    })
    return { deps, launches, stdout: out.join(''), stderr: err.join(''), codes }
  }

  it.each([0, 1])('at a terminal opens the menu with the streams, env and resolved workspace root, and sets the exit code %i it resolves to', async (launchCode) => {
    const { deps, launches, stdout, stderr, codes } = await runAt([], { launchCode })
    expect(launches).toHaveLength(1)
    const [options] = launches
    expect(Object.keys(options).sort()).toEqual(['env', 'setExitCode', 'stderr', 'stdin', 'stdout', 'workspaceRoot'])
    expect(options.env).toBe(deps.env)
    expect(options.workspaceRoot()).toBe(root)
    expect(options.stdout).toBe(deps.stdout)
    expect(options.stdin).toBe(deps.stdin)
    expect(options.stderr).toBe(deps.stderr)
    expect(options.setExitCode).toBe(deps.setExitCode)
    expect({ stdout, stderr, codes }).toEqual({ stdout: 'menu opened\n', stderr: '', codes: [launchCode] })
  })

  it.each([
    ['--no-ui at a terminal', ['--no-ui'], {}],
    ['stdout a terminal and stdin not', [], { terminals: ['stdout'] }],
    ['stdin a terminal and stdout not', [], { terminals: ['stdin'] }],
    ['no terminal at all', [], { terminals: [] }],
    ['no terminal and a --workspace folder that is not a workspace', ['--workspace', '/nonexistent'], { terminals: [] }]
  ])('with %s gives the usage error on stderr, exit 2, and never opens the menu', async (_case, args, terminal) => {
    const { launches, stdout, stderr, codes } = await runAt(args, terminal)
    expect(launches).toEqual([])
    expect({ stdout, stderr, codes }).toEqual({ stdout: '', stderr: `${NO_COMMAND}\n`, codes: [2] })
  })

  it('with --json at a terminal prints one USAGE failure envelope, exit 2, and never opens the menu', async () => {
    const { launches, stdout, stderr, codes } = await runAt(['--json'])
    expect(launches).toEqual([])
    const envelope = envelopeOf(stdout)
    expect(envelope.ok).toBe(false)
    expect(envelope.errors).toEqual([{ code: 'USAGE', message: NO_COMMAND }])
    expect(stderr).toBe('')
    expect(codes).toEqual([2])
  })

  it.each([
    [['nosuch']],
    [['--workspace', '/nonexistent', 'nosuch']]
  ])('refuses the unknown command in %j at a terminal and never opens the menu', async (args) => {
    const { launches, stdout, stderr, codes } = await runAt(args)
    expect(launches).toEqual([])
    expect({ stdout, stderr, codes }).toEqual({
      stdout: '',
      stderr: 'The command nosuch is not recognised. Run hedy --help to list the commands.\n',
      codes: [2]
    })
  })

  it('at a terminal refuses a --workspace folder that is not a workspace before the menu opens', async () => {
    const { launches, stdout, stderr, codes } = await runAt(['--workspace', '/nonexistent'])
    expect(launches).toEqual([])
    expect(stdout).toBe('')
    expect(stderr).toMatch(/^The folder \/nonexistent, from --workspace, is not a workspace because [^\n]+\n$/)
    expect(codes).toEqual([2])
  })

  it('lists --no-ui in the top-level help', async () => {
    const { stdout } = await run(['--help'])
    expect(stdout.replace(/\s+/g, ' ')).toContain(' --no-ui Do not open the menu, so a bare hedy prints the usage error ')
  })

  it('with no launcher injected opens the real menu on the given terminal streams and exits 0 after Quit', async () => {
    const stdout = fakeStdout()
    const stdin = fakeStdin()
    const codes = []
    const finished = runProgram([], {
      stdout,
      stdin,
      stderr: fakeStderr(),
      setExitCode: (code) => codes.push(code),
      env: { HEDY_WORKSPACE: root },
      homedir: '/nonexistent-home'
    })
    await vi.waitFor(() => expect(stdin.listenerCount('readable')).toBeGreaterThan(0))
    for (const key of ['\u001B[B', '\u001B[B', '\u001B[B', '\r']) {
      await new Promise((resolve) => setTimeout(resolve, 30))
      stdin.write(key)
    }
    await finished
    expect(stdout.text()).toContain('Quit')
    expect(codes).toEqual([0])
  })
})

describe('the hedy entry, spawned with no command', () => {
  const env = () => ({ HEDY_WORKSPACE: root })
  const NO_COMMAND = 'No command was given. Run hedy --help to list the commands.'

  it.each([[[]], [['--no-ui']]])('%j prints the usage error as one stderr line and exits 2', async (args) => {
    const result = await runCli(args, { env: env() })
    expect(result.exitCode).toBe(2)
    expect(result.stdout).toBe('')
    expect(result.stderr).toBe(NO_COMMAND)
  })

  it('--json prints one USAGE failure envelope and exits 2', async () => {
    const result = await runCli(['--json'], { env: env() })
    expect(result.exitCode).toBe(2)
    expect(result.envelope.ok).toBe(false)
    expect(result.envelope.errors).toEqual([{ code: 'USAGE', message: NO_COMMAND }])
    expect(result.stderr).toBe('')
  })

  it('--help lists --no-ui and exits 0', async () => {
    const result = await runCli(['--help'], { env: env() })
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toMatch(/^ {2}--no-ui\s/m)
  })
})

describe('the hedy entry, spawned', () => {
  const env = () => ({ HEDY_WORKSPACE: root })

  it('hello --json prints one success envelope line and exits 0', async () => {
    const result = await runCli(['hello', '--json'], { env: env() })
    expect(result.exitCode).toBe(0)
    expect(result.envelope.ok).toBe(true)
    expect(result.envelope.result.message).toBe('Hello from hedy')
  })

  it('hello prints the message as text and exits 0', async () => {
    const result = await runCli(['hello'], { env: env() })
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toBe('Hello from hedy')
  })

  it('hello --bogus exits 2 with one stderr line naming --bogus, no stack trace and nothing on stdout', async () => {
    const result = await runCli(['hello', '--bogus'], { env: env() })
    expect(result.exitCode).toBe(2)
    expect(result.stdout).toBe('')
    expect(result.stderr.split('\n')).toHaveLength(1)
    expect(result.stderr).toContain('--bogus')
    expect(result.stderr).not.toMatch(/\bat \S+:\d+/)
  })

  it('hello --bogus --json prints one USAGE failure envelope and exits 2', async () => {
    const result = await runCli(['hello', '--bogus', '--json'], { env: env() })
    expect(result.exitCode).toBe(2)
    expect(result.envelope.ok).toBe(false)
    expect(result.envelope.errors[0].code).toBe('USAGE')
    expect(result.stderr).toBe('')
  })

  it('--help lists the jira and confluence commands and exits 0', async () => {
    const result = await runCli(['--help'], { env: env() })
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toMatch(/^Usage: hedy/)
    expect(result.stdout).toMatch(/^ {2}jira\s/m)
    expect(result.stdout).toMatch(/^ {2}confluence\s/m)
  })

  it('--version prints the version from package.json and exits 0', async () => {
    const result = await runCli(['--version'], { env: env() })
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toBe(version)
  })

  it('--workspace /nonexistent hello --json prints one USAGE failure envelope and exits 2', async () => {
    const result = await runCli(['--workspace', '/nonexistent', 'hello', '--json'], { env: env() })
    expect(result.exitCode).toBe(2)
    expect(result.envelope.ok).toBe(false)
    expect(result.envelope.errors[0].code).toBe('USAGE')
  })

  it('an unknown command exits 2', async () => {
    const result = await runCli(['nosuch'], { env: env() })
    expect(result.exitCode).toBe(2)
  })
})
