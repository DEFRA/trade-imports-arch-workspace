---
name: confluence-read
description: 'Fetch a Confluence page by URL or page id as clean markdown through the hedy CLI so the session can analyse it - summarise, review, extract, compare. Triggers: "read confluence page", "fetch confluence page", "analyse confluence page", "analyze confluence page". Read-only, Confluence-to-session direction. NOT for publishing docs pages (confluence-publish), creating or updating Confluence pages (the create-page/update-page hand tools directly), Jira tickets (jira), or pages whose markdown source lives in trade-imports-documentation - read the source file directly instead.'
---

Fetches one Confluence page, given a page id, a page URL or a share link, through the `hedy` CLI. The page reaches the session as markdown, so the user can summarise, review, extract or compare the page. Read-only: nothing is ever written back to Confluence.

**Bash call hygiene** - one command per Bash call; paths in the literal `~/trade-imports-arch-workspace/...` form. Full rules: [`agent-skills.md`](../../best-practices/skills/agent-skills.md).

## Usage

| Trigger | Steps |
| --- | --- |
| "read confluence page <url>" | Steps 1-3 |
| "fetch confluence page" | Steps 1-2 (stop after presenting the page) |
| "analyse/analyze confluence page" | Steps 1-3 |

NOT for: publishing a docs page (use `confluence-publish`), creating or updating Confluence pages (use the `create-page.sh` / `update-page.sh` hand tools directly), Jira tickets (use `jira`), or pages whose markdown source lives in `trade-imports-documentation` - read the source file from disk instead; the Confluence copy is a rendered artifact of that source file.

Prerequisites: `hedy` on PATH, and `JIRA_USER`, `JIRA_TOKEN` and `JIRA_BASE_URL` in the root `.env`. `hedy` reads that file itself. Never read the file: verify the credentials with the auth check below.

## Step 1: Auth pre-flight

Skip if this session has already verified Confluence auth.

```bash
hedy auth
```

If `hedy` is not found, run `make -C ~/trade-imports-arch-workspace link`.

On failure, relay the error - it names the missing variable or the rejected credential. Do not print credential values.

## Step 2: Fetch the page

```bash
hedy confluence page "<reference>"
```

- The reference is a numeric page id, a full page URL holding `/pages/<id>/`, or a share link (`.../wiki/x/<key>`) on the Atlassian site in `JIRA_BASE_URL`. A share link on another site is refused before any request.
- The first three lines carry the title, then the space, version, update time and author, then the source URL. The body follows as markdown.
- `--format html` gives the raw body instead. `--json` gives a structured result, `{ id, title, space, version: { number, when, by }, url, labels, body }`.

## Step 3: Analyse

Do what the user asked - summarise, review, extract, compare against another page or a workspace doc. Ground every finding in the fetched content, and cite the page title, space and version from the header lines so the analysis is traceable to the exact revision read.

## Completion output

```
confluence-read complete for <page-id>.

Page: <title> (space <KEY>, version <N>, updated <date>)
Analysis: <one line on what was produced>
```

## Commands

| Command | Purpose |
| --- | --- |
| `hedy auth` | Check the credentials, reporting display names only |
| `hedy confluence page <reference>` | Fetch one page as markdown, or as the raw body with `--format html` |
