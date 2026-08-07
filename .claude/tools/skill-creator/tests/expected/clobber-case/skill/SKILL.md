---
name: test-clobber
description: 'Fixture skill whose helper name collides with an existing script. Triggers: "test clobber". Fixture only. TODO — refine description and add NOT-for clauses pointing at neighbouring skills.'
---

<!-- TODO: one-paragraph intro. State the audience (which tickets,
     which work) and the outcome (what artifact lands where). -->

**Bash call hygiene** - one command per Bash call; paths in the literal
`~/trade-imports-arch-workspace/...` form. Full rules:
[`agent-skills.md`](../../best-practices/skills/agent-skills.md).

## When to use

| Trigger | What to follow |
|---------|----------------|
| "test clobber" | TODO — section name |

NOT for TODO — name out-of-scope cases pointing at the right
neighbouring skill.




## Step 0: Start

```bash
~/trade-imports-arch-workspace/.claude/tools/test-clobber/start-test-clobber.sh TODO_ARGS
```

First stdout line is `MODE: <BRANCH>`. Branch on it.

## Step 1: TODO

<!-- TODO: per-step instructions. -->

## Completion output

```
test-clobber complete for <id>.

Summary:
- TODO key metric

Next: TODO hint.
```

## Scripts cheat-sheet

All under `~/trade-imports-arch-workspace/.claude/tools/test-clobber/`:

| Script | Purpose |
|---|---|
| `start-test-clobber.sh` | TODO — one-line purpose |
