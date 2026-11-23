const MISSING_FEATURE_SHAPES = [
  { pattern: /^(\S+) is not defined$/, feature: (name) => `the global ${name}` },
  { pattern: /^Cannot read properties of (?:undefined|null) \(reading '([^']+)'\)$/, feature: (name) => `the property ${name}` },
  { pattern: /^(\S+) is not a function$/, feature: (name) => `the function ${name}` }
]

const FRAME = /^\s*at (?:(.+?) \()?(?:file:\/\/)?(\/[^:]+):(\d+):\d+\)?$/

const framesOf = (stack = '') => stack.split('\n')
  .map((line) => line.match(FRAME))
  .filter((match) => match !== null)
  .map(([, fn, file, line]) => ({ fn: fn ?? '<anonymous>', file, line }))

const shownPath = (path, root) => path.startsWith(`${root}/`) ? path.slice(root.length + 1) : path.split('/').at(-1)

const packageOf = (file) => file.match(/\/node_modules\/((?:@[^/]+\/)?[^/]+)\//)?.[1]

const describedFrame = ({ fn, file, line }, root) => {
  const owner = packageOf(file)
  return owner === undefined
    ? `${fn} (${shownPath(file, root)}:${line})`
    : `${fn} (${owner}, ${file.split('/').at(-1)}:${line})`
}

const causesOf = (error) => error.cause instanceof Error ? [`${error.cause.name}: ${error.cause.message}`, ...causesOf(error.cause)] : []

const shownArgument = (argument, root) => argument.startsWith('/') ? shownPath(argument, root) : argument

const environmentOf = ({ versions, platform, arch }) =>
  [...Object.entries(versions).map(([name, version]) => `${name} ${version}`), `${platform} ${arch}`].join(', ')

const withOptional = (report, fields) =>
  Object.entries(fields).reduce((built, [name, value]) => value === undefined ? built : { ...built, [name]: value }, report)

/**
 * Returns the triage report of a fault in hedy: the fault and each cause, the
 * feature the message says is missing, the first stack frame and the first
 * frame inside hedy, the environment, the hedy command line that reproduces
 * the fault and, when the context gives one, the input. A path inside the
 * workspace is written relative to the workspace root, and any other path as
 * its file name, so the report can be filed in a public repository.
 *
 * @param {Error} error
 * @param {{
 *   argv: string[], workspaceRoot: string, versions: Record<string, string>,
 *   platform: string, arch: string, input?: string
 * }} context
 */
export const faultReport = (error, context) => {
  const root = context.workspaceRoot
  const frames = framesOf(error.stack)
  const hedyFrame = frames.find(({ file }) => file.startsWith(`${root}/hedy/src/`))
  return withOptional({
    fault: `${error.name}: ${error.message}`,
    causes: causesOf(error)
  }, {
    missingFeature: missingFeatureOf(error.message),
    raisedAt: frames[0] === undefined ? undefined : describedFrame(frames[0], root),
    hedyAt: hedyFrame === undefined || hedyFrame === frames[0] ? undefined : describedFrame(hedyFrame, root),
    environment: environmentOf(context),
    reproduction: ['hedy', ...context.argv.map((argument) => shownArgument(argument, root))].join(' '),
    input: context.input
  })
}

const REPORT_LINES = [
  ['Missing feature', 'missingFeature'],
  ['Raised at', 'raisedAt'],
  ['In hedy at', 'hedyAt'],
  ['Environment', 'environment'],
  ['Reproduction', 'reproduction']
]

/**
 * Returns a triage report as text: one labelled line per part the report
 * holds, a Cause line per cause, and the input last beneath an Input heading.
 *
 * @param {ReturnType<typeof faultReport>} report
 * @returns {string}
 */
export const renderFaultReport = (report) => [
  `Fault: ${report.fault}`,
  ...report.causes.map((cause) => `Cause: ${cause}`),
  ...REPORT_LINES.filter(([, key]) => report[key] !== undefined).map(([heading, key]) => `${heading}: ${report[key]}`),
  ...(report.input === undefined ? [] : ['Input:', report.input])
].join('\n')

/**
 * Returns the feature an error message says is missing, such as "the global
 * Option" for "Option is not defined", or undefined for a message of another
 * shape.
 *
 * @param {string} message
 * @returns {string | undefined}
 */
export const missingFeatureOf = (message) => {
  const shape = MISSING_FEATURE_SHAPES.map(({ pattern, feature }) => ({ match: message.match(pattern), feature })).find(({ match }) => match !== null)
  return shape === undefined ? undefined : shape.feature(shape.match[1])
}
