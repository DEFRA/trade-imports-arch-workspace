import { z } from 'zod'

export const issueKeySchema = z.string().regex(/^[A-Za-z][A-Za-z0-9]*-\d+$/, {
  error: ({ input }) => `The key ${input} is not a Jira issue key such as ABC-123. Give the key of one issue, then run the command again.`
})
