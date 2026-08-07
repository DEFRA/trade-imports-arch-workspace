---
name: jira
description: 'Create and read JIRA tickets via the standalone curl+jq scripts in tools/jira/: single-key or JQL batch fetch with a flat JSON projection, ticket creation with type/priority/labels/parent, and an auth pre-flight. Triggers: "create jira ticket", "fetch jira ticket", "read jira ticket", "run jql". NOT for updating, transitioning or commenting on tickets (no tools exist yet - extend tools/jira/ first), and NOT for Confluence pages - reads are the confluence-read skill, publishing is confluence-publish.'
---

Create and read JIRA issues from any session in this workspace. Reading
returns a flat JSON array the session can reason over directly; creation
posts a new issue and returns its key and browse URL. All work is done by
the three self-contained scripts in
`~/trade-imports-arch-workspace/.claude/tools/jira/` - this skill
owns no logic, only the procedure.

**Bash call hygiene** - one command per Bash call; paths in the literal
`~/trade-imports-arch-workspace/...` form. Full rules:
[`agent-skills.md`](../../best-practices/skills/agent-skills.md).

## Credentials

All three scripts read `JIRA_USER`, `JIRA_TOKEN` and `JIRA_BASE_URL` from
the environment (loaded from the workspace `.env` by direnv). Creation
additionally needs `JIRA_PROJECT_KEY`. If any call fails with an auth or
unset-variable error, run the pre-flight and report its output:

```bash
~/trade-imports-arch-workspace/.claude/tools/jira/auth.sh
```

## When to use

| Trigger | What to follow |
|---------|----------------|
| "fetch jira ticket", "read jira ticket" | Reading tickets |
| "run jql" | Reading tickets (JQL mode) |
| "create jira ticket" | Creating a ticket |

NOT for ticket updates, transitions or comments - those tools were
deliberately not retained; extend `tools/jira/` before promising them.
NOT for Confluence pages - use the `confluence-publish` skill.

## Reading tickets

One call, two modes - keys or JQL:

```bash
~/trade-imports-arch-workspace/.claude/tools/jira/fetch.sh IMTA-13810 IMTA-13811
```

```bash
~/trade-imports-arch-workspace/.claude/tools/jira/fetch.sh 'project = IMTA AND status = "In Progress" ORDER BY updated DESC'
```

- Multiple key arguments become one `key in (...)` search; requested keys
  the search does not return are listed as missing on stderr.
- Raw JQL goes as a single quoted argument.
- Useful flags: `-f fields` (narrow the projection), `-m N` (total cap,
  default 200), `-r` (raw issue JSON), `-n` (dry run - prints the JQL
  without calling the API).
- Output is a JSON array on stdout: `key`, `url`, `summary`, `status`,
  `type`, `priority`, `assignee`, `labels`, `parent`, `created`,
  `updated`. Summarise for the user; do not paste large arrays verbatim.
- A well-formed but nonexistent key in a batch makes JIRA reject the
  whole query, naming the offending keys - drop them and retry.

## Creating a ticket

Creating a ticket is an outward-facing action: **show the user the
summary, type, priority, labels and description and get their approval
before running the script.**

1. Draft the description into a file (Write tool, e.g.
   `/tmp/jira-draft.md`). Plain text/markdown - the JIRA v2 API accepts
   it.
2. Create:

```bash
~/trade-imports-arch-workspace/.claude/tools/jira/create-ticket.sh -t Task -P Medium -l someLabel -D /tmp/jira-draft.md "Summary line"
```

- Types: `Bug`, `Story`, `Task`, `Epic`. Priorities: `Lowest` to
  `Highest`. `-l` repeats per label; `-p <KEY>` sets a parent epic;
  `-a` assigns to the authenticated user.
- The project comes from `JIRA_PROJECT_KEY` - the script fails fast if
  unset.
- Output is the new key plus `Created: <browse URL>` - always relay the
  URL to the user.

## Completion output

```
jira <read|create> complete.

- read: N issue(s) fetched (M missing: <keys>)
- create: <KEY> - <browse URL>
```

## Scripts cheat-sheet

All under `~/trade-imports-arch-workspace/.claude/tools/jira/`:

| Script | Purpose |
|---|---|
| `fetch.sh` | JQL or batch-key fetch, paginated, flat JSON projection |
| `create-ticket.sh` | Create one issue (type, priority, labels, parent, description file) |
| `auth.sh` | Credential pre-flight - verifies the API accepts `JIRA_USER`/`JIRA_TOKEN` |
