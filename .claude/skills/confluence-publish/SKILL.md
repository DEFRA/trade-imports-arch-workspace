---
name: confluence-publish
description: 'Publish a single documentation page from trade-imports-documentation to Confluence by orchestrating the existing delivery-info-arch-tooling scripts: pre-flight prerequisites (credentials, API access, publishPaths entry, diagram exports), validate Mermaid via the mermaid-check skill, build missing diagrams, publish, and report the outcome with a link to the page. Stops with the reason if the publish cannot proceed. Triggers: "publish to confluence", "push to confluence", "publish page". NOT for validating diagrams alone (mermaid-check), content quality (editorial), the full-estate publish (npm run publish:confluence directly), GitHub Pages (deploys itself via CI), or ad-hoc Confluence page reads (use the confluence-read skill) and one-off pages whose source of truth is Confluence itself (use the hand tools in .claude/tools/confluence/). Owns no build or publish logic - the tooling does the work. Requires npm (Node 22+).'
metadata:
  workspace-deps: delivery-info-arch-tooling trade-imports-documentation npm
---

Publishes one markdown page from the doc repo's `docs/` tree to Confluence (`eaflood.atlassian.net/wiki`), using the `delivery-info-arch-tooling` publisher the doc repo already wraps as npm scripts. The skill's job is orchestration and fail-fast: verify everything the publish needs, run the existing scripts in the right order, and read the publisher's output critically (it has two silent-failure modes, described in Step 4). The outcome is either a page link or a stated reason nothing was published.

## Dependencies

Declared in `metadata.workspace-deps` and pre-flighted by the Step 0 dispatcher (criteria: `patterns.md` §9).

- `trade-imports-documentation` — the doc repo being published from: owns the page tree (`docs/`), the publish config and the npm wrapping (`publish:confluence`, `build:mmd`, `build:diagrams`).
- `delivery-info-arch-tooling` — the library behind those npm scripts: owns the publish pipeline (ADF conversion, diagram attachment, `generated`-label safety). Reached through the doc repo's `file:../delivery-info-arch-tooling` npm dependency, so the pre-flight also checks the doc repo has been `npm install`ed.
- `npm` — runs the wrapping scripts (Node 22+ per the doc repo's README).

Why depend rather than port: the publish pipeline is actively maintained in the tooling, so a port would fork it — and this skill's charter is the opposite ("owns no build or publish logic; the tooling does the work").

**Bash call hygiene** - one command per Bash call; paths in the literal `~/trade-imports-arch-workspace/...` form. Full rules: [`agent-skills.md`](../../best-practices/skills/agent-skills.md).

## When to use

| Trigger                 | What to follow |
| ----------------------- | -------------- |
| "publish to confluence" | Step 0 onward  |
| "push to confluence"    | Step 0 onward  |
| "publish page"          | Step 0 onward  |

NOT for: validating diagrams without publishing (use `mermaid-check`), reviewing or sharpening the page's content (use `editorial`), publishing the whole configured set or a whole space (run `npm run publish:confluence` / `publish:confluence:space` in the doc repo directly), or the GitHub Pages site (deploys automatically on push to main). Also NOT for ad-hoc Confluence work - reading a page by ID or URL is the `confluence-read` skill; one-off pages whose source of truth is Confluence itself, or mirroring Confluence trees to markdown, are the hand tools in `~/trade-imports-arch-workspace/.claude/tools/confluence/`. Pushing a `docs/` page through those hand tools bypasses the pipeline's ADF conversion, diagram attachment, and `generated`-label safety, and creates drift the next pipeline publish overwrites.

Prerequisites the user's shell must hold: credentials in either convention - `CONFLUENCE_USERNAME`/`CONFLUENCE_API_TOKEN` (preferred; what the node publisher reads) or `JIRA_USER`/`JIRA_TOKEN` (the hand tools' convention; the dispatcher bridges them across, it is the same Atlassian account token). `CONFLUENCE_URL` is optional and defaults to `https://eaflood.atlassian.net`. The pre-flight checks all of this and never prints credential values.

## Step 0: Start

```bash
~/trade-imports-arch-workspace/.claude/tools/confluence-publish/start-confluence-publish.sh "<page-path>"
```

`<page-path>` may be absolute, repo-relative, or `docs/`-relative. First stdout line is the branch:

