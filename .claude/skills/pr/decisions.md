# pr skill — decisions

Recorded during CREATE interview. Update if a shape choice
changes; do not delete entries.

## 1. Purpose

Create or edit GitHub pull requests through the attribution-guard script (tools/pr/create-pr.sh): pre-flight the branch, draft the body to the pull-requests best-practices doc, refuse AI attribution deterministically.

## 2. Dependencies

**Resolution:** none
**Declared:** gh
**Why:** No child-project overlap (probed all three 2026-08-14: docs/diagram/publishing pipelines and schema validation only). gh (GitHub CLI) is the one beyond-baseline tool; create-pr.sh pre-flights it and fails with a remedy naming the plain-git fallback.
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

(not answered)

## 9. Triggers

- "create a pr"
- "push to a pr"
- "raise a pull request"
- "open a pull request"
- "gh pr create"
- "edit the pr body"

**Disambiguation:** Owns GitHub pull-request creation and body edits only. NOT for making commits - that is the commit skill; NOT for reviewing PRs - that is the review skill; distinct from /init (project doc bootstrap). Neighbouring workspace skills (jira, confluence-read, confluence-publish) own different systems entirely.
