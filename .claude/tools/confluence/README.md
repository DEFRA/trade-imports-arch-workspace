# Confluence helper scripts

Scripts mirror the `jira/` helpers and use the same `JIRA_USER`/`JIRA_TOKEN` credentials (API token for Atlassian Cloud). Reads are not here: run `hedy confluence page <reference>`.

## Auth variables

- `JIRA_USER` (email) - required
- `JIRA_TOKEN` - required
- `JIRA_BASE_URL` (e.g. `https://eaflood.atlassian.net`) - required

## Scripts

- `create-page.sh` / `update-page.sh` - create/update a page from wiki markup. `update-page.sh` refuses pages carrying the pipeline's `generated` label (override name via `GENERATED_LABEL`; `--force` to overwrite anyway) so hand edits can't clobber confluence-publish-managed pages.

## Examples

```bash
# Check auth
hedy auth

# Page as markdown, by id or URL
hedy confluence page 12345678
hedy confluence page "https://eaflood.atlassian.net/wiki/spaces/KEY/pages/12345678/Some+Title"

# Raw HTML body
hedy confluence page 12345678 --format html

# Structured JSON envelope
hedy confluence page 12345678 --json
```

The `confluence-read` skill runs `hedy auth`, then `hedy confluence page`, for agent sessions.
