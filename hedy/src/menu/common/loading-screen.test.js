import { createElement } from 'react'
import { render } from 'ink-testing-library'
import { describe, it, expect } from 'vitest'
import { LoadingScreen } from './loading-screen.js'

describe('LoadingScreen', () => {
  it('renders the message beside the spinner', () => {
    const { lastFrame } = render(createElement(LoadingScreen, { message: 'Checking the Jira and Confluence credentials' }))
    expect(lastFrame()).toContain('Checking the Jira and Confluence credentials')
  })
})
