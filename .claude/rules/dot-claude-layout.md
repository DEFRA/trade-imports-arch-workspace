---
paths:
  - ".claude/**"
---

# .claude layout - where new files go

Placement rules for files under `.claude/`. The human-facing map with fuller descriptions is the "Inside `.claude/`" section of `~/trade-imports-arch-workspace/README.md`.

- New agent capability (instructions plus supporting files) -> `skills/<name>/SKILL.md`, agentskills.io format. Scaffold with the skill-creator skill rather than by hand.
- Deterministic shell work a skill calls -> `tools/<domain>/<script>.sh`. Keep logic in scripts, not in SKILL.md prose.
- Conventions cited by more than one skill -> `best-practices/<topic>/`.
- State written by skill runs -> `workareas/<skill>/...`. Two kinds: estate state, which describes the `.claude/` payload itself (audit plans, scaffold decisions) and stays tracked; and task state, which belongs to one person's work on the wrapped corpus (editorial reviews, sync output) and gets a root `.gitignore` entry when the skill is created.
- Instruction files -> `rules/`. Add `paths:` frontmatter unless the rule genuinely must load in every session.
- Subagent definitions -> `agents/<name>.md`. Their persistent memory appears under `agent-memory/` automatically; never author it by hand.
- Saved multi-agent workflow scripts -> `workflows/`.
- Guard scripts wired from `settings.json` live in `hooks/` - agent edits there are blocked; changes go through the user.
- The `hedy` CLI sub-project lives at `hedy/` in the workspace root, outside `.claude/`. Its rails are root-scoped: `hedy/CLAUDE.md`, `rules/hedy-code.md`, `rules/hedy-tests.md`, `rules/hedy-clients.md` and `rules/hedy-menu.md`, and its guard hooks in `hooks/`.
- Do not create `commands/` - superseded by skills (same `/name` invocation, and skills can bundle supporting files).
- Do not create `scripts/` - it held vestigial work from the ancestor workspace and was removed; shell work belongs under `tools/<domain>/`.
