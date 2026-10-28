import { createElement } from 'react'
import { render } from 'ink-testing-library'
import { describe, it, expect, vi } from 'vitest'
import { MenuScreen } from './menu-screen.js'

const items = [
  { label: 'Check the credentials', value: 'auth' },
  { label: 'Jira', value: 'jira' },
  { label: 'Quit', value: 'quit' }
]

const pause = () => new Promise((resolve) => setTimeout(resolve, 30))

const renderMenu = (props = {}) => {
  const selected = []
  const instance = render(createElement(MenuScreen, {
    title: 'hedy',
    items,
    onSelect: (value) => { selected.push(value) },
    ...props
  }))
  return { ...instance, selected }
}

describe('MenuScreen', () => {
  it('renders the title, the subtitle and every item in order', () => {
    const { lastFrame } = renderMenu({ subtitle: 'Choose what to do' })
    const frame = lastFrame()
    const positions = ['hedy', 'Choose what to do', ...items.map(({ label }) => label)].map((text) => frame.indexOf(text))
    expect(positions.every((position) => position > -1)).toBe(true)
    expect(positions).toEqual(positions.toSorted((a, b) => a - b))
  })

  it('gives onSelect the first value when you press Enter', async () => {
    const { stdin, selected } = renderMenu()
    await pause()
    stdin.write('\r')
    await vi.waitFor(() => expect(selected).toEqual(['auth']))
  })

  it('gives onSelect the second value when you press the down arrow then Enter', async () => {
    const { stdin, selected } = renderMenu()
    await pause()
    stdin.write('\u001B[B')
    await pause()
    stdin.write('\r')
    await vi.waitFor(() => expect(selected).toEqual(['jira']))
  })

  it('shows every item when there are more than five', () => {
    const many = ['one', 'two', 'three', 'four', 'five', 'six', 'seven'].map((label) => ({ label, value: label }))
    const { lastFrame } = renderMenu({ items: many })
    for (const { label } of many) expect(lastFrame()).toContain(label)
  })
})
