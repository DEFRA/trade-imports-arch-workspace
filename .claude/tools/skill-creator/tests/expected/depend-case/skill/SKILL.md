---
name: test-depend
description: 'Fixture skill exercising the depend path. Triggers: "test depend". Fixture only. TODO — refine description and add NOT-for clauses pointing at neighbouring skills.'
metadata:
  dependencies: demo-project demo-tool
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
| "test depend" | TODO — section name |

NOT for TODO — name out-of-scope cases pointing at the right
neighbouring skill.

## Dependencies

This skill needs demo-project demo-tool
at runtime instead of a local port.
Why: fixture justification.
Declared in the frontmatter `metadata.dependencies` (format contract:
`best-practices/skills/agent-skills.md` → "Dependencies frontmatter");
verified machine-wide by `check-deps.sh`; pre-flighted where the skill
runs — `MODE: BLOCKED` with a REASON naming the remedy when a
dependency is missing. Keep this list in sync with what the steps
actually invoke.



## Step 0: Start

```bash
~/trade-imports-arch-workspace/.claude/tools/test-depend/start-test-depend.sh TODO_ARGS
```

First stdout line is `MODE: <BRANCH>`. Branch on it.

## Step 1: TODO

<!-- TODO: per-step instructions. -->

## Completion output

```
test-depend complete for <id>.

Summary:
- TODO key metric

Next: TODO hint.
```

## Scripts cheat-sheet

All under `~/trade-imports-arch-workspace/.claude/tools/test-depend/`:

| Script | Purpose |
|---|---|
| `start-test-depend.sh` | TODO — one-line purpose |
