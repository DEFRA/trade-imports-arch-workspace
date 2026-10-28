import { describe, it, expect } from 'vitest'
import { issueKeySchema } from './issue-key.js'

describe('issueKeySchema', () => {
  it.each(['ABC-123', 'abc-1', 'A1B2-9'])('accepts %s and returns it unchanged', (key) => {
    expect(issueKeySchema.parse(key)).toBe(key)
  })

  it.each(['ABC_123', '123-ABC', 'ABC-', '-123', 'ABC-12a', 'ABC 123'])('refuses %s with the message naming the key and the next step', (key) => {
    const result = issueKeySchema.safeParse(key)
    expect(result.success).toBe(false)
    expect(result.error.issues.map(({ message }) => message)).toEqual([
      `The key ${key} is not a Jira issue key such as ABC-123. Give the key of one issue, then run the command again.`
    ])
  })
})
