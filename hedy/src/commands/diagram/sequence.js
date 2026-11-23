import { rename, rm, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { z } from 'zod'
import { HedyError } from '../../errors.js'
import { runAction } from '../../run-action.js'
import { readFileText } from '../prose/check.js'
import { fileLineOf } from './mermaid-diagrams.js'
import { parseDiagrams } from './mermaid-parser.js'
import { layOutSequence } from './sequence-layout.js'
import { readSequenceSource } from './sequence-source.js'
import { diagramSize, svgOfScene } from './sequence-svg.js'

const ACCEPTED_CONSTRUCTS = `
The source is a Mermaid sequence diagram. The renderer draws:
  participant ID as Title<br>repository-name   a service box, with the repository name beneath
  box Zone name ... end                        a zone band behind the participants inside the block
  A->>B: label<br>more lines                   a request, drawn solid
  A-->>B: label                                a reply, drawn dashed
  Note over A: text, Note over A,B: text       a note
  alt condition ... else condition ... end     alternative paths in a frame
Blank lines, %% comments and autonumber are read past. Any other line is refused with its line number.`

const sequenceInputSchema = z.object({
  source: z.string().min(1, 'The source path is empty. Give the path of the Mermaid file to draw, then run the command again.'),
  output: z.string().min(1, 'The output path is empty. Give the path of the SVG file to write, then run the command again.')
}).superRefine(({ output }, context) => {
  if (!output.endsWith('.svg')) {
    context.addIssue({ code: 'custom', message: `The output path ${output} does not end in .svg. Give the path of the SVG file to write, then run the command again.` })
  }
})

const checkOutputFolder = async (output) => {
  const folder = dirname(output)
  const status = await stat(folder).catch((error) => {
    if (['ENOENT', 'ENOTDIR'].includes(error.code)) return undefined
    throw new HedyError('UNKNOWN', `The folder ${folder} could not be read. Check its permissions, then run the command again.`, { cause: error })
  })
  if (status === undefined || !status.isDirectory()) {
    throw new HedyError('USAGE', `The folder ${folder} does not exist. Create the folder, or give an output path in a folder that exists, then run the command again.`)
  }
}

const writeReplacing = async (output, text) => {
  const temporary = join(dirname(output), `.${basename(output)}.${process.pid}.tmp`)
  try {
    await writeFile(temporary, text)
    await rename(temporary, output)
  } catch (error) {
    await rm(temporary, { force: true })
    throw new HedyError('UNKNOWN', `The drawing could not be written to ${output}. Check that the folder is writable, then run the command again.`, { cause: error })
  }
}

const withGroupNames = (model, groups) =>
  ({ ...model, zones: model.zones.map((zone, i) => ({ ...zone, name: groups[i] ?? zone.name })) })

const drawing = (text, { label, groups }) => {
  const scene = layOutSequence(withGroupNames(readSequenceSource(text, { label }), groups))
  return {
    svg: svgOfScene(scene),
    ...diagramSize(scene),
    steps: scene.body.filter(({ kind }) => kind === 'step').length
  }
}

const placeOf = (diagram, message) => {
  const line = fileLineOf(diagram, message)
  return line === undefined ? diagram.label : `${diagram.label}:${line}`
}

const refusal = (verdict, diagram) => verdict.cause === 'hedy'
  ? new HedyError('INTERNAL', `hedy could not check ${diagram.label} with Mermaid: ${verdict.message}. The fault is in hedy, not in the source. File the report as a hedy bug.`, { report: verdict.report })
  : new HedyError('PARSE', `${placeOf(diagram, verdict.message)}: Mermaid does not accept the source: ${verdict.message.split('\n')[0]} Fix the line, check the file with hedy diagram check, then run the command again.`)

const acceptedVerdict = async (text, { source, workspaceRoot }) => {
  const diagram = { label: source, text, linesBefore: 0 }
  const [verdict] = await parseDiagrams([diagram], { workspaceRoot })
  if (verdict.ok) return verdict
  throw refusal(verdict, diagram)
}

const drawSequenceFile = async ({ source, output }, { workspaceRoot }) => {
  await checkOutputFolder(output)
  const { text } = await readFileText(source)
  const { groups = [] } = await acceptedVerdict(text, { source, workspaceRoot: workspaceRoot() })
  const { svg, width, height, steps } = drawing(text, { label: source, groups })
  await writeReplacing(output, svg)
  return { source, output, width, height, steps }
}

export const renderDrawnSequence = ({ source, output, width, height, steps }) =>
  `Drew ${output} from ${source}: ${steps} steps, ${width} by ${height}.`

export const register = (group, { stdout, stderr, setExitCode, workspaceRoot }) => {
  group
    .command('sequence')
    .description('Draw a Mermaid sequence diagram as an SVG in the house style')
    .argument('<source>', 'The Mermaid sequence file to draw')
    .argument('<output>', 'The SVG file to write, replaced when it exists')
    .addHelpText('after', ACCEPTED_CONSTRUCTS)
    .action((source, output, options, command) => runAction(
      () => drawSequenceFile(sequenceInputSchema.parse({ source, output }), { workspaceRoot }),
      { json: command.optsWithGlobals().json === true, render: renderDrawnSequence, stdout, stderr, setExitCode }
    ))
}
