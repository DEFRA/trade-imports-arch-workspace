# editorial-triage skill - decisions

Recorded during CREATE interview. Update if a shape choice
changes; do not delete entries.

## 1. Purpose

Close the findings of an editorial review: grade every finding into one closing move against the calibrated rubric, score the run, build the closing plan, spot-check the batch with the user, and apply the removals, corrections and rewordings to the pages as an uncommitted diff.

## 2. Dependencies

**Resolution:** none
**Declared:** (none)
**Why:** (not applicable)
**Pattern reference:** patterns.md §9

## 3. State shape

**Choice:** json
**Pattern reference:** patterns.md §1

## 4. Dispatcher

**Choice:** false
**Pattern reference:** patterns.md §2

## 5. Pre-baked context

**Choice:** false
**Pattern reference:** patterns.md §3

## 6. Worker fan-out

**Choice:** true
**Workers:** GRADER, LEGACY_CLASSIFIER
**Pattern reference:** patterns.md §5

## 7. Walker

**Choice:** false
**Note:** the user decides one closing move per finding through the spot check and the plan's Decide section, not a keystroke string per page.
**Pattern reference:** patterns.md §7

## 8. Helpers introduced

- build-triage
- grade-triage

## 9. Triggers

- "triage the review"
- "triage findings"
- "editorial triage"
- "triage the editorial review"

**Disambiguation:** Not /init (CLAUDE.md scaffolding). Not editorial (writes and reviews prose) nor editorial-review (produces findings). This skill consumes review findings and produces a decision report; it never edits the documents.
