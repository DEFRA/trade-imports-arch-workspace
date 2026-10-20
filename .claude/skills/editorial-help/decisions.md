# editorial-help skill - decisions

Recorded during CREATE interview. Update if a shape choice
changes; do not delete entries.

## 1. Purpose

On demand, help a user choose, run and customise the editorial tools (editorial, editorial-triage, design-consistency, the names and prose checks, /decide): ask what they have and want, print the exact command with its measured cost and next step, start the chosen tool, and say which file customises what at the three levels (workspace rules, document-set profile, one run).

## 2. Dependencies

**Resolution:** none
**Declared:** (none)
**Reason:** (not applicable)
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

- start-editorial-help

## 9. Triggers

- "/editorial-help"
- "editorial help"
- "how do I use the editorial tools"
- "which editorial tool should I use"
- "how do I customise the editorial checks"

**Disambiguation:** Routes and explains only: the editorial skill does the pass, editorial-triage closes findings, design-consistency finds contradictions, /decide asks the questions; this skill picks among them, prints the command and cost, and starts the one chosen. Distinct from /init, which scaffolds CLAUDE.md.
