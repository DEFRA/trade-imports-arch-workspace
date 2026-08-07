# confluence-publish skill — decisions

Recorded during CREATE interview. Update if a shape choice
changes; do not delete entries.

## 1. Purpose

Publish a single documentation page to Confluence by orchestrating the existing delivery-info-arch-tooling scripts: pre-flight the prerequisites (Confluence/JIRA access, env vars, config entry), build and validate the source files (invoking the mermaid-check skill when the page carries Mermaid diagrams), stop with the reason if the publish cannot proceed, otherwise publish and report the outcome with a link to the page.

## 2. State shape

**Choice:** prose
**Pattern reference:** docs/best-practices/skills/patterns.md §1

## 3. Dispatcher

**Choice:** true
**Pattern reference:** patterns.md §2

## 4. Pre-baked context

**Choice:** false
**Pattern reference:** patterns.md §3

## 5. Worker fan-out

**Choice:** false
**Workers:** 
**Pattern reference:** patterns.md §5

## 6. Walker

**Choice:** false
**Pattern reference:** patterns.md §7

## 7. Helpers introduced

- start-confluence-publish
- (5 Aug 2026) gained a `--publish` mode: re-runs the pre-flight, refuses
  while diagram exports are missing, bridges `JIRA_USER`/`JIRA_TOKEN` into
  the `CONFLUENCE_*` names the node publisher reads, then execs the doc
  repo's npm publish. Why one script, two modes rather than a second helper:
  the credential mapping must happen inside a script (never in a typed
  command), publish must never run against a stale pre-flight, and the
  emitted `PUBLISH_CMD` stays inside the already-allowlisted tools directory
  so no npm permission prompt is needed.

## 8. Triggers

- "publish to confluence"
- "push to confluence"
- "publish page"

**Disambiguation:** Distinct from Claude Code built-in /init (CLAUDE.md scaffolding, no publishing). Distinct from mermaid-check (validates diagram syntax and rendering, never publishes): this skill invokes mermaid-check as its diagram-validation step rather than duplicating it. Distinct from editorial (content quality, not delivery). Orchestrates the existing delivery-info-arch-tooling build and publish scripts for one page; owns no build or publish logic of its own. The bare phrase publish page defaults here because Confluence is the only push target needing a skill; GitHub Pages deploys automatically via CI.

## 9. Dependencies (retrofit)

**Resolution:** depend
**Declared:** delivery-info-arch-tooling trade-imports-documentation npm
**Why:** the publish pipeline (ADF conversion, diagram attachment,
generated-label safety) is actively maintained in the tooling; a port
would fork it, and this skill's charter is the opposite — owns no build
or publish logic.
**Pattern reference:** patterns.md §9

(6 Aug 2026) Retrofitted as the proving case when pattern 9 was
introduced: dependencies declared in the metadata frontmatter
(key renamed to `workspace-deps` on 7 Aug 2026 for metadata-namespace
uniqueness), a `## Dependencies` body section added, and
`start-confluence-publish.sh` gained the tooling-presence and
npm-install pre-flights (previously a missing tooling surfaced as a raw
npm error mid-publish).
