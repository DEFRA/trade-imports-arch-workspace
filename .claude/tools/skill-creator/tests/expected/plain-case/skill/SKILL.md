---
name: test-plain
description: 'Fixture skill with JSON state, fan-out and no dependencies. Triggers: "test plain". Fixture only. TODO — refine description and add NOT-for clauses pointing at neighbouring skills.'
---

<!-- TODO: one-paragraph intro. State the audience (which tickets,
     which work) and the outcome (what artifact lands where). -->

**Bash call hygiene** - one command per Bash call; paths in the literal
`~/trade-imports-arch-workspace/...` form. Full rules:
[`agent-skills.md`](../../best-practices/skills/agent-skills.md).

## When to use

| Trigger | What to follow |
|---------|----------------|
| "test plain" | TODO — section name |

NOT for TODO — name out-of-scope cases pointing at the right
neighbouring skill.


## Worker references

| Persona | Used in | Artifact |
|---|---|---|
| `references/FIXTURE_WORKER.md` | TODO step | TODO artifact |

Spawn idiom — Task tool, `subagent_type: general-purpose`,
prompt begins:

```
Follow the instructions in ~/trade-imports-arch-workspace/.claude/skills/test-plain/references/<NAME>.md.

<per-spawn context>
```

## State

Canonical state is JSON at
`~/trade-imports-arch-workspace/.claude/workareas/test-plain/<id>/state.json`.
Schema: `assets/test-plain-schema.md`. Mutated only via
`.claude/tools/test-plain/*.sh` helpers (atomic `jq ... > tmp; mv tmp file`).

## Step 0: Start

```bash
~/trade-imports-arch-workspace/.claude/tools/test-plain/start-test-plain.sh TODO_ARGS
```

First stdout line is `MODE: <BRANCH>`. Branch on it.

## Step 1: TODO

<!-- TODO: per-step instructions. -->

## Completion output

```
test-plain complete for <id>.

Summary:
- TODO key metric

Next: TODO hint.
```

## Scripts cheat-sheet

All under `~/trade-imports-arch-workspace/.claude/tools/test-plain/`:

| Script | Purpose |
|---|---|
| `start-test-plain.sh` | TODO — one-line purpose |
| `render-test-plain.sh` | TODO — one-line purpose |
