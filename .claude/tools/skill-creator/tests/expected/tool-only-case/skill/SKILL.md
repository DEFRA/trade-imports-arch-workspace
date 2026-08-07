---
name: test-toolonly
description: 'Fixture skill declaring a tool without depending, with zero helpers. Triggers: "test tool only". Fixture only. TODO — refine description and add NOT-for clauses pointing at neighbouring skills.'
metadata:
  workspace-deps: demo-tool
---

<!-- TODO: one-paragraph intro. State the audience (which tickets,
     which work) and the outcome (what artifact lands where). -->

## Path conventions

Cross-workspace paths use the literal home-relative form —
`~/trade-imports-arch-workspace/.claude/tools/<domain>/`,
`~/trade-imports-arch-workspace/.claude/best-practices/`,
`~/trade-imports-arch-workspace/.claude/workareas/`. Bash
expands `~` automatically. Skill-internal references stay
relative (`references/<NAME>.md`, `assets/<NAME>.md`).

**Bash call hygiene** - one command per Bash call. Full rule
table: [`agent-skills.md`](../../best-practices/skills/agent-skills.md)
→ "Bash call hygiene".

## When to use

| Trigger | What to follow |
|---------|----------------|
| "test tool only" | TODO — section name |

NOT for TODO — name out-of-scope cases pointing at the right
neighbouring skill.

## Dependencies

This skill needs demo-tool
beyond the workspace baseline (bash, curl, jq, git).
Declared in the frontmatter `metadata.workspace-deps` (format contract:
`best-practices/skills/agent-skills.md` → "Dependencies frontmatter");
verified machine-wide by `check-deps.sh`; pre-flighted where the skill
runs — `MODE: BLOCKED` with a REASON naming the remedy when a
dependency is missing. Keep this list in sync with what the steps
actually invoke.




## Step 1: TODO

<!-- TODO: per-step instructions. -->

## Completion output

```
test-toolonly complete for <id>.

Summary:
- TODO key metric

Next: TODO hint.
```

## Scripts cheat-sheet

All under `~/trade-imports-arch-workspace/.claude/tools/test-toolonly/`:

| Script | Purpose |
|---|---|

