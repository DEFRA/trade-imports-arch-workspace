# Confluence helper scripts

Scripts mirror the `jira/` helpers and use the same `JIRA_USER`/`JIRA_TOKEN` credentials (API token for Atlassian Cloud).

## Auth variables

- `JIRA_USER` (email) – required
- `JIRA_TOKEN` – required
- `JIRA_BASE_URL` (e.g. `https://eaflood.atlassian.net`) – required by `page.sh`

## Scripts

- `auth.sh` – verify Confluence auth
- `page.sh` – fetch page details/content by page ID **or full page URL** (the numeric id is extracted from `/pages/<id>/` URLs)
- `html_to_md.js` – Confluence HTML → markdown, stdin→stdout, no npm dependencies (used by `page.sh md`; needs node)
- `create-page.sh` / `update-page.sh` – create/update a page from wiki markup. `update-page.sh` refuses pages carrying the pipeline's `generated` label (override name via `GENERATED_LABEL`; `--force` to overwrite anyway) so hand edits can't clobber confluence-publish-managed pages.

## Examples

```bash
# Check auth
./confluence/auth.sh

# Full page output (HTML body included) — by id or URL
./confluence/page.sh 12345678
./confluence/page.sh "https://eaflood.atlassian.net/wiki/spaces/KEY/pages/12345678/Some+Title"

# Markdown (best for analysis; falls back to HTML with a notice if node is absent)
./confluence/page.sh 12345678 md

# Summary only
./confluence/page.sh 12345678 summary

# Raw JSON
./confluence/page.sh 12345678 json
```

The `confluence-read` skill wraps the read path (auth → `page.sh md` → analysis) for agent sessions.
