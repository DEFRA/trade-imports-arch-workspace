import { homedir as osHomedir } from 'node:os'
import { Command, CommanderError } from 'commander'
import { register as registerAuth } from './commands/auth.js'
import { register as registerConfluence } from './commands/confluence/index.js'
import { register as registerHello } from './commands/hello.js'
import { register as registerJira } from './commands/jira/index.js'
import { hedyVersion } from './envelope.js'
import { HedyError } from './errors.js'
import { EXIT } from './exit-codes.js'
import { runAction } from './run-action.js'
import { resolveWorkspaceRoot } from './workspace-root.js'

const launchMenuOnDemand = async (options) => {
  const { launchMenu } = await import('./menu/launch.js')
  return launchMenu(options)
}

const withDefaults = ({
  stdout = process.stdout,
  stdin = process.stdin,
  stderr = process.stderr,
  setExitCode = (code) => { process.exitCode = code },
  env = process.env,
  homedir = osHomedir(),
  launchMenu = launchMenuOnDemand
} = {}) => ({ stdout, stdin, stderr, setExitCode, env, homedir, launchMenu })

const menuOpens = ({ stdout, stdin }, { ui, json }) =>
  stdout.isTTY === true && stdin.isTTY === true && ui !== false && json !== true

const noCommandGiven = (error, program) =>
  error instanceof CommanderError && error.code === 'commander.help' && error.exitCode !== EXIT.OK && program.args.length === 0

const requestsJson = (args) => {
  const end = args.indexOf('--')
  return (end === -1 ? args : args.slice(0, end)).includes('--json')
}

const isCleanExit = ({ code, exitCode }) =>
  code === 'commander.helpDisplayed' ||
  code === 'commander.version' ||
  (code === 'commander.help' && exitCode === EXIT.OK)

const usageMessage = ({ code, message }) => {
  const quoted = message.match(/'([^']+)'/)?.[1]
  const suggestion = message.match(/\(Did you mean (.+)\?\)/)?.[1]
  const hint = suggestion ? `Did you mean ${suggestion}?` : 'Run the command with --help to list its options.'
  switch (code) {
    case 'commander.unknownOption':
      return `The option ${quoted} is not recognised. ${hint}`
    case 'commander.unknownCommand':
      return `The command ${quoted} is not recognised. ${suggestion ? hint : 'Run hedy --help to list the commands.'}`
    case 'commander.optionMissingArgument':
      return `The option ${quoted} needs a value. Put the value after the option.`
    case 'commander.missingArgument':
      return `The command needs the argument '${quoted}'. Run it with --help to see its arguments.`
    case 'commander.missingMandatoryOptionValue':
      return `The command needs the option '${quoted}'. Run it with --help to see its options.`
    case 'commander.excessArguments':
      return `The command ${quoted} does not take the arguments ${message.match(/got \d+: (.*)\.$/)?.[1]}. Run it with --help to see its arguments.`
    case 'commander.help':
      return 'No command was given. Run hedy --help to list the commands.'
    default:
      return `${message.replace(/^error: /, '')}. Run hedy --help for usage.`
  }
}

/**
 * Builds the hedy commander program. Output, input, the exit code setter,
 * the environment, the home folder and the menu launcher are injectable so
 * the program runs in-process under test. Commander's own errors are thrown,
 * not printed.
 *
 * @param {object} [deps]
 * @param {{ write: (chunk: string) => unknown, isTTY?: boolean }} [deps.stdout]
 * @param {{ isTTY?: boolean }} [deps.stdin]
 * @param {{ write: (chunk: string) => unknown }} [deps.stderr]
 * @param {(code: number) => void} [deps.setExitCode]
 * @param {Record<string, string | undefined>} [deps.env]
 * @param {string} [deps.homedir]
 * @param {(options: object) => Promise<number>} [deps.launchMenu]
 * @returns {Command}
 */
export const buildProgram = (deps) => {
  const { stdout, stderr, setExitCode, env, homedir } = withDefaults(deps)
  let root
  const program = new Command()
    .name('hedy')
    .description('Workspace CLI for the trade-imports architecture tooling')
    .version(hedyVersion(), '-V, --version', 'Print the hedy version')
    .option('--json', 'Print one JSON envelope line on stdout instead of text')
    .option('--workspace <path>', 'Use this folder as the workspace root')
    .option('--no-ui', 'Do not open the menu, so a bare hedy prints the usage error')
    .helpOption('-h, --help', 'Show help for the command')
    .helpCommand('help [command]', 'Show help for a command')
    .exitOverride()
    .configureOutput({
      writeOut: (chunk) => stdout.write(chunk),
      writeErr: () => {},
      outputError: () => {}
    })
    .hook('preAction', (_program, actionCommand) => {
      root = resolveWorkspaceRoot({ workspace: actionCommand.optsWithGlobals().workspace, env, homedir })
    })
  const commandDeps = { stdout, stderr, setExitCode, env, workspaceRoot: () => root }
  registerHello(program, commandDeps)
  registerAuth(program, commandDeps)
  registerJira(program, commandDeps)
  registerConfluence(program, commandDeps)
  return program
}

const openMenu = async (program, { env, homedir, stdout, stdin, stderr, setExitCode, launchMenu }) => {
  try {
    const root = resolveWorkspaceRoot({ workspace: program.opts().workspace, env, homedir })
    setExitCode(await launchMenu({ env, workspaceRoot: () => root, stdout, stdin, stderr, setExitCode }))
  } catch (error) {
    await runAction(() => { throw error }, { stdout, stderr, setExitCode })
  }
}

/**
 * Parses the arguments, without the node and script paths, and runs the chosen
 * command. Help and version exit 0. With no command at all, when stdout and
 * stdin are both terminals and neither --no-ui nor --json is given, the menu
 * opens through launchMenu with the resolved workspace root and the exit code
 * is the one the launcher resolves to. Every other commander error and every
 * error raised before a command's action becomes a USAGE or UNKNOWN failure
 * written through runAction: one envelope line with --json, else one stderr line.
 *
 * @param {string[]} args
 * @param {Parameters<typeof buildProgram>[0]} [deps]
 * @returns {Promise<void>}
 */
export const runProgram = async (args, deps) => {
  const io = withDefaults(deps)
  const program = buildProgram(io)
  try {
    await program.parseAsync(args, { from: 'user' })
  } catch (error) {
    if (error instanceof CommanderError && isCleanExit(error)) {
      io.setExitCode(EXIT.OK)
      return
    }
    if (noCommandGiven(error, program) && menuOpens(io, program.opts())) {
      await openMenu(program, io)
      return
    }
    await runAction(() => {
      throw error instanceof CommanderError ? new HedyError('USAGE', usageMessage(error)) : error
    }, { json: requestsJson(args), stdout: io.stdout, stderr: io.stderr, setExitCode: io.setExitCode })
  }
}
