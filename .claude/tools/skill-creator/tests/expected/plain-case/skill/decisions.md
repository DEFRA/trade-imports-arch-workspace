# test-plain skill — decisions

Recorded during CREATE interview. Update if a shape choice
changes; do not delete entries.

## 1. Purpose

Fixture skill with JSON state, fan-out and no dependencies.

## 2. Dependencies

**Resolution:** none
**Declared:** (none)
**Why:** (not applicable)
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
**Workers:** FIXTURE_WORKER
**Pattern reference:** patterns.md §5

## 7. Walker

**Choice:** false
**Pattern reference:** patterns.md §7

## 8. Helpers introduced

- start-test-plain
- render-test-plain

## 9. Triggers

- "test plain"

**Disambiguation:** Fixture only.
