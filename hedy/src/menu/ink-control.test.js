import { createElement } from 'react'
import { Text } from 'ink'
import { render as testRender } from 'ink-testing-library'
import { describe, it, expect, afterEach } from 'vitest'
import { getCurrent, mount, unmount } from './ink-control.js'

const textOf = (label) => createElement(Text, null, label)

const recordingRender = () => {
  const calls = []
  const render = (element, options) => {
    const instance = testRender(element)
    const unmounts = []
    calls.push({ element, options, unmounts })
    return {
      ...instance,
      unmount: () => {
        unmounts.push(true)
        instance.unmount()
      }
    }
  }
  return { calls, render }
}

afterEach(() => {
  unmount()
})

describe('mount', () => {
  it('renders the element through the injected render and records the instance', () => {
    const instance = mount(textOf('hello-one'), { render: testRender })
    expect(getCurrent()).toBe(instance)
    expect(instance.lastFrame()).toContain('hello-one')
  })

  it('passes the injected streams to render with exit on Ctrl+C', () => {
    const { calls, render } = recordingRender()
    const streams = { stdout: { name: 'out' }, stdin: { name: 'in' }, stderr: { name: 'err' } }
    mount(textOf('streams'), { render, ...streams })
    expect(calls.map(({ options }) => options)).toEqual([{ ...streams, exitOnCtrlC: true }])
  })

  it('unmounts the first instance when a second mount runs', () => {
    const { calls, render } = recordingRender()
    mount(textOf('first'), { render })
    const second = mount(textOf('second'), { render })
    expect(calls.map(({ unmounts }) => unmounts.length)).toEqual([1, 0])
    expect(getCurrent()).toBe(second)
    expect(second.lastFrame()).toContain('second')
  })
})

describe('unmount', () => {
  it('unmounts the current instance and clears it', () => {
    const { calls, render } = recordingRender()
    mount(textOf('temp'), { render })
    unmount()
    expect(calls.map(({ unmounts }) => unmounts.length)).toEqual([1])
    expect(getCurrent()).toBe(undefined)
  })

  it('does nothing when nothing is mounted', () => {
    expect(() => unmount()).not.toThrow()
    expect(getCurrent()).toBe(undefined)
  })
})