- `MODE: BLOCKED` - relay every `REASON:` line to the user verbatim and stop. Do not work around a blocker; each reason names its remedy (export the variable, add the `publishPaths` entry, fix the path).
- `MODE: READY` - continue. The FACT lines carry everything later steps need: `PAGE` (the `docs/...` path), `SPACE` (target space key), `CONFLUENCE_BASE`, one line per embedded diagram with `png=present|MISSING|STALE` (STALE = a model/diagram source changed after the export), `FENCED_MERMAID_BLOCKS`, `BUILD_NEEDED`, zero or more `BUILD_CMD` lines, and `PUBLISH_CMD`. The command lines are emitted with resolved paths in the `~`-spelled canonical form, so they match the permission allowlist verbatim and nothing you type carries a variable - run them verbatim in later steps. Exception, by design: `BUILD_CMD` lines start with bare `npm` and are not allowlist-covered, so they prompt — a deliberate speed bump before the slow, estate-wide diagram rebuild (A11's documented-exception path).

## Step 1: Validate Mermaid sources (conditional)

If `FENCED_MERMAID_BLOCKS` is greater than 0, or any `MERMAID_COMPONENT` line says `png=MISSING` or `png=STALE` (its source is about to be rebuilt), invoke the `mermaid-check` skill on the page before building: it renders each diagram with mermaid-cli and confirms it parses. Fix what it reports before continuing - the Mermaid build exits on the first failing file, so validating first turns a mid-build failure into a named fix.

If the page has no Mermaid content, skip to Step 2.

## Step 2: Build missing diagrams (conditional)

Only when `BUILD_NEEDED` is not `none`. Run each `BUILD_CMD` line from Step 0 verbatim, one Bash call per command. What they do: `build:mmd` converts every `.mmd` in the doc repo to SVG (`build/mmd/`) and PNG (`generated/diagrams/`, flat, one file per diagram id); `build:diagrams` exports LikeC4 views to `generated/diagrams/` and is the slow one. Neither has a single-file mode.

Then re-run Step 0. It is idempotent; confirm `BUILD_NEEDED: none` before publishing. A diagram still `MISSING` after its build means the id in the markdown does not match any source file - stop and report which id.

## Step 3: Publish

Run the `PUBLISH_CMD` line from Step 0 verbatim. It routes back through the dispatcher in publish mode:

```
~/trade-imports-arch-workspace/.claude/tools/confluence-publish/start-confluence-publish.sh --publish "docs/<path>.md"
```

Publish mode re-runs the pre-flight (so a stale READY cannot publish), refuses with `MODE: BLOCKED` if any diagram export is still missing, bridges whichever credential convention the shell holds into the names the node publisher reads, then execs the doc repo's npm publish from the correct working directory. Its output is the publisher's own log, prefixed with `MODE: PUBLISHING` and the `PAGE`/`SPACE`/`CONFLUENCE_BASE` facts Step 4 needs.

## Step 4: Interpret the output and report

The publisher's summary counts (`Successful / Failed / Skipped`) are not sufficient evidence on their own. Check the log lines:

- `⏭️  Skipping: Page exists but is not safe to update (no 'generated' label)`
  - the page was NOT published, even though the summary still counts it as successful. Report: not published, because the existing Confluence page lacks the `generated` label; the remedy is adding that label to the page in Confluence (a deliberate safety mechanism - never bypass it silently).
- `✅ Updated successfully (ID: <n>)` or `✅ Created successfully (ID: <n>)` - the real success signal. Capture the page ID.
- `⚠️  No Mermaid diagram image found` / `⚠️  Image not found` - the page published but with a missing image; report it as published-degraded and name the asset.
- Non-zero exit or `Failed: ≥1` - report the `❌` line verbatim.

On success, construct the link from Step 0 facts and the captured ID: `<CONFLUENCE_BASE>/spaces/<SPACE>/pages/<ID>`.

## Completion output

```
confluence-publish complete for <PAGE>.

Outcome: created | updated | NOT published (<reason>)
Page: <CONFLUENCE_BASE>/spaces/<SPACE>/pages/<ID>
Degraded: <missing images, if any - otherwise omit this line>

Next: check the page renders as expected in Confluence.
```

## Scripts cheat-sheet

All under `~/trade-imports-arch-workspace/.claude/tools/confluence-publish/`:

| Script | Purpose |
| --- | --- |
| `start-confluence-publish.sh <page-path>` | Pre-flight: credentials (either convention), API access, publishPaths membership, space resolution, diagram PNG inventory. Emits READY facts plus resolved build/publish commands, or BLOCKED reasons. |
| `start-confluence-publish.sh --publish <page-path>` | Re-runs the pre-flight, refuses while diagram exports are missing, bridges credentials, then execs the doc repo's npm publish. |
