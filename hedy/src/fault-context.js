import { hedyVersion } from './envelope.js'
import { CHECKOUT_ROOT } from './workspace-root.js'

/**
 * Returns the context of a fault report for a running process: the arguments
 * after the script, the checkout hedy runs from, the hedy and Node versions,
 * the platform and the processor architecture.
 *
 * @param {{ argv: string[], version: string, platform: string, arch: string }} [running]
 */
export const faultContextOf = ({ argv, version, platform, arch } = process) => ({
  argv: argv.slice(2),
  workspaceRoot: CHECKOUT_ROOT,
  versions: { hedy: hedyVersion(), node: version },
  platform,
  arch
})
