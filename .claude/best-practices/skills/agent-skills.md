# Agent skills format note

This workspace uses the [agentskills.io](https://agentskills.io/specification) standard for Claude Code skills. Each skill lives at the workspace root under `.claude/skills/<name>/`, with a `SKILL.md` entry point and optional `references/` and `assets/` subdirectories. Long-running fan-out workers live as `references/<NAME>.md` prose inside the owning skill and are spawned as `general-purpose` Task subagents.

This document is the canonical reference for the workspace-level conventions that every `SKILL.md` cites. It exists once here so individual skills don't duplicate the prose.

## Workspace root resolution

The workspace has no fixed location. Every path in the workspace is written relative to the workspace root, the folder that holds `.claude/` and the `Makefile`, so a checkout works wherever it is cloned. `trade-imports-documentation/`, `delivery-info-arch-tooling/` and `trade-imports-schemas/` are children of the root. The workspace references them downward by relative path, and they never reference the workspace upward, which keeps them self-contained and CI-safe.

A relative path depends on the working directory, and Claude Code holds that at the root. A session starts in the folder Claude Code was launched from, so sessions start at the workspace root. `.claude/settings.json` sets `CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR`, which returns the main session's Bash tool to the root after every command, so a `cd` moves neither later Bash calls nor the file tools, which resolve relative paths against the same folder. A subagent's Bash calls also start at the root, and a subagent keeps no `cd` between calls. If a session starts in a subfolder, relative paths resolve against that subfolder, and Claude Code loads no workspace skills there either.

Never reach the checkout through a symlink. Claude Code compares file paths as typed, without resolving symlinks. A file read through a symlink loads no path-scoped rule and no nested CLAUDE.md, and Edit refuses a file that was read under another spelling of its path.

Three layers:

- **In LLM-typed commands and file tool paths** (SKILL.md, references/*.md, spawn prompts): paths relative to the root, such as `.claude/tools/workspace/check-workspace.sh`.
- **Inside `.claude/tools/<domain>/<script>.sh`**: the script takes the root from its own location, three folders up: `ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd -P)"`. A script under `tests/` counts four. The count is fixed, so a script that moves to another depth must change its count, and a wrong count fails the script's first check of the root. The script counts folders instead of walking up to the first `.claude/`, because a walk-up matches a stray `.claude/` in a parent folder. `pwd -P` gives the real path, so a call through a symlink still finds the real root.
- **Commands a script prints**: a command a dispatcher prints for the agent to run verbatim stays root-relative, so it matches the allowlist. A remedy that a script or `hedy` names in an error message uses the resolved absolute root, because the reader of a message may be in any folder.

`$VAR` stays out of LLM-typed commands, because Claude Code's permission system flags parameter expansion as "Contains simple_expansion" even when the variable is allowlisted ([GH#51001](https://github.com/anthropics/claude-code/issues/51001)). A root-relative path holds no expansion.

## Path conventions

Cross-workspace references in `SKILL.md` use paths relative to the workspace root:

```
Scripts:        .claude/tools/<domain>/<script>
Best-practices: .claude/best-practices/<topic>/<file>
Workareas:      .claude/workareas/...
Other skills:   .claude/skills/<name>/...
Child repos:    trade-imports-documentation/...
```

Skill-internal references stay relative from `SKILL.md`:

```
references/<NAME>.md
assets/<NAME>.md
```

**Markdown links are the one exception to the root-relative rule:** a link like `[agent-skills.md](../../best-practices/skills/agent-skills.md)` is relative to the linking file, because that is the only form `lint-skills.sh` can resolve and renderers can follow. The root-relative form is for _commands and prose paths_, not link targets.

## Bash call hygiene (avoiding permission prompts)

**The core principle: one command per Bash call.** The allowlist matches against the whole command string - anything that makes the call a _compound_ shape (a chain, a pipe, an embedded sub-command, or a variable expansion) doesn't match the prefix rule even when each piece would individually. Symptoms:

- `&&` / `;` / `|` - turns N commands into one string the matcher doesn't recognise. Run them as separate Bash calls instead.
- `cd <dir> && cmd ...` - special case of `&&`. Use `cmd -C <dir>` / `npm --prefix <dir>`, or `(cd <dir>; cmd)` in one call where the command has no such option.
- `find ... -exec cmd {} \;` - `-exec` runs an arbitrary embedded command. Claude Code refuses to prefix-allowlist any command containing `-exec`. Use Glob + Read for "find then read" workflows.
- `$VAR` in the command - Claude Code's "Contains simple_expansion" check ([GH#51001](https://github.com/anthropics/claude-code/issues/51001)) trips before the allowlist matcher sees the command. Use root-relative paths.
- An absolute path to a workspace script - the matcher compares literal strings, and the allowlist rules are written in the root-relative form, so `/Users/<you>/.../.claude/tools/x.sh` does not match `Bash(.claude/tools/*)` and prompts. Type `.claude/tools/x.sh`.
- Ad-hoc text utilities (`awk`, `sed`, `find`) on files outside the workspace - scoped to workspace paths in the allowlist; system paths still prompt.

**Don't reach for Bash combos when an LLM-native tool does the job:**

- File inspection → Read (with `offset` + `limit`), not `awk`, `sed -n`, `grep -n`.
- File location by name → Glob, not `find -exec` or `find ... | xargs`.
- JSON queries → `jq` against a workspace file, not `python3 -c "import json"`.
- Filtering script output → add a `--filter` / `--file` / `--repo` flag to the helper, not `| awk`. If the helper lacks the flag, propose extending the helper.

**Quick reference:**

| Anti-pattern | Use instead |
| --- | --- |
| `cd <dir> && .claude/tools/x.sh` | `.claude/tools/x.sh` from the root (no `cd`) |
| `/Users/<you>/.../.claude/tools/x.sh` (absolute) | `.claude/tools/x.sh` |
| `tools/x.sh && tools/y.sh` | two separate Bash calls |
| `$WORKSPACE/.claude/tools/x.sh` | `.claude/tools/x.sh` |
| `cd <dir> && git ...` | `git -C <dir> ...` |
| `awk '...' file` (workspace inspection) | Read tool with offset+limit |
| `find <dir> -name X -exec cat {} \;` | Glob + Read |
| `tools/x.sh \| awk` | helper `--filter` flag |
| `python3 -c "import json..."` | `jq` |

The skill prose models this in every example - follow the model.

Worker personas are addressed by a root-relative `references/<NAME>.md` path inside the spawn prompt - see "Worker references" below.

## Skill folder shape

```yaml
---
name: skill-name # 1-64 chars [a-z0-9-]; MUST match the folder name
description: ... # 1-1024 chars; WHAT + WHEN + trigger keywords
metadata: # OPTIONAL; only for skills with unbundled needs
  workspace-deps: <token> <token> # see "Dependencies frontmatter" below
---
```

- `SKILL.md` body should stay under 500 lines / ~5000 tokens.
- `references/<NAME>.md` - additional docs loaded on demand.
- `assets/<NAME>.md` - templates, schemas, static resources.
- Skills do NOT carry private `scripts/` folders in this workspace: shared shell scripts live at `.claude/tools/`.

### Dependencies frontmatter

A skill that cannot function from its bundled tools alone declares what it needs in `metadata.workspace-deps` - a single space-separated string. The agentskills.io spec routes custom properties through `metadata` (string keys → string values), so this stays valid under `skills-ref validate`; the key carries a workspace prefix rather than a bare `dependencies` because the metadata map is a namespace shared with other consumers. Each token is either:

- a **workspace child project** - a directory name under the workspace root (e.g. `delivery-info-arch-tooling`), or
- a **non-baseline tool** - a command the skill's scripts invoke (e.g. `npm`, `mmdc`).

Format: two-space indent under `metadata:`, no quotes, no inline comments. Rules:

- **Baseline is assumed, never declared**: `bash`, `curl`, `jq`, `git`, and `hedy`, which `make install` puts on PATH. `check-workspace.sh` verifies the baseline once per machine; declaring it per skill would reduce declarations to boilerplate.
- **Credentials are not dependencies** - env-var and auth needs belong to `hedy auth`, which `check-auth.sh` runs with any per-domain `auth.sh` the sweep still finds.
- **Declare hard dependencies only** - things the skill cannot work without. A soft probe with graceful fallback (e.g. mermaid-check trying the tooling's mmdc, then npx) is not declared - and a fallback chain is soft only if its LAST rung degrades gracefully; a chain that ends in a raw failure is a hard dependency wearing a costume.

Acknowledged soft probes may be listed in `workspace-soft-deps` (same format, same `metadata:` map). That key is purely a lint-noise acknowledgment - never verified, never pre-flighted; it says "yes, the sweep saw this, and it is a graceful-fallback probe, not a hard dep".

Everything else about dependencies - the port/build/depend preference order and the well-formed criteria a declaring skill satisfies - lives canonically in [`patterns.md`](patterns.md) §9. Verification: `check-deps.sh` (machine resolution) and `lint-skills.sh` (repo lint).

Spawn idiom inside `SKILL.md`:

- For a reference loaded by the parent session: `Follow references/<NAME>.md`.
- For a worker spawned as a Task subagent: see "Worker references" below.

## Worker references

Long-running fan-out workers (per-file reviewers, per-package planners, per-version planners, per-item fixers) live as `references/<NAME>.md` prose inside the owning skill. They are spawned via the Task tool with `subagent_type: general-purpose` and a prompt that begins:

```
Follow the instructions in .claude/skills/<owner>/references/<NAME>.md.

<per-spawn context: file/path/commit/output-path>
```

Rationale:

- The agentskills.io specification defines `references/` for "additional documentation that agents can read when needed" and is silent on subagents - this is the spec-blessed home for worker prose.
- `general-purpose` carries `Tools: *` (Write, Edit, Bash, WebFetch all available) and is not subject to the no-write guardrail injected into custom-named restricted subagents - workers can therefore reliably write the per-file artifacts that downstream `tools/` scripts consume.
- The path is relative to the workspace root, and a subagent's Bash calls and file tools start at the root, so the subagent finds the file without the parent's working directory.

## Cross-host discovery

- **Skills** - `.claude/skills/` works for both Claude Code (native) and Cursor (per <https://cursor.com/docs/context/skills>).
- **Worker fan-out** - Claude Code spawns `general-purpose` Task subagents in parallel. Cursor has no parallel subagent primitive; it will execute the worker prose serially in the active session, which is acceptable (just slower).
- **Subdirectory launches** - Claude Code's `.claude/skills/` does NOT walk up parent directories (#26489). Launch sessions from the workspace root; add a `<dir>/.claude → ../.claude` symlink only if a subdirectory launch point becomes routine.
- **Child repos** - `trade-imports-documentation/`, `delivery-info-arch-tooling/` and `trade-imports-schemas/` are nested git repos; Claude Code sandboxes them off the parent workspace's `.claude/` (#31905). Do NOT symlink into them. Work on them from the workspace root with `git -C` / `npm --prefix` forms; a session inside one sees no workspace skills.

## Runtime workareas

`.claude/workareas/` holds working state written by skill runs - interview decisions, audit plans, review artifacts. It is tracked, not gitignored: checked-in files (`skill-creator/<name>/decisions.json`, `skills-audit/<name>.md`) form the durable audit trail alongside each skill's `decisions.md` sidecar.
