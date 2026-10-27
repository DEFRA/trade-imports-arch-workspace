import { homedir as osHomedir } from 'node:os'
import { Command, CommanderError } from 'commander'
import { register as registerAuth } from './commands/auth.js'
import { register as registerHello } from './commands/hello.js'
import { hedyVersion } from './envelope.js'
import { HedyError } from './errors.js'
import { EXIT } from './exit-codes.js'
import { runAction } from './run-action.js'
import { resolveWorkspaceRoot } from './workspace-root.js'

const withDefaults = ({
  stdout = process.stdout,
  stderr = process.stderr,
  setExitCode = (code) => { process.exitCode = code },
  env = process.env,
  homedir = osHomedir()
} = {}) => ({ stdout, stderr, setExitCode, env, homedir })

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
    case 'commander.excessArguments':
      return `The command ${quoted} does not take the arguments ${message.match(/got \d+: (.*)\.$/)?.[1]}. Run it with --help to see its arguments.`
    case 'commander.help':
      return 'No command was given. Run hedy --help to list the commands.'
    default:
      return `${message.replace(/^error: /, '')}. Run hedy --help for usage.`
  }
}

/**
 * Builds the hedy commander program. Output, the exit code setter, the
 * environment and the home folder are injectable so the program runs
 * in-process under test. Commander's own errors are thrown, not printed.
 *
 * @param {object} [deps]
 * @param {{ write: (chunk: string) => unknown }} [deps.stdout]
 * @param {{ write: (chunk: string) => unknown }} [deps.stderr]
 * @param {(code: number) => void} [deps.setExitCode]
 * @param {Record<string, string | undefined>} [deps.env]
 * @param {string} [deps.homedir]
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
  return program
}

/**
 * Parses the arguments, without the node and script paths, and runs the chosen
 * command. Help and version exit 0. Every other commander error and every
 * error raised before a command's action becomes a USAGE or UNKNOWN failure
 * written through runAction: one envelope line with --json, else one stderr line.
 *
 * @param {string[]} args
 * @param {Parameters<typeof buildProgram>[0]} [deps]
 * @returns {Promise<void>}
 */
export const runProgram = async (args, deps) => {
  const io = withDefaults(deps)
  try {
    await buildProgram(io).parseAsync(args, { from: 'user' })
  } catch (error) {
    if (error instanceof CommanderError && isCleanExit(error)) {
      io.setExitCode(EXIT.OK)
      return
    }
    await runAction(() => {
      throw error instanceof CommanderError ? new HedyError('USAGE', usageMessage(error)) : error
    }, { json: requestsJson(args), stdout: io.stdout, stderr: io.stderr, setExitCode: io.setExitCode })
  }
}
