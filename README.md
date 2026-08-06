# Trade Imports Architecture Workspace

AI skills and tooling shared across DEFRA trade-imports architecture work. The versioned content is the `.claude/` directory - agent skills, per-domain shell tools, guard hooks and best-practices notes. Everything else in a working checkout (the documentation repos below, local analysis material) is cloned in beside it and excluded from version control.

## Two ways to use it

**As a parent workspace for Claude Code - the sweet spot.** Clone this repo and open it as the root of a Claude Code session. The arrangement is deliberate context engineering: the tooling sits at the root, the repos it operates on sit inside it as children, and Claude Code loads the conventions automatically (`CLAUDE.md`, rules, skills). Guard hooks enforce the working agreements - one command per Bash call, no reads of credential files, no agent edits to its own permission config - and the skills orchestrate the documentation tooling end to end.

**As a library of capabilities for other setups.** Colleagues work in other AI tools and other workflows, and the workspace is built with that in mind. Agent instructions follow the [agents.md](https://agents.md/) standard: `AGENTS.md` at the root is the shared instruction file, read natively by Cursor, Codex and others, while `CLAUDE.md` imports it and adds only the Claude Code layer (hooks, rules, native skill invocation). Skills follow the [agentskills.io](https://agentskills.io/specification) format - a `SKILL.md` entry point plus supporting references - and do their real work through plain shell scripts under `.claude/tools/`, so they can be read by other agents, wired into other workspaces, or run by hand. The guard hooks and permission config are Claude Code concepts and do not transfer; whether and how to enforce equivalents is a choice for your own tooling.

## Getting started

```bash
git clone https://github.com/DEFRA/trade-imports-arch-workspace.git
cd trade-imports-arch-workspace
make
```

`make` clones the child repos, creates the canonical symlink and verifies the result. The steps run individually as `make clone`, `make pull`, `make link` and `make check`; add `GIT_BASE=git@github.com:DEFRA` to clone over SSH.

The symlink is part of a path contract: everything in the workspace refers to the root as `~/trade-imports-arch-workspace`, so the same commands work on every machine regardless of where the checkout lives. The contract is documented in `.claude/rules/workspace-paths.md`.

## Inside `.claude/`

The layout follows Claude Code's [project `.claude` directory](https://code.claude.com/docs/en/claude-directory), plus this workspace's own conventions. Rows marked *workspace convention* are directories Claude Code does not read by name - they are how this repo organises itself.

| Directory | Purpose |
| --- | --- |
| `settings.json` | Enforced configuration: the permission allowlist and the hook wiring. Unlike the markdown guidance files, Claude Code applies this whether the agent follows instructions or not. |
| `settings.local.json` | Personal overrides - extra permissions and the additional working directories for local service clones. Gitignored. |
| `rules/` | Topic-scoped instruction files. A rule without `paths:` frontmatter loads at session start like `CLAUDE.md`; one with `paths:` globs loads only when a matching file enters context. `workspace-paths.md` (the canonical-root contract) is the always-on rule here. |
| `skills/` | One directory per skill: a `SKILL.md` entry point plus supporting references, following the [agentskills.io](https://agentskills.io/specification) format. Invoked as `/name`, or auto-invoked when a task matches the skill's description. |
| `agents/` | Custom subagent definitions - one markdown file each, with its own system prompt, tool list and optionally model, run in a fresh context window. Empty today; definitions are added as needs emerge. |
| `agent-memory/` | Persistent memory for subagents that declare `memory: project` in their frontmatter - each maintains its own `MEMORY.md`, loaded into its system prompt when it runs. Claude Code creates and populates it; nothing to author by hand. |
| `workflows/` | Saved dynamic-workflow scripts - JavaScript files that orchestrate many subagents, each becoming a `/name` command. Saved from a session via `/workflows` rather than authored from scratch. |
| `hooks/` *(workspace convention)* | The guard scripts (`guard-bash.sh`, `guard-edits.sh`) that `settings.json` wires to run before tool calls. Claude Code reads the wiring from `settings.json`; keeping the scripts in a dedicated directory, protected from agent edits by `guard-edits.sh` itself, is this workspace's choice. |
| `tools/` *(workspace convention)* | Per-domain shell scripts that do the deterministic work behind skills - Confluence page operations and publish pre-flight, Jira ticket creation and JQL fetch, Mermaid rendering, skill scaffolding, the workspace, auth and dependency doctors. Runnable by hand or from any agent. |
| `best-practices/` *(workspace convention)* | Convention docs the skills cite instead of duplicating - currently the skill-authoring conventions in `best-practices/skills/`. |
| `workareas/` *(workspace convention)* | Persistent working state written by skill runs, such as skill-creator interview decisions and audit plans. |

There is deliberately no `commands/` directory. Claude Code has folded commands and skills into one mechanism - same `/name` invocation - and skills are the recommended form because they can bundle supporting files, so this workspace defines everything as skills.

## The documentation repos

The workspace wraps two repos that together provide documentation-as-code for the trade-import systems. They are separate git repositories and must sit side by side, because the first consumes the second as a local npm dependency by relative path (`file:../delivery-info-arch-tooling`).

| Repo | Role                                                                                                                                                                                                                                                         |
| --- |--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [trade-imports-documentation](https://github.com/DEFRA/trade-imports-documentation) | Private repo, architectural content: markdown documentation and LikeC4/C4 architecture models for DEFRA's trade-import systems. A single source of truth in `docs/` is rendered to GitHub Pages, published to Confluence and exported to PowerPoint and PDF. |
| [delivery-info-arch-tooling](https://github.com/DEFRA/delivery-info-arch-tooling) | The machinery: the npm library that implements the Confluence publishing, PowerPoint and PDF generation, and diagram export (LikeC4 to PNG, Mermaid to SVG) behind the documentation repo's npm scripts.                                                     |

Directional setup only - each repo's README holds the authoritative steps:

1. `make clone` puts both repos in place as siblings.
2. `npm install` inside `trade-imports-documentation` (and again in its `astro/` subdirectory) resolves the tooling by relative path and installs everything else.
3. Node.js 22+ is required; publishing to Confluence needs Atlassian credentials in environment variables (`CONFLUENCE_USERNAME`, `CONFLUENCE_API_TOKEN`).

`make` also clones [trade-imports-schemas](https://github.com/DEFRA/trade-imports-schemas), the JSON Schema and JSON-LD artefacts for trade-import payloads - a self-contained sibling with its own README.

## Origins

This workspace descends from `trade-imports-animals-workspace`, the equivalent harness for DEFRA animals-imports work. Skills, tools and hooks were copied across rather than rewritten.