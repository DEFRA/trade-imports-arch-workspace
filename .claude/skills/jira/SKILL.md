---
name: jira
description: 'Create, read and update JIRA tickets: reads through the hedy CLI (one ticket by key, or a JQL search with a flat JSON projection), ticket creation with type/priority/labels/parent and description replacement in Jira wiki markup through the curl+jq scripts in tools/jira/, and an auth pre-flight. Triggers: "create jira ticket", "fetch jira ticket", "read jira ticket", "run jql", "update jira description", "rewrite the ticket". NOT for transitioning or commenting on tickets (no tools exist yet - extend tools/jira/ first), and NOT for Confluence pages - reads are the confluence-read skill, publishing is confluence-publish.'
model: sonnet
---

Create, read and update JIRA issues from any session in this workspace. Reading returns flat JSON the session can reason over directly. Creation posts a new issue and returns its key and browse URL. Updating replaces an issue's description. Reads go through the `hedy` CLI, and creation and update through the scripts in `~/trade-imports-arch-workspace/.claude/tools/jira/`. This skill owns no logic, only the procedure.

**Bash call hygiene** - one command per Bash call; paths in the literal `~/trade-imports-arch-workspace/...` form. Full rules: [`agent-skills.md`](../../best-practices/skills/agent-skills.md).

## Credentials

The read commands and the two scripts read `JIRA_USER`, `JIRA_TOKEN` and `JIRA_BASE_URL`. The scripts take them from the environment, which direnv loads from the workspace `.env`. `hedy` reads the `.env` itself for any variable the environment lacks. Creation additionally needs `JIRA_PROJECT_KEY`, which the pre-flight below does not check: when that variable is unset, `create-ticket.sh` fails naming the variable, and the fix is a line in the workspace `.env`. If any call fails with an auth or unset-variable error, run the pre-flight and report its output:

```bash
hedy auth
```

If `hedy` is not found, run `make -C ~/trade-imports-arch-workspace link`.

## Usage

| Trigger                                 | Steps                      |
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

Read one ticket by key, or search with JQL:

```bash
hedy jira ticket IMTA-13810 --json
```

```bash
hedy jira search 'project = IMTA AND status = "In Progress" ORDER BY updated DESC' --max 50 --json
```

- `--json` prints one envelope line, `{ ok, schema_version, hedy_version, result, errors, metadata }`. When `ok` is false, `errors` lists `{ code, message }` entries.
- `ticket` gives `result` as `{ key, url, summary, status, type, priority, assignee, labels, parent, created, updated, description }`. The description is Jira wiki markup, or null when empty.
- `search` gives `result` as `{ issues: [ ... ] }`, each issue with the same fields minus `description`. `--max` caps the total and defaults to 200.
- Several keys go in one search as `key in (IMTA-13810, IMTA-13811)`.
- A key Jira does not know makes Jira refuse the whole query. The refusal comes back as a `USAGE` error naming the key: drop the key and retry.
- Summarise the result for the user. Do not paste large results verbatim.

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

- read: N issue(s) fetched
- create: <KEY> - <browse URL>
- update: <KEY> - <browse URL>
```

## Commands

| Command | Purpose |
| --- | --- |
| `hedy jira ticket <key>` | Read one issue, description included |
| `hedy jira search '<jql>'` | Read the issues a JQL query matches, page by page, up to `--max` |

## Scripts cheat-sheet

All under `~/trade-imports-arch-workspace/.claude/tools/jira/`:

| Script | Purpose |
| --- | --- |
| `create-ticket.sh` | Create one issue (type, priority, labels, parent, description file) |
| `update-description.sh` | Replace one issue's description (Jira wiki markup) |
