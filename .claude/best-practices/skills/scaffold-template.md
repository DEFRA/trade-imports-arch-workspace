# SKILL.md scaffold template

The skeleton CREATE mode emits at `.claude/skills/<name>/SKILL.md`. Substitution placeholders are written in ALL-CAPS double-brace form (`{{NAME}}`). TODO markers flag prose the user must replace before the skill is shippable.

The companion [`patterns.md`](patterns.md) explains when each section is load-bearing; [`anti-patterns.md`](anti-patterns.md) is read at session start by `skill-creator` so the patterns stay current.

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

A skill that declares `metadata.workspace-deps` (pattern 9) pre-flights each declared dependency in `start-{{NAME}}.sh` — `MODE: BLOCKED` plus a `REASON` naming the remedy when one is missing. The `metadata:` block in the frontmatter template below appears only when pattern 9 applies (format contract: `agent-skills.md` → "Dependencies frontmatter" — no quotes, no inline comments on the declaration line).

`.claude/settings.json` allowlist entries (pattern 8):

```
Bash(~/trade-imports-arch-workspace/.claude/tools/{{NAME}}/*)
Bash(~/trade-imports-arch-workspace/.claude/tools/{{NAME}}/*:*)
```

## SKILL.md skeleton — the blessed golden output is the exemplar

There is deliberately NO hand-written copy of the emitted SKILL.md here: a second copy of the generator's heredoc drifts (it did, twice, in one branch). The living, review-gated exemplars are the golden expected trees — they cannot diverge from `scaffold-skill.sh` because `make check` and the pre-commit hook diff them against its real output:

- `~/trade-imports-arch-workspace/.claude/tools/skill-creator/tests/expected/plain-case/skill/SKILL.md` — dispatcher + JSON state + fan-out worker.
- `.../expected/depend-case/skill/SKILL.md` — a declaring skill (`metadata.workspace-deps` frontmatter + `## Dependencies` section).
- `.../expected/tool-only-case/skill/SKILL.md` — zero-helper skill reusing another tools domain.

To change the emitted skeleton: edit the heredoc in `scaffold-skill.sh`, run the golden suite, review the diff, `--bless`, commit both.

## decisions.md sidecar (CREATE writes alongside SKILL.md)

CREATE mode emits a `decisions.md` next to SKILL.md by piping `render-interview.sh`, so the sidecar mirrors the 9 interview questions exactly; the rationale is what a future audit / refactor pass reads to avoid re-deriving the framework.

```markdown
# {{NAME}} skill — decisions

Recorded during CREATE interview. Update if a shape choice changes; do not delete entries.

## 1. Purpose

{{ONE_LINE_PURPOSE}}

## 2. Dependencies

**Resolution:** {{none | build | port | depend}} **Declared:** {{DEP_TOKENS | (none)}} **Why:** {{JUSTIFICATION | (not applicable)}} **Pattern reference:** patterns.md §9

## 3. State shape

**Choice:** {{json | prose}} **Pattern reference:** patterns.md §1

## 4. Dispatcher

**Choice:** {{true | false}} **Pattern reference:** patterns.md §2

## 5. Pre-baked context

**Choice:** {{true | false}} **Pattern reference:** patterns.md §3

## 6. Worker fan-out

**Choice:** {{true | false}} **Workers:** {{WORKER_LIST}} **Pattern reference:** patterns.md §5

## 7. Walker

**Choice:** {{true | false}} **Pattern reference:** patterns.md §7

## 8. Helpers introduced

{{LIST}}

## 9. Triggers

{{TRIGGER_LIST}}

**Disambiguation:** {{ONE_LINE_RATIONALE}}
```
