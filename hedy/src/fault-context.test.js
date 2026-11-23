import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { hedyVersion } from './envelope.js'
import { faultContextOf } from './fault-context.js'

const CHECKOUT = fileURLToPath(new URL('../../', import.meta.url)).replace(/\/$/, '')

describe('faultContextOf', () => {
  it('gives the arguments after the script, the checkout hedy runs from, the hedy and Node versions, the platform and the processor', () => {
    const running = { argv: ['/usr/bin/node', '/bin/hedy', 'diagram', 'check', 'a.mmd'], version: 'v24.15.0', platform: 'darwin', arch: 'arm64' }
    expect(faultContextOf(running)).toEqual({
      argv: ['diagram', 'check', 'a.mmd'],
      workspaceRoot: CHECKOUT,
      versions: { hedy: hedyVersion(), node: 'v24.15.0' },
      platform: 'darwin',
      arch: 'arm64'
    })
  })

  it('reads the running process when given nothing', () => {
    expect(faultContextOf().versions.node).toBe(process.version)
  })
})
