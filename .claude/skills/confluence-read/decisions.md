# confluence-read skill - decisions

Recorded during CREATE interview. Update if a shape choice
changes; do not delete entries.

## 1. Purpose

Fetch a Confluence page by URL or page id as clean markdown through the hedy CLI so the session can analyse it - summarise, review, extract, compare.

## 2. Dependencies

**Resolution:** none
**Declared:** (none)
**Reason:** (not applicable)
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

None. The skill calls `hedy confluence page`, and the `tools/confluence/` hand tools no longer hold a read path. The scaffold's helper stubs were deliberately skipped so the existing hand tools would not be overwritten. The domain name differs from the skill name by design.

## 9. Triggers

- "read confluence page"
- "fetch confluence page"
- "analyse confluence page"
- "analyze confluence page"

**Disambiguation:** Read-only, Confluence-to-session direction. Distinct from confluence-publish (session-to-Confluence: builds and publishes docs pages; its NOT-for clause points ad-hoc reads here). Distinct from jira (tickets, not pages). Not for pages whose markdown source lives in trade-imports-documentation - read the source file directly instead.
