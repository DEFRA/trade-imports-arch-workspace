---
paths:
  - ".claude/**"
---

# .claude layout - where new files go

Placement rules for files under `.claude/`. The human-facing map with
fuller descriptions is the "Inside `.claude/`" section of
`~/trade-imports-arch-workspace/README.md`.

- New agent capability (instructions plus supporting files) ->
  `skills/<name>/SKILL.md`, agentskills.io format. Scaffold with the
  skill-creator skill rather than by hand.
- Deterministic shell work a skill calls -> `tools/<domain>/<script>.sh`.
  Keep logic in scripts, not in SKILL.md prose.
- Conventions cited by more than one skill -> `best-practices/<topic>/`.
- State written by skill runs -> `workareas/<skill>/...`.
- Instruction files -> `rules/`. Add `paths:` frontmatter unless the rule
  genuinely must load in every session.
- Subagent definitions -> `agents/<name>.md`. Their persistent memory
  appears under `agent-memory/` automatically; never author it by hand.
- Saved multi-agent workflow scripts -> `workflows/`.
- Guard scripts wired from `settings.json` live in `hooks/` - agent edits
  there are blocked; changes go through the user.
- Do not create `commands/` - superseded by skills (same `/name`
  invocation, and skills can bundle supporting files).
- Do not create `scripts/` - it held vestigial work from the ancestor
  workspace and was removed; shell work belongs under `tools/<domain>/`.