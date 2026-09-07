---
name: jira
description: 'Create, read and update JIRA tickets via the standalone curl+jq scripts in tools/jira/: single-key or JQL batch fetch with a flat JSON projection, ticket creation with type/priority/labels/parent, description replacement in Jira wiki markup, and an auth pre-flight. Triggers: "create jira ticket", "fetch jira ticket", "read jira ticket", "run jql", "update jira description", "rewrite the ticket". NOT for transitioning or commenting on tickets (no tools exist yet - extend tools/jira/ first), and NOT for Confluence pages - reads are the confluence-read skill, publishing is confluence-publish.'
---

Create, read and update JIRA issues from any session in this workspace. Reading returns a flat JSON array the session can reason over directly; creation posts a new issue and returns its key and browse URL; updating replaces an issue's description. All work is done by the self-contained scripts in `~/trade-imports-arch-workspace/.claude/tools/jira/` - this skill owns no logic, only the procedure.

**Bash call hygiene** - one command per Bash call; paths in the literal `~/trade-imports-arch-workspace/...` form. Full rules: [`agent-skills.md`](../../best-practices/skills/agent-skills.md).

## Credentials

All three scripts read `JIRA_USER`, `JIRA_TOKEN` and `JIRA_BASE_URL` from the environment (loaded from the workspace `.env` by direnv). Creation additionally needs `JIRA_PROJECT_KEY`. If any call fails with an auth or unset-variable error, run the pre-flight and report its output:

```bash
~/trade-imports-arch-workspace/.claude/tools/jira/auth.sh
```

## When to use

| Trigger                                 | What to follow             |
| --------------------------------------- | -------------------------- |
| "fetch jira ticket", "read jira ticket" | Reading tickets            |
| "run jql"                               | Reading tickets (JQL mode) |
| "create jira ticket"                    | Creating a ticket          |
| "update jira description", "rewrite the ticket" | Updating a description |

NOT for transitions or comments - those tools were deliberately not retained; extend `tools/jira/` before promising them. NOT for Confluence pages - reads are the `confluence-read` skill, publishing is `confluence-publish`.

## Writing ticket content

Before drafting a summary or a new or replacement description, follow the [editorial skill](../editorial/SKILL.md) and its [language guide](../../best-practices/writing/language.md). Jira fields have a fixed shape, so you do not need to select a Diátaxis mode.

- Keep the summary specific and aim for fewer than 80 characters.
- Put the problem, user need or reason before implementation detail.
- State scope and important boundaries explicitly.
- Write acceptance criteria as observable outcomes that someone can verify.
- Separate context, proposed work and acceptance criteria when the ticket needs all three.
- Preserve exact identifiers and interface labels. In Jira wiki markup, format code tokens as `{{token}}`.

## Reading tickets

One call, two modes - keys or JQL:

```bash
~/trade-imports-arch-workspace/.claude/tools/jira/fetch.sh IMTA-13810 IMTA-13811
```

```bash
~/trade-imports-arch-workspace/.claude/tools/jira/fetch.sh 'project = IMTA AND status = "In Progress" ORDER BY updated DESC'
```

- Multiple key arguments become one `key in (...)` search; requested keys the search does not return are listed as missing on stderr.
- Raw JQL goes as a single quoted argument.
- Useful flags: `-f fields` (narrow the projection), `-m N` (total cap, default 200), `-r` (raw issue JSON), `-n` (dry run - prints the JQL without calling the API).
- Output is a JSON array on stdout: `key`, `url`, `summary`, `status`, `type`, `priority`, `assignee`, `labels`, `parent`, `created`, `updated`. Summarise for the user; do not paste large arrays verbatim.
- A well-formed but nonexistent key in a batch makes JIRA reject the whole query, naming the offending keys - drop them and retry.

## Creating a ticket

Creating a ticket is an outward-facing action: **show the user the summary, type, priority, labels and description and get their approval before running the script.**

1. Draft the summary and description using the rules in Writing ticket content. Write the description into a file (Write tool, e.g. `/tmp/jira-draft.txt`). **Write Jira wiki markup, not markdown** - the v2 API accepts any text but renders wiki markup only: markdown backticks and pipe tables display as literal characters. Wiki markup: `h3.` headings, `{{token}}` for monospace, `*bold*`, `||header||` table rows, `#` numbered lists.
2. Create:

```bash
~/trade-imports-arch-workspace/.claude/tools/jira/create-ticket.sh -t Task -P Medium -l someLabel -D /tmp/jira-draft.md "Summary line"
```

- Types: `Bug`, `Story`, `Task`, `Epic`. Priorities: `Lowest` to `Highest`. `-l` repeats per label; `-p <KEY>` sets a parent epic; `-a` assigns to the authenticated user.
- The project comes from `JIRA_PROJECT_KEY` - the script fails fast if unset.
- Output is the new key plus `Created: <browse URL>` - always relay the URL to the user.

## Updating a description

Outward-facing like creation: **show the user the new body and get their approval before running the script.** The script replaces the whole description; there is no partial edit.

1. Revise the full description using the rules in Writing ticket content, then write it to a file in Jira wiki markup (see Creating a ticket).
2. Update:

```bash
~/trade-imports-arch-workspace/.claude/tools/jira/update-description.sh -D /tmp/new-body.txt EUDPA-380
```

- Output is the key plus `Updated: <browse URL>` - always relay the URL to the user.

## Completion output

```
jira <read|create> complete.

- read: N issue(s) fetched (M missing: <keys>)
- create: <KEY> - <browse URL>
- update: <KEY> - <browse URL>
```

## Scripts cheat-sheet

All under `~/trade-imports-arch-workspace/.claude/tools/jira/`:

| Script | Purpose |
| --- | --- |
| `fetch.sh` | JQL or batch-key fetch, paginated, flat JSON projection |
| `create-ticket.sh` | Create one issue (type, priority, labels, parent, description file) |
| `update-description.sh` | Replace one issue's description (Jira wiki markup) |
| `auth.sh` | Credential pre-flight - verifies the API accepts `JIRA_USER`/`JIRA_TOKEN` |
