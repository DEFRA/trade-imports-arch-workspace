---
name: test-depend
description: 'Fixture skill exercising the depend path and YAML''s apostrophe escaping. Triggers: "test depend". Fixture only. TODO — refine description and add NOT-for clauses pointing at neighbouring skills.'
metadata:
  workspace-deps: demo-project demo-tool
---

<!-- TODO: one-paragraph intro. State the audience (which tickets, which work) and the outcome (what artifact lands where). -->

**Bash call hygiene** - one command per Bash call; paths in the literal `~/trade-imports-arch-workspace/...` form. Full rules: [`agent-skills.md`](../../best-practices/skills/agent-skills.md).

## When to use

| Trigger | What to follow |
|---------|----------------|
| "test depend" | TODO — section name |

NOT for TODO — name out-of-scope cases pointing at the right neighbouring skill.

## Dependencies

This skill needs demo-project demo-tool — invoked at runtime instead of a local port. Why: fixture justification. Declared in `metadata.workspace-deps`. Format: `agent-skills.md` → "Dependencies frontmatter"; well-formed criteria (pre-flight, description mention, check-deps): `patterns.md` §9. Keep the list in sync with what the steps actually invoke.

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
