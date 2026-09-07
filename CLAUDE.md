@AGENTS.md

# CLAUDE.md

Claude Code-specific guidance on top of the shared `AGENTS.md` imported
above. Shared workspace instructions (layout, paths, tooling, skills)
live there - this file carries only what applies to Claude Code alone.

## Rules

`.claude/rules/` is auto-loaded: `workspace-paths.md` every session (the
canonical-root contract), `dot-claude-layout.md` when working under
`.claude/` (where new files go).

## Guard hooks

`.claude/hooks/guard-bash.sh` denies, among others: `chmod`; running path-invoked executables that are uncommitted or differ from HEAD; ad-hoc readers (`jq`, `grep`, `awk`, …) on secret paths - the root `.env` holds Atlassian credentials and must never be read; `git commit --no-verify`; `git commit --amend` on pushed commits; literal `/Users/` paths; and `&&` chaining (one command per Bash call). Each denial names the sanctioned alternative - follow it instead of rewording the same command.

`.claude/hooks/guard-edits.sh` blocks agent edits to `.claude/settings.json`, `.claude/settings.local.json` and `.claude/hooks/**`. Changes there must be made by the user directly.
