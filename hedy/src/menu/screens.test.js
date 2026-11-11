import { describe, it, expect } from 'vitest'
import { SCREENS } from './screens.js'

describe('SCREENS', () => {
  it('is frozen, so no caller can add or change a screen id', () => {
    expect(Object.isFrozen(SCREENS)).toBe(true)
  })

  it('gives every screen a unique kebab-case id', () => {
    const ids = Object.values(SCREENS)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[a-z]+(-[a-z]+)*$/)
  })

  it('holds the main, loading and error screens', () => {
    expect(SCREENS).toMatchObject({ MAIN: 'main', LOADING: 'loading', ERROR: 'error' })
  })
})
