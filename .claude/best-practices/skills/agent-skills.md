# Agent skills format note

This workspace uses the [agentskills.io](https://agentskills.io/specification)
standard for Claude Code skills. Each skill lives at the workspace root under
`.claude/skills/<name>/`, with a `SKILL.md` entry point and optional
`references/` and `assets/` subdirectories. Long-running fan-out workers
live as `references/<NAME>.md` prose inside the owning skill and are
spawned as `general-purpose` Task subagents.

This document is the canonical reference for the workspace-level conventions
that every `SKILL.md` cites. It exists once here so individual skills don't
duplicate the prose.

## Workspace root resolution

The canonical workspace root is `~/trade-imports-arch-workspace`. On a
machine where the checkout lives elsewhere, the contributor creates one
HOME-level symlink: `ln -s <checkout> ~/trade-imports-arch-workspace`.
Every path in the workspace is spelled against this constant, so it
resolves identically on every machine. The trade-off is deliberate: the
spelling is baked into many files, so renaming the root later is a mass
find-and-replace. `trade-imports-documentation/`,
`delivery-info-arch-tooling/` and `trade-imports-schemas/` are children of
the root; the workspace references them downward by canonical path, and
they never reference the workspace upward (which keeps them self-contained
and CI-safe).

Skills must NOT assume the agent's current working directory. Claude Code
can invoke a skill from anywhere, and the child repos are themselves git
repositories, so `git rev-parse --show-toplevel` returns the child root
when called from inside one — silently breaking any path that should be
workspace-relative.

Two layers:

- **In LLM-typed commands** (SKILL.md, references/*.md, spawn prompts):
  use the literal home-relative path `~/trade-imports-arch-workspace/...`.
  Bash expands `~` to `$HOME` automatically.
- **Inside `.claude/tools/<domain>/<script>.sh`**: scripts hardcode the
  path literally as `$HOME/trade-imports-arch-workspace/...`. No env var,
  no runtime root-discovery. `$HOME` expands inside the shell at
  script-run time; it never reaches the permission system or an LLM.
  Emitted commands (a dispatcher printing a `PUBLISH_CMD` for the agent
  to run) use the `~` form so they match the allowlist verbatim.

The split exists because Claude Code's permission system flags
parameter expansion (`$VAR`) in LLM-typed Bash commands as "Contains
simple_expansion" — even when the variable is explicitly allowlisted
([GH#51001](https://github.com/anthropics/claude-code/issues/51001)).
Literal `~` paths in agent-typed commands don't trip the check, and
`$HOME` inside script bodies never crosses the boundary.

Earlier iterations used a walk-up helper that derived the root from
`${BASH_SOURCE[0]}` or `$PWD`. That had two failure modes: off-by-one
when scripts moved between directory depths, and false matches when a
parent of the workspace happened to contain a stray `.claude/` directory.

## Path conventions

Cross-workspace references in `SKILL.md` use absolute paths anchored on
`~/trade-imports-arch-workspace`:

```
Scripts:        ~/trade-imports-arch-workspace/.claude/tools/<domain>/<script>
Best-practices: ~/trade-imports-arch-workspace/.claude/best-practices/<topic>/<file>
Workareas:      ~/trade-imports-arch-workspace/.claude/workareas/...
Other skills:   ~/trade-imports-arch-workspace/.claude/skills/<name>/...
```

Skill-internal references stay relative from `SKILL.md`:

```
references/<NAME>.md
assets/<NAME>.md
```

## Bash call hygiene (avoiding permission prompts)

**The core principle: one command per Bash call.** The allowlist
matches against the whole command string — anything that makes the
call a *compound* shape (a chain, a pipe, an embedded sub-command,
or a variable expansion) doesn't match the prefix rule even when
each piece would individually. Symptoms:

- `&&` / `;` / `|` — turns N commands into one string the matcher
  doesn't recognise. Run them as separate Bash calls instead.
- `cd <dir> && cmd ...` — special case of `&&`. Use `cmd -C <dir>` /
  full paths instead.
- `find ... -exec cmd {} \;` — `-exec` runs an arbitrary embedded
  command. Claude Code refuses to prefix-allowlist it. Use Glob +
  Read for "find then read" workflows.
- `$VAR` in the command — Claude Code's "Contains simple_expansion"
  check ([GH#51001](https://github.com/anthropics/claude-code/issues/51001))
  trips before the allowlist matcher sees it. Use literal
  `~/trade-imports-arch-workspace/...` paths.
- `/Users/<you>/...` resolved-tilde form — the matcher compares
  literal strings, so `~/trade-imports-arch-workspace/...` and its
  resolved `/Users/<you>/...` form are *different* prefixes. Always
  type the `~/` form, never resolve it to your home path.
- Ad-hoc text utilities (`awk`, `sed`, `find`) on files outside the
  workspace — scoped to workspace paths in the allowlist; system
  paths still prompt.

**Don't reach for Bash combos when an LLM-native tool does the job:**

- File inspection → Read (with `offset` + `limit`), not `awk`, `sed -n`, `grep -n`.
- File location by name → Glob, not `find -exec` or `find ... | xargs`.
- JSON queries → `jq` against a workspace file, not `python3 -c "import json"`.
- Filtering script output → add a `--filter` / `--file` / `--repo` flag to the helper, not `| awk`. If the helper lacks the flag, propose extending it.

**Quick reference:**

| Anti-pattern | Use instead |
|---|---|
| `cd ~/trade-imports-arch-workspace && .claude/tools/x.sh` | `~/trade-imports-arch-workspace/.claude/tools/x.sh` (no `cd`) |
| `.claude/tools/x.sh` (relative) | full `~/trade-imports-arch-workspace/...` form |
| `tools/x.sh && tools/y.sh` | two separate Bash calls |
| `$WORKSPACE/.claude/tools/x.sh` | literal `~/trade-imports-arch-workspace/...` form |
| `/Users/<you>/trade-imports-arch-workspace/...` (resolved tilde) | literal `~/trade-imports-arch-workspace/...` form |
| `cd <dir> && git ...` | `git -C <dir> ...` |
| `awk '...' file` (workspace inspection) | Read tool with offset+limit |
| `find <dir> -name X -exec cat {} \;` | Glob + Read |
| `tools/x.sh \| awk` | helper `--filter` flag |
| `python3 -c "import json..."` | `jq` |

The skill prose models this in every example — follow the model.

Worker personas are addressed by an absolute `references/<NAME>.md` path
inside the spawn prompt — see "Worker references" below.

## Skill folder shape

```yaml
---
name: skill-name          # 1-64 chars [a-z0-9-]; MUST match the folder name
description: ...          # 1-1024 chars; WHAT + WHEN + trigger keywords
metadata:                 # OPTIONAL; only for skills with unbundled needs
  dependencies: <token> <token>   # see "Dependencies frontmatter" below
---
```

- `SKILL.md` body should stay under 500 lines / ~5000 tokens.
- `references/<NAME>.md` — additional docs loaded on demand.
- `assets/<NAME>.md` — templates, schemas, static resources.
- Skills do NOT carry private `scripts/` folders in this workspace: shared
  shell scripts live at `~/trade-imports-arch-workspace/.claude/tools/`.

### Dependencies frontmatter

A skill that cannot function from its bundled tools alone declares what it
needs in `metadata.dependencies` — a single space-separated string. The
agentskills.io spec routes custom properties through `metadata` (string
keys → string values), so this stays valid under `skills-ref validate`.
Each token is either:

- a **workspace child project** — a directory name under
  `~/trade-imports-arch-workspace/` (e.g. `delivery-info-arch-tooling`), or
- a **non-baseline tool** — a command the skill's scripts invoke
  (e.g. `npm`, `mmdc`).

Format: two-space indent under `metadata:`, no quotes, no inline comments.
Rules:

- **Baseline is assumed, never declared**: `bash`, `curl`, `jq`, `git`.
  `check-workspace.sh` verifies the baseline once per machine; declaring
  it per skill would reduce declarations to boilerplate.
- **Credentials are not dependencies** — env-var/auth needs belong to the
  per-domain `auth.sh` checks swept by `check-auth.sh`.
- **Declare hard dependencies only** — things the skill cannot work
  without. A soft probe with graceful fallback (e.g. mermaid-check trying
  the tooling's mmdc, then npx) is not declared.
- A declaring skill also carries a `## Dependencies` body section (the
  rationale and which features are used), names the requirement in its
  `description`, and pre-flights each dependency in its dispatcher —
  `MODE: BLOCKED` plus a `REASON` naming the remedy, never a raw
  downstream error.

Verification is `check-deps.sh` (the dependency doctor): project tokens
must resolve to directories under the root, tool tokens to commands on
PATH. Full judgment criteria: `patterns.md` §9. Preference order when a
new skill overlaps existing external functionality — port it into local
`tools/`, or build fresh, before depending; the upstream spec's stance is
that most skills need no environment requirements at all.

Spawn idiom inside `SKILL.md`:

- For a reference loaded by the parent session: `Follow references/<NAME>.md`.
- For a worker spawned as a Task subagent: see "Worker references" below.

## Worker references

Long-running fan-out workers (per-file reviewers, per-package planners,
per-version planners, per-item fixers) live as `references/<NAME>.md`
prose inside the owning skill. They are spawned via the Task tool with
`subagent_type: general-purpose` and a prompt that begins:

```
Follow the instructions in ~/trade-imports-arch-workspace/.claude/skills/<owner>/references/<NAME>.md.

<per-spawn context: file/path/commit/output-path>
```

Rationale:
- The agentskills.io specification defines `references/` for "additional
  documentation that agents can read when needed" and is silent on
  subagents — this is the spec-blessed home for worker prose.
- `general-purpose` carries `Tools: *` (Write, Edit, Bash, WebFetch all
  available) and is not subject to the no-write guardrail injected into
  custom-named restricted subagents — workers can therefore reliably
  write the per-file artifacts that downstream `tools/` scripts consume.
- The path is absolute so the spawned subagent doesn't need to inherit
  the parent's working directory.

## Cross-host discovery

- **Skills** — `.claude/skills/` works for both Claude Code (native) and
  Cursor (per <https://cursor.com/docs/context/skills>).
- **Worker fan-out** — Claude Code spawns `general-purpose` Task
  subagents in parallel. Cursor has no parallel subagent primitive; it
  will execute the worker prose serially in the active session, which
  is acceptable (just slower).
- **Subdirectory launches** — Claude Code's `.claude/skills/` does NOT walk
  up parent directories (#26489). Launch sessions from the workspace root;
  add a `<dir>/.claude → ../.claude` symlink only if a subdirectory launch
  point becomes routine.
- **Child repos** — `trade-imports-documentation/`,
  `delivery-info-arch-tooling/` and `trade-imports-schemas/` are nested
  git repos; Claude Code sandboxes them off the parent workspace's
  `.claude/` (#31905). Do NOT symlink into them. Work on them from the
  workspace root with `git -C` / `npm --prefix` forms; a session inside
  one sees no workspace skills.

## Runtime workareas

`~/trade-imports-arch-workspace/.claude/workareas/` holds working state
written by skill runs — interview decisions, audit plans, review
artifacts. It is tracked, not gitignored: checked-in files
(`skill-creator/<name>/decisions.json`, `skills-audit/<name>.md`) form
the durable audit trail alongside each skill's `decisions.md` sidecar.
