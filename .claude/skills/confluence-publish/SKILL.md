---
name: confluence-publish
description: 'Publish a single documentation page from trade-imports-documentation to Confluence through hedy confluence publish, which runs the pre-flight and the docs repo publisher and reports the outcome with a link to the page. The skill runs the diagram builds a failed pre-flight names. The command publishes at once with no dry run, so the skill runs the command only when the user has asked to publish that page. Triggers: "publish to confluence", "push to confluence", "publish page". NOT for validating diagrams without publishing (mermaid-check), content quality (editorial), the full-estate publish (npm run publish:confluence directly), GitHub Pages (a separate workflow), or ad-hoc Confluence page reads (use the confluence-read skill) and one-off pages whose source of truth is Confluence itself (use the hand tools in .claude/tools/confluence/). Requires npm (Node 24).'
model: sonnet
effort: low
metadata:
  workspace-deps: delivery-info-arch-tooling trade-imports-documentation npm
---

Publishes one markdown page from the docs repo's `docs/` tree to Confluence through `hedy confluence publish`. The command checks everything the publish needs, runs the docs repo's publisher, and reports either a page link or the reason nothing was published. The command publishes at once when its pre-flight passes, with no dry run. This skill owns no build or publish logic, only the procedure.

**Bash call hygiene** - one command per Bash call; paths in the literal `~/trade-imports-arch-workspace/...` form. Full rules: [`agent-skills.md`](../../best-practices/skills/agent-skills.md).

## Usage

| Trigger | Steps |
| --- | --- |
| "publish to confluence", "push to confluence", "publish page" | Steps 1 to 4 |

NOT for validating diagrams without publishing (use `mermaid-check`), reviewing the page's content (use `editorial`), publishing the whole configured set or a whole space (run `npm run publish:confluence` or `publish:confluence:space` in the docs repo directly), or the GitHub Pages site. Reading a page by id or URL is the `confluence-read` skill. One-off pages whose source of truth is Confluence itself are the hand tools in `~/trade-imports-arch-workspace/.claude/tools/confluence/`, never a route for a `docs/` page.

## Dependencies

- `trade-imports-documentation` holds the pages, the publish config and the npm scripts for the publish and the diagram builds.
- `delivery-info-arch-tooling` is the publisher behind those scripts, reached through the docs repo's npm dependency.
- `npm` runs those scripts, both for `hedy` and for the builds.

A port of the publisher would fork a pipeline the tooling maintains, so the skill depends on the tooling.

## Credentials

`hedy` reads `JIRA_USER`, `JIRA_TOKEN` and `JIRA_BASE_URL` from the environment, then from the workspace `.env` for any variable the environment lacks. Never read the `.env`. If the publish fails with an auth error, run the pre-flight and report its output:

```bash
hedy auth
```

If `hedy` is not found, run `make -C ~/trade-imports-arch-workspace link`.

## Step 1: Confirm the Request

The command publishes at once, so run the command only when the user's own message asks to publish this page. The reruns in Step 3 serve the same request and need no new consent.

## Step 2: Publish

```bash
hedy confluence publish "<page>" --json
```

- `<page>` is a `.md` file under `docs/`, given as an absolute path or relative to the current folder, the docs repo or its `docs/` folder.
- The command prints one envelope line, `{ ok, schema_version, hedy_version, result, errors, metadata }`. The publisher's log streams to stderr as progress.

## Step 3: Handle a Failure

When `ok` is false, relay each message in `errors` verbatim and stop. Each message names its remedy, so never work around a refusal. Three failures are handled here instead:

1. **Mermaid exports missing or stale.** When the message names `build:mmd`, invoke the `mermaid-check` skill on the page first, because the Mermaid build stops at the first file that fails to parse. Then run the Mermaid build, then the publish command again.
2. **LikeC4 exports missing or stale.** When the message names `build:diagrams`, run the LikeC4 build, then the publish command again.
3. **Failed image uploads.** The page text is live and the named images show as broken. Run the publish command once more. If the second run fails too, relay the message and stop.

The two builds are the only commands this skill runs besides `hedy`, each one per Bash call, typed exactly as below and never copied from a message, because a page's diagram ids appear in the message text:

```bash
npm --prefix ~/trade-imports-arch-workspace/trade-imports-documentation run build:mmd
npm --prefix ~/trade-imports-arch-workspace/trade-imports-documentation run build:diagrams
```

Each build prompts for permission by design, because both builds cover the whole docs repo. When the publish fails on the same exports after the build, the page names a diagram id that matches no source file. Relay the message and stop.

## Step 4: Report the Outcome

When `ok` is true, `result` is `{ mode, page, id, title, space, url, version, warnings, links }`, and `mode` is `created` or `updated`. Report the following:

- The outcome, and the page link from `url`.
- Each line in `warnings`, naming the asset or link the line concerns. A warning marks a missing image, a link left pointing at GitHub or unchanged, an anchor that matches no heading, or an external link the publisher could not reach, which the user checks by hand.
- The links line from `links`, which is null when the publisher ran no link check.

## Completion Output

```
confluence-publish complete for <page>.

Outcome: created | updated
Page: <url>
Degraded: <each warning, or omit this line>
Links: <checked> checked; broken <b>, external unreachable <e>

Next: check the page renders as expected in Confluence.
```

When `links` is null, write `Links: no link check ran`.

## Commands

`hedy confluence publish <page>` publishes one page after its pre-flight, and `hedy auth` checks the credentials.
