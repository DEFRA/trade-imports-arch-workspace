import { describe, it, expect } from 'vitest'
import { faultReport, missingFeatureOf, renderFaultReport } from './fault-report.js'

const ROOT = '/work/space'

const faultWithStack = (stackLines, { cause } = {}) => {
  const error = new ReferenceError('Option is not defined', cause === undefined ? undefined : { cause })
  error.stack = ['ReferenceError: Option is not defined', ...stackLines].join('\n')
  return error
}

const MERMAID_FRAME = `    at SequenceDB.parseBoxData (file://${ROOT}/delivery-info-arch-tooling/node_modules/mermaid/dist/chunks/mermaid.core/sequenceDiagram-WJ2MYXX4.mjs:1480:31)`
const HEDY_FRAME = `    at verdictOf (file://${ROOT}/hedy/src/commands/diagram/mermaid-verdicts.js:7:31)`

const context = {
  argv: ['diagram', 'check', `${ROOT}/docs/box.mmd`, '/Users/someone/elsewhere/draft.mmd'],
  workspaceRoot: ROOT,
  versions: { hedy: '0.1.0', node: 'v24.15.0', mermaid: '11.17.2', jsdom: '31.0.1' },
  platform: 'darwin',
  arch: 'arm64'
}

describe('renderFaultReport', () => {
  it('writes one labelled line per part, leaving out the parts the report does not hold, and the input last beneath its heading', () => {
    expect(renderFaultReport({
      fault: 'ReferenceError: Option is not defined',
      causes: ['TypeError: inner'],
      missingFeature: 'the global Option',
      raisedAt: 'parseBoxData (mermaid, sequenceDiagram.mjs:1480)',
      environment: 'hedy 0.1.0, darwin arm64',
      reproduction: 'hedy diagram check docs/box.mmd',
      input: 'sequenceDiagram\n  box PUBLIC ZONE'
    })).toBe([
      'Fault: ReferenceError: Option is not defined',
      'Cause: TypeError: inner',
      'Missing feature: the global Option',
      'Raised at: parseBoxData (mermaid, sequenceDiagram.mjs:1480)',
      'Environment: hedy 0.1.0, darwin arm64',
      'Reproduction: hedy diagram check docs/box.mmd',
      'Input:',
      'sequenceDiagram',
      '  box PUBLIC ZONE'
    ].join('\n'))
  })
})

describe('faultReport', () => {
  it('gives the fault, the missing feature, where the fault was raised, the environment and the command that reproduces it', () => {
    expect(faultReport(faultWithStack([MERMAID_FRAME, HEDY_FRAME]), context)).toEqual({
      fault: 'ReferenceError: Option is not defined',
      causes: [],
      missingFeature: 'the global Option',
      raisedAt: 'SequenceDB.parseBoxData (mermaid, sequenceDiagram-WJ2MYXX4.mjs:1480)',
      hedyAt: 'verdictOf (hedy/src/commands/diagram/mermaid-verdicts.js:7)',
      environment: 'hedy 0.1.0, node v24.15.0, mermaid 11.17.2, jsdom 31.0.1, darwin arm64',
      reproduction: 'hedy diagram check docs/box.mmd draft.mmd'
    })
  })

  it('lists each cause beneath the fault and carries the input when the context gives one', () => {
    const report = faultReport(faultWithStack([HEDY_FRAME], { cause: new TypeError('inner') }), { ...context, input: 'sequenceDiagram' })
    expect(report.causes).toEqual(['TypeError: inner'])
    expect(report.input).toBe('sequenceDiagram')
    expect(report.raisedAt).toBe('verdictOf (hedy/src/commands/diagram/mermaid-verdicts.js:7)')
  })

  it('holds no path outside the workspace, so the report can be filed in a public repository', () => {
    const outside = '    at handler (file:///Users/someone/.npm/_npx/tool/index.js:3:9)'
    const report = JSON.stringify(faultReport(faultWithStack([outside, HEDY_FRAME]), context))
    expect(report).not.toContain('/Users/someone')
    expect(report).not.toContain(ROOT)
  })
})

describe('missingFeatureOf', () => {
  it.each([
    ['Option is not defined', 'the global Option'],
    ["Cannot read properties of undefined (reading 'supports')", 'the property supports'],
    ["Cannot read properties of null (reading 'style')", 'the property style'],
    ['window.CSS.supports is not a function', 'the function window.CSS.supports'],
    ['Unexpected end of JSON input', undefined]
  ])('reads %j as %s', (message, feature) => {
    expect(missingFeatureOf(message)).toBe(feature)
  })
})
