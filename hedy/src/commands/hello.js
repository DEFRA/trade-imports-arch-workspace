import { z } from 'zod'
import { runAction } from '../run-action.js'

const helloOptionsSchema = z.object({}).strict()

export const runHello = () => ({ message: 'Hello from hedy' })

export const register = (program, { stdout, stderr, setExitCode }) => {
  program
    .command('hello')
    .description('Print a greeting, to check that hedy runs')
    .action((options, command) => runAction(() => {
      helloOptionsSchema.parse(options)
      return runHello()
    }, {
      json: command.optsWithGlobals().json === true,
      render: ({ message }) => message,
      stdout,
      stderr,
      setExitCode
    }))
}
