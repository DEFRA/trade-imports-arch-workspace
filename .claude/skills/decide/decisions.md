# decide skill - decisions

Recorded during CREATE interview. Update if a shape choice
changes; do not delete entries.

## 1. Purpose

Collect every open decision from the conversation and its working records and present them to the user as AskUserQuestion prompts, each framing the problem, the evidence and the consequence, with 2 to 4 options and the recommendation first; then record the answers and act only on explicit instructions.

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

(not answered)

## 9. Triggers

- "/decide"
- "present the decisions"
- "give me the decisions as prompts"
- "ask me the open questions"
- "what do I need to decide"

**Disambiguation:** Distinct from /init (CLAUDE.md scaffolding) and from editorial-triage, whose Decide section and spot check close review findings inside a triage run; /decide gathers any open decisions of the current work, from any domain, and puts them to the user as question prompts. It decides nothing itself and owns no domain state.
