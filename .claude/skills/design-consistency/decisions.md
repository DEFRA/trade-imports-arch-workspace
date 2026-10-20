# design-consistency skill - decisions

Recorded during CREATE interview. Update if a shape choice
changes; do not delete entries.

## 1. Purpose

Check a set of design pages for statements that cannot all hold: one extractor per page lists the page rules as structured facts, a script merges them into one register sorted by actor and object, one checker reads only the register and lists the contradictions, and each contradiction goes to the author as a question with both quotes; the skill never edits a page.

## 2. Dependencies

**Resolution:** none
**Declared:** (none)
**Reason:** (not applicable)
**Pattern reference:** patterns.md §9

## 3. State shape

**Choice:** json
**Pattern reference:** patterns.md §1

## 4. Dispatcher

**Choice:** true
**Pattern reference:** patterns.md §2

## 5. Pre-baked context

**Choice:** false
**Pattern reference:** patterns.md §3

## 6. Worker fan-out

**Choice:** true
**Workers:** FACT_EXTRACTOR, CONSISTENCY_CHECKER
**Pattern reference:** patterns.md §5

## 7. Walker

**Choice:** false
**Pattern reference:** patterns.md §7

## 8. Helpers introduced

- start-design-consistency
- build-register
- render-design-consistency

## 9. Triggers

- "check design consistency"
- "design consistency check"
- "check these pages for contradictions"
- "find contradictions across the pages"
- "do the pages contradict each other"

**Disambiguation:** Distinct from /init (CLAUDE.md scaffolding). Distinct from editorial, which reviews prose and structure and closes by rewrite: this skill checks the facts the pages state against each other and closes by a question to the author, never a rewrite. Distinct from editorial-triage, which closes review findings, and from /decide, which only puts questions: design-consistency produces the contradictions that /decide then puts.
