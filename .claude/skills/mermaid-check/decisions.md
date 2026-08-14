# mermaid-check skill - decisions

Recorded during CREATE interview. Update if a shape choice
changes; do not delete entries.

## 1. Purpose

Authors and verifies Mermaid diagrams in Markdown files and standalone .mmd files, rendering each to confirm it parses before a doc ships.

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

- start-mermaid-check
- render-mermaid

## 8. Triggers

- "check mermaid"
- "validate diagrams"
- "verify mermaid renders"
- "add a diagram"

**Disambiguation:** Not /init (which scaffolds CLAUDE.md). Owns Mermaid syntax and render correctness only: label wording, jargon and acronym-on-first-use belong to editorial, which this skill hands off to and is handed off from. Not for LikeC4 .c4 models, which have their own validate and export commands.
