---
name: confluence-read
description: 'Fetch a Confluence page by URL or page id as clean markdown (via the confluence/ hand tools) so the session can analyse it - summarise, review, extract, compare. Triggers: "read confluence page", "fetch confluence page", "analyse confluence page", "analyze confluence page". Read-only, Confluence-to-session direction. NOT for publishing docs pages (confluence-publish), creating or updating Confluence pages (the create-page/update-page hand tools directly), Jira tickets (jira), or pages whose markdown source lives in trade-imports-documentation - read the source file directly instead.'
---

Fetches one Confluence page - given a full URL or a bare page id - through the `tools/confluence/` hand tools and lands it in the session as analysis-ready markdown, so the user can summarise, review, extract or compare it. Read-only: nothing is ever written back to Confluence.

**Bash call hygiene** - one command per Bash call; paths in the literal `~/trade-imports-arch-workspace/...` form. Full rules: [`agent-skills.md`](../../best-practices/skills/agent-skills.md).

## When to use

| Trigger | What to follow |
| --- | --- |
| "read confluence page <url>" | Steps 1-3 |
| "fetch confluence page" | Steps 1-2 (stop after presenting the page) |
| "analyse/analyze confluence page" | Steps 1-3 |

NOT for: publishing a docs page (use `confluence-publish`), creating or updating Confluence pages (use the `create-page.sh` / `update-page.sh` hand tools directly), Jira tickets (use `jira`), or pages whose markdown source lives in `trade-imports-documentation` - read the source file from disk instead; the Confluence copy is a rendered artifact of it.

Prerequisites: `JIRA_USER`, `JIRA_TOKEN` and `JIRA_BASE_URL` in the environment (direnv loads them from the root `.env` - never read that file; verify with the auth check below). Markdown conversion needs `node` - a soft dependency: when node is absent, `md` falls back to the raw HTML body with a notice, which analyses fine.

## Step 1: Auth pre-flight

Skip if this session has already verified Confluence auth.

```bash
~/trade-imports-arch-workspace/.claude/tools/confluence/auth.sh
```

On failure, relay the error - it names the missing variable or the rejected credential. Do not print credential values.

## Step 2: Fetch the page

```bash
~/trade-imports-arch-workspace/.claude/tools/confluence/page.sh "<url-or-id>" md
```

- Accepts the full URL (`.../wiki/spaces/<KEY>/pages/<id>/<title>`), a share-button short link (`.../wiki/x/<key>` - resolved via its redirect automatically), or a bare numeric page id.
- `md` converts the body to markdown via `html_to_md.js` when node is available, and falls back to the raw HTML body with a notice when it is not - either output analyses fine; markdown is just cleaner.
- Unsure the URL is the right page? Run with `summary` first - it prints title, space, version and updated-by without the body.

## Step 3: Analyse

Do what the user asked - summarise, review, extract, compare against another page or a workspace doc. Ground every finding in the fetched content, and cite the page title, space and version from the header lines so the analysis is traceable to the exact revision read.

## Completion output

```
confluence-read complete for <page-id>.

Page: <title> (space <KEY>, version <N>, updated <date>)
Analysis: <one line on what was produced>
```

## Scripts cheat-sheet

All under `~/trade-imports-arch-workspace/.claude/tools/confluence/` (the shared confluence hand-tool domain - this skill owns no scripts of its own):

| Script | Purpose |
| --- | --- |
| `auth.sh` | Verify Confluence credentials (never prints values) |
| `page.sh` | Fetch a page by URL or id; formats `full`, `summary`, `json`, `md` |
| `html_to_md.js` | stdin HTML → stdout markdown; used by `page.sh md` (needs node) |
