# test-depend skill — decisions

Recorded during CREATE interview. Update if a shape choice
changes; do not delete entries.

## 1. Purpose

Fixture skill exercising the depend path.

## 2. Dependencies

**Resolution:** depend
**Declared:** demo-project demo-tool
**Why:** fixture justification
**Pattern reference:** patterns.md §9

## 3. State shape

**Choice:** prose
**Pattern reference:** patterns.md §1

## 4. Dispatcher

**Choice:** true
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

- start-test-depend

## 9. Triggers

- "test depend"

**Disambiguation:** Fixture only.
