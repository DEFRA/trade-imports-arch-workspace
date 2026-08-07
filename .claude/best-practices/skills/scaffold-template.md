# SKILL.md scaffold template

The skeleton CREATE mode emits at `.claude/skills/<name>/SKILL.md`.
Substitution placeholders are written in ALL-CAPS double-brace form
(`{{NAME}}`). TODO markers flag prose the user must replace before
the skill is shippable.

The companion [`patterns.md`](patterns.md) explains when each
section is load-bearing; [`anti-patterns.md`](anti-patterns.md) is
read at session start by `skill-creator` so the patterns stay
current.

## Skill directory layout (full)

```
.claude/skills/{{NAME}}/
├── SKILL.md
├── references/
│   └── {{WORKER}}.md          # if fan-out: pattern 5
└── assets/
    └── {{SCHEMA}}.md           # if JSON state: pattern 1

tools/{{NAME}}/
├── start-{{NAME}}.sh           # if dispatcher: pattern 2
├── prepare-{{NAME}}.sh         # if pre-bake: pattern 3
├── {{OP}}.sh                   # per mutation: pattern 6
└── render-{{NAME}}.sh          # if JSON state has a markdown view: pattern 1
```

A skill that declares `metadata.workspace-deps` (pattern 9) pre-flights
each declared dependency in `start-{{NAME}}.sh` — `MODE: BLOCKED` plus a
`REASON` naming the remedy when one is missing. The `metadata:` block in
the frontmatter template below appears only when pattern 9 applies
(format contract: `agent-skills.md` → "Dependencies frontmatter" — no
quotes, no inline comments on the declaration line).

`.claude/settings.json` allowlist entries (pattern 8):

```
Bash(~/trade-imports-arch-workspace/.claude/tools/{{NAME}}/*)
Bash(~/trade-imports-arch-workspace/.claude/tools/{{NAME}}/*:*)
```

## SKILL.md template

```markdown
---
name: {{NAME}}
description: '{{ONE_LINE_PURPOSE}} {{WHEN_TO_USE}} (triggers: "{{TRIGGER_1}}", "{{TRIGGER_2}}"). NOT for {{OUT_OF_SCOPE}} — use the {{OTHER_SKILL}} skill for that.'
metadata:
  workspace-deps: {{DEP_TOKENS}}
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

**Bash call hygiene** - one command per Bash call; paths in the literal
`~/trade-imports-arch-workspace/...` form. Full rules:
[`agent-skills.md`](../../best-practices/skills/agent-skills.md).

## When to use

| Trigger | What to follow |
|---------|----------------|
| "{{TRIGGER_1}}" | this SKILL.md — {{SECTION_1}} |
<!-- TODO: extra rows per trigger / branch -->

NOT for {{OUT_OF_SCOPE}} — use the `{{OTHER_SKILL}}` skill.

## Worker references

<!-- TODO: drop this section if no fan-out (pattern 5).
     Otherwise list each persona, when it runs, and what it
     writes. Spawn idiom is `subagent_type: general-purpose`,
     prompt begins:
     `Follow the instructions in ~/trade-imports-arch-workspace/.claude/skills/{{NAME}}/references/<NAME>.md.` -->

| Persona | Used in | Artifact |
|---|---|---|
| `references/{{WORKER}}.md` | {{STEP}} (one per {{UNIT}}, parallel up to N) | {{ARTIFACT}} |

## Step 0: Start

<!-- TODO: drop this section if no dispatcher (pattern 2). -->

```bash
~/trade-imports-arch-workspace/.claude/tools/{{NAME}}/start-{{NAME}}.sh {{ARGS}}
```

First line of output is `MODE: <BRANCH>` — branch on it.

## Step 1: {{STEP_TITLE}}

<!-- TODO: per-step instructions. One step per logical
     deliverable. -->

## Completion output

<!-- TODO: the final report the parent session prints. Keep it
     tight: verdict + artifact paths + next-step hint. -->

```
{{NAME}} complete for {{ID}}.

Summary:
- {{KEY_METRIC_1}}
- {{KEY_METRIC_2}}

Artifacts: ~/trade-imports-arch-workspace/.claude/workareas/{{NAME}}/{{ID}}/...

Next: {{NEXT_HINT}}
```

## Scripts cheat-sheet

All under `~/trade-imports-arch-workspace/.claude/tools/{{NAME}}/`:

| Script | Purpose |
|---|---|
| `start-{{NAME}}.sh` | Step 0 dispatcher |
<!-- TODO: one row per helper script. -->
```

## decisions.md sidecar (CREATE writes alongside SKILL.md)

CREATE mode emits a `decisions.md` next to SKILL.md by piping
`render-interview.sh`, so the sidecar mirrors the 9 interview
questions exactly; the rationale is what a future audit / refactor
pass reads to avoid re-deriving the framework.

```markdown
# {{NAME}} skill — decisions

Recorded during CREATE interview. Update if a shape choice
changes; do not delete entries.

## 1. Purpose

{{ONE_LINE_PURPOSE}}

## 2. Dependencies

**Resolution:** {{none | build | port | depend}}
**Declared:** {{DEP_TOKENS | (none)}}
**Why:** {{JUSTIFICATION | (not applicable)}}
**Pattern reference:** patterns.md §9

## 3. State shape

**Choice:** {{json | prose}}
**Pattern reference:** patterns.md §1

## 4. Dispatcher

**Choice:** {{true | false}}
**Pattern reference:** patterns.md §2

## 5. Pre-baked context

**Choice:** {{true | false}}
**Pattern reference:** patterns.md §3

## 6. Worker fan-out

**Choice:** {{true | false}}
**Workers:** {{WORKER_LIST}}
**Pattern reference:** patterns.md §5

## 7. Walker

**Choice:** {{true | false}}
**Pattern reference:** patterns.md §7

## 8. Helpers introduced

{{LIST}}

## 9. Triggers

{{TRIGGER_LIST}}

**Disambiguation:** {{ONE_LINE_RATIONALE}}
```
