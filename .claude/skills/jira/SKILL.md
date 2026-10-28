---
name: jira
description: 'Create, read and update JIRA tickets through the hedy CLI: reads (one ticket by key, or a JQL search with a flat JSON projection), ticket creation from a manifest with type/priority/labels/parent, where a dry run shows the plan and only a confirm with its plan id raises the issue, description replacement in Jira wiki markup with the same dry run and confirmed plan id, and an auth pre-flight. Triggers: "create jira ticket", "fetch jira ticket", "read jira ticket", "run jql", "update jira description", "rewrite the ticket". NOT for transitioning or commenting on tickets (no commands exist yet - extend hedy first), and NOT for Confluence pages - reads are the confluence-read skill, publishing is confluence-publish.'
model: sonnet
---

Create, read and update JIRA issues from any session in this workspace through the `hedy` CLI. Reading returns flat JSON the session can reason over directly. Creation raises a new issue from a manifest and returns its key and browse URL. Updating replaces an issue's description. Creation and update each start with a dry run that sends nothing, and Jira changes only when a confirm carries the plan id the dry run printed. This skill owns no logic, only the procedure.

**Bash call hygiene** - one command per Bash call; paths in the literal `~/trade-imports-arch-workspace/...` form. Full rules: [`agent-skills.md`](../../best-practices/skills/agent-skills.md).

## Credentials

`hedy` reads `JIRA_USER`, `JIRA_TOKEN` and `JIRA_BASE_URL` from the environment, and reads the workspace `.env` itself for any variable the environment lacks. Never read the `.env`. If any command fails with an auth error or names a missing variable, run the pre-flight and report its output:

```bash
hedy auth
```

If `hedy` is not found, run `make -C ~/trade-imports-arch-workspace link`.

## Usage

| Trigger | Steps |
| --- | --- |
| "fetch jira ticket", "read jira ticket" | Reading Tickets |
| "run jql" | Reading Tickets (JQL mode) |
| "create jira ticket" | Creating a Ticket |
| "update jira description", "rewrite the ticket" | Updating a Description |

NOT for transitions or comments - `hedy` has no command for them, so extend `hedy` before promising them. NOT for Confluence pages - reads are the `confluence-read` skill, publishing is `confluence-publish`.

## Writing Ticket Content

Before drafting a summary or a new or replacement description, follow the [editorial skill](../editorial/SKILL.md) and its [language guide](../../best-practices/writing/language.md). Jira fields have a fixed shape, so you do not need to select a Diátaxis mode.

- Keep the summary specific and aim for fewer than 80 characters.
- Put the problem, user need or reason before implementation detail.
- State scope and important boundaries explicitly.
- Write acceptance criteria as observable outcomes that someone can verify.
- Separate context, proposed work and acceptance criteria when the ticket needs all three.
- Preserve exact identifiers and interface labels. In Jira wiki markup, format code tokens as `{{token}}`.

**Write Jira wiki markup, not markdown.** The v2 API accepts any text but renders only wiki markup, so markdown backticks and pipe tables display as literal characters. Wiki markup uses `h3.` headings, `{{token}}` for monospace, `*bold*`, `||header||` table rows and `#` numbered lists.

## Reading Tickets

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

## Creating a Ticket

Creating a ticket is an outward-facing action. The dry run shows the plan and sends nothing, and the dry run is never the user's consent. **Raise the ticket only after the user's own message says to raise the ticket.**

Each ticket has its own folder, `~/trade-imports-arch-workspace/.claude/workareas/jira/<slug>/`, where the slug is a short kebab-case name for the ticket. The folder is gitignored and holds these files:

- `ticket.json` is the manifest.
- `description.jira.txt` holds the description in Jira wiki markup.
- `ticket.created.json` is the receipt, which `hedy` writes the moment the issue exists. The receipt is the record of what was raised.

1. Draft the summary and description using the rules in Writing Ticket Content.
2. Write `description.jira.txt` and `ticket.json` into the ticket's folder with the Write tool. A manifest with every field:

```json
{
  "schema": "hedy-ticket/1",
  "project": "EUDPA",
  "type": "Task",
  "summary": "Tidy the notification validators",
  "descriptionFile": "description.jira.txt",
  "priority": "Medium",
  "parent": "EUDPA-17736",
  "labels": ["technicalImprovement"]
}
```

