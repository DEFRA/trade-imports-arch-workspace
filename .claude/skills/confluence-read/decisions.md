# confluence-read skill — decisions

Recorded during CREATE interview. Update if a shape choice
changes; do not delete entries.

## 1. Purpose

Fetch a Confluence page by URL or page id as clean markdown (via the confluence/ hand tools) so the session can analyse it - summarise, review, extract, compare.

## 2. Dependencies

**Resolution:** none
**Declared:** (none)
**Why:** (not applicable)
**Pattern reference:** patterns.md §9

## 3. State shape

**Choice:** prose
**Pattern reference:** patterns.md §1

## 4. Dispatcher

**Choice:** false
**Pattern reference:** patterns.md §2

## 5. Pre-baked context

**Choice:** false
**Pattern reference:** patterns.md §3

## 6. Worker fan-out

**Choice:** false
**Workers:** 
**Pattern reference:** patterns.md §5

## 7. Walker

**Choice:** false
**Pattern reference:** patterns.md §7

## 8. Helpers introduced

None — the skill orchestrates the pre-existing `tools/confluence/`
hand-tool domain (`auth.sh`, `page.sh`, `html_to_md.js`; `page.sh`
gained an `md` format for this skill). The scaffold's helper stubs were
deliberately skipped so the existing hand tools would not be
overwritten; domain name ≠ skill name here by design.

## 9. Triggers

- "read confluence page"
- "fetch confluence page"
- "analyse confluence page"
- "analyze confluence page"

**Disambiguation:** Read-only, Confluence-to-session direction. Distinct from confluence-publish (session-to-Confluence: builds and publishes docs pages; its NOT-for clause points ad-hoc reads here). Distinct from jira (tickets, not pages). Not for pages whose markdown source lives in trade-imports-documentation - read the source file directly instead.
