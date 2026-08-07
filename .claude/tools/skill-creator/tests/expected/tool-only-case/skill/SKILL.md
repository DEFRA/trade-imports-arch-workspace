---
name: test-toolonly
description: 'Fixture skill declaring a tool without depending, with zero helpers. Triggers: "test tool only". Fixture only. TODO — refine description and add NOT-for clauses pointing at neighbouring skills.'
metadata:
  workspace-deps: demo-tool
---

<!-- TODO: one-paragraph intro. State the audience (which tickets,
     which work) and the outcome (what artifact lands where). -->

**Bash call hygiene** - one command per Bash call; paths in the literal
`~/trade-imports-arch-workspace/...` form. Full rules:
[`agent-skills.md`](../../best-practices/skills/agent-skills.md).

## When to use

| Trigger | What to follow |
|---------|----------------|
| "test tool only" | TODO — section name |

NOT for TODO — name out-of-scope cases pointing at the right
neighbouring skill.

## Dependencies

This skill needs demo-tool
— tools beyond the workspace baseline (bash, curl, jq, git).
Declared in `metadata.workspace-deps`. Format:
`agent-skills.md` → "Dependencies frontmatter"; well-formed criteria
(pre-flight, description mention, check-deps): `patterns.md` §9. Keep
the list in sync with what the steps actually invoke.

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

(none — this skill reuses an existing `tools/<domain>/`; TODO list
the borrowed scripts and their home here)