- `priority`, `parent` and `labels` are optional, and every other key shown is required. `hedy` refuses any key the example does not show.
- Types: `Bug`, `Story`, `Task`, `Epic`. Priorities: `Lowest`, `Low`, `Medium`, `High`, `Highest`. The summary holds up to 255 characters.
- The project key comes from the manifest. Ask the user for the key when the conversation has not named a project.
- `hedy` drops the description's trailing newlines and refuses a blank description.

3. Run the dry run:

```bash
hedy jira create --from ~/trade-imports-arch-workspace/.claude/workareas/jira/<slug>/ticket.json --json
```

- `result` is `{ mode: 'dry-run', planId, project, type, summary, priority, parent, labels, description, warnings }`.
- `warnings` holds an entry when the description is over Jira's limit of 32,767 characters.

4. Show the user the plan: the type, summary, project, parent, labels and priority, every warning verbatim, and the description. Then wait for the user's own message saying to raise the ticket.
5. Confirm with the exact plan id the dry run printed:

```bash
hedy jira create --from ~/trade-imports-arch-workspace/.claude/workareas/jira/<slug>/ticket.json --confirm <planId> --json
```

- `result` is `{ mode: 'created', key, url }`. Always relay the key and the URL to the user.

A confirm can also end in one of these outcomes:

- **Changed Plan.** When the manifest or the description has changed since the dry run, `hedy` exits 2 with "The plan has changed since the dry run. Run the dry run again, then confirm the new plan id." Run the dry run again, show the user the new plan and wait for the user's word again. Never reuse a stale plan id.
- **Existing Receipt.** When the folder already holds a receipt for a different plan, `hedy` exits 2 and names the existing key. Change a raised ticket through Updating a Description, and give a new ticket a new folder.
- **Repeated Confirm.** The same confirm run again creates nothing and returns `{ mode: 'unchanged', key, url }`. When a confirm's outcome is unclear, repeat that confirm from the same folder. A new folder would raise a second issue.

## Updating a Description

Updating is outward-facing like creation, and the same consent rule holds: **replace the description only after the user's own message says to replace the description.** `hedy` replaces the whole description; there is no partial edit.

1. Read the issue with `hedy jira ticket <key> --json` for the current description.
2. Revise the full description using the rules in Writing Ticket Content. Write the revised description with the Write tool to `~/trade-imports-arch-workspace/.claude/workareas/jira/<key>/description.jira.txt`, a folder named after the issue key.
3. Run the dry run:

```bash
hedy jira describe <key> --from ~/trade-imports-arch-workspace/.claude/workareas/jira/<key>/description.jira.txt --json
```

- The dry run reads the issue and sends no update.
- `result` is `{ mode: 'dry-run', planId, key, url, description, unchanged }`.
- When `unchanged` is true, the issue already holds that description: tell the user and stop.

4. Show the user the description that will replace the current one, then wait for the user's own message saying to replace the description.
5. Confirm with the exact plan id the dry run printed:

```bash
hedy jira describe <key> --from ~/trade-imports-arch-workspace/.claude/workareas/jira/<key>/description.jira.txt --confirm <planId> --json
```

- `result` is `{ mode: 'updated', key, url }`. Always relay the key and the URL to the user.
- The same confirm run again changes nothing and returns `{ mode: 'unchanged', key, url }`.

The plan id includes a hash of the issue's description as the dry run read the description. When someone changes the description in Jira between the dry run and the confirm, `hedy` exits 2 with the same "The plan has changed" message as for creation. Read the issue again, show the user the current description, and start again from step 2.

## Completion Output

```
jira <read|create|update> complete.

- read: N issue(s) fetched
- create: <KEY> - <browse URL>
- update: <KEY> - <browse URL>
```

## Commands

| Command | Purpose |
| --- | --- |
| `hedy jira ticket <key>` | Read one issue, description included |
| `hedy jira search '<jql>'` | Read the issues a JQL query matches, page by page, up to `--max` |
| `hedy jira create --from <manifest>` | Print the plan for a new issue; with `--confirm <planId>`, raise the issue that plan describes |
| `hedy jira describe <key> --from <file>` | Print the plan for a description replacement; with `--confirm <planId>`, replace the description |
