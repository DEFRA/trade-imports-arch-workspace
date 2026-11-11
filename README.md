# Trade Imports Architecture Workspace

AI skills and tooling shared across DEFRA trade-imports architecture work. The versioned content is the `.claude/` directory - agent skills, per-domain shell tools, guard hooks and best-practices notes - and the `hedy/` CLI. Everything else in a working checkout (the documentation repos below, local analysis material) is cloned in beside it and excluded from version control.

## Two ways to use this workspace

**As a parent workspace for Claude Code - the sweet spot.** Clone this repo and open it as the root of a Claude Code session. The arrangement is deliberate context engineering: the tooling sits at the root, the repos it operates on sit inside it as children, and Claude Code loads the conventions automatically (`CLAUDE.md`, rules, skills). Guard hooks enforce the working agreements - one command per Bash call, no reads of credential files, no agent edits to its own permission config - and the skills orchestrate the documentation tooling end to end.

**As a library of capabilities for other setups.** Colleagues work in other AI tools and other workflows, and the workspace is built with that in mind. Agent instructions follow the [agents.md](https://agents.md/) standard: `AGENTS.md` at the root is the shared instruction file, read natively by Cursor, Codex and others, while `CLAUDE.md` imports it and adds only the Claude Code layer (hooks, rules, native skill invocation). Skills follow the [agentskills.io](https://agentskills.io/specification) format, a `SKILL.md` entry point plus supporting references, and do their real work through plain shell scripts under `.claude/tools/`, so they can be read by other agents, wired into other workspaces, or run by hand. The guard hooks and permission config are Claude Code concepts and do not transfer. Whether and how to enforce equivalents is a choice for each team's own tooling.

## Getting started

Prerequisites:

- Node 24 or later. `make install` stops and names the fix when Node is older.
- `git`, `jq` and `curl` on PATH.
- SSH access to the DEFRA GitHub organisation, including the private `trade-imports-documentation` repository. Without SSH, add `GIT_BASE=https://github.com/DEFRA` to each `make` command to clone the child repos over HTTPS.
- An Atlassian API token, for the Jira and Confluence commands.
- Optional: `gh`, which the `pr` skill uses.

1. Clone the workspace into any folder, and run `make` there:

   ```bash
   git clone git@github.com:DEFRA/trade-imports-arch-workspace.git
   cd trade-imports-arch-workspace
   make
   ```

   `make` clones the three child repos, then runs `make install` and `make check`. `make install` points `core.hooksPath` at `.githooks`, installs `hedy` and puts it on PATH, and installs the docs repo's packages. `make check` runs `hedy workspace check`, the skills lint, the golden tests and the hedy tests. Each step also runs on its own as `make clone`, `make pull`, `make install` or `make check`.

2. Create `.env` at the workspace root with the Atlassian credentials. git ignores the file, and `hedy` reads it directly:

   ```
   JIRA_USER=<email address of the Atlassian account>
   JIRA_TOKEN=<Atlassian API token>
   JIRA_BASE_URL=https://<site>.atlassian.net
   ```

3. Check the setup:

   ```bash
   hedy workspace check
   hedy auth
   ```

   `hedy workspace check` names the next step for each failed check. `hedy auth` shows the Jira and Confluence display names when the credentials work.

4. Start Claude Code sessions from the workspace root with `claude`. Every path in the workspace is relative to the root, so a checkout works wherever it is cloned. The path contract is in `.claude/rules/workspace-paths.md`.

A machine set up before the workspace dropped its fixed location may still have a `~/trade-imports-arch-workspace` symlink. `hedy workspace check` reports the symlink, and `unlink ~/trade-imports-arch-workspace` followed by `make install` repairs the machine.

## The `hedy` CLI

`hedy` is the workspace's command-line tool for Jira and Confluence, a Node 24 program kept in `hedy/`. `make install` installs `hedy` on the PATH. `hedy auth` checks the Atlassian credentials and shows only display names. `hedy jira ticket <key>` reads one Jira issue, and `hedy jira search '<jql>'` reads the issues a JQL query matches. `hedy confluence page <reference>` reads one Confluence page by id, URL or share link and prints the page as markdown. `hedy jira create --from <manifest>` creates a Jira issue and `hedy jira describe <key> --from <file>` replaces an issue's description, and each sends nothing until `--confirm <planId>` names the plan its dry run printed. `hedy confluence publish <page>` publishes one docs page to Confluence after its pre-flight, at once. `hedy workspace check` checks the machine and the checkout against the expected setup and names the next step for each failed check. Run `hedy` on its own in a terminal to open a menu that reaches every command and asks for a confirmation of each write after showing its plan or pre-flight. Agents call the commands with `--json`. Add `--json` to any command for one machine-readable line holding the result or the errors. Prefer `hedy <command> --json` over ad-hoc `curl` or `jq` against Jira or Confluence.

## Inside `.claude/`

The layout follows Claude Code's [project `.claude` directory](https://code.claude.com/docs/en/claude-directory), plus this workspace's own conventions. Rows marked *workspace convention* are directories Claude Code does not read by name - they are how this repo organises itself.

| Directory | Purpose |
| --- | --- |
| `settings.json` | Enforced configuration: the permission allowlist and the hook wiring. Unlike the markdown guidance files, Claude Code applies this whether the agent follows instructions or not. |
| `settings.local.json` | Personal overrides - extra permissions and the additional working directories for local service clones. Gitignored. |
| `rules/` | Topic-scoped instruction files. A rule without `paths:` frontmatter loads at session start like `CLAUDE.md`; one with `paths:` globs loads only when a matching file enters context. `workspace-paths.md` (the root-relative path contract) is the always-on rule here. |
| `skills/` | One directory per skill: a `SKILL.md` entry point plus supporting references, following the [agentskills.io](https://agentskills.io/specification) format. Invoked as `/name`, or auto-invoked when a task matches the skill's description. |
| `agents/` | Custom subagent definitions - one markdown file each, with its own system prompt, tool list and optionally model, run in a fresh context window. Empty today; definitions are added as needs emerge. |
| `agent-memory/` | Persistent memory for subagents that declare `memory: project` in their frontmatter - each maintains its own `MEMORY.md`, loaded into its system prompt when it runs. Claude Code creates and populates it; nothing to author by hand. |
| `workflows/` | Saved dynamic-workflow scripts - JavaScript files that orchestrate many subagents, each becoming a `/name` command. Saved from a session via `/workflows` rather than authored from scratch. |
| `hooks/` *(workspace convention)* | The guard scripts (`guard-bash.sh`, `guard-edits.sh`) that `settings.json` wires to run before tool calls. Claude Code reads the wiring from `settings.json`; keeping the scripts in a dedicated directory, protected from agent edits by `guard-edits.sh` itself, is this workspace's choice. |
| `tools/` *(workspace convention)* | Per-domain shell scripts that do the deterministic work behind skills: Mermaid rendering, pull request creation, skill scaffolding, and the auth and dependency doctors. Runnable by hand or from any agent. Jira and Confluence have no script here, because `hedy` is the one route to both. |
| `best-practices/` *(workspace convention)* | Convention docs the skills cite instead of duplicating: skill authoring (`skills/`), git and pull requests (`git/`), the house writing standard (`writing/`), and Claude Code enforcement mechanisms (`claude-code/`). |
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
2. `make install` runs `npm install` inside `trade-imports-documentation`, which resolves the tooling by relative path and installs everything else. The GitHub Pages site needs a second `npm install` in its `astro/` subdirectory.
3. Node 24 or later is required. `hedy confluence publish` sets the publisher's `CONFLUENCE_USERNAME`, `CONFLUENCE_API_TOKEN` and `CONFLUENCE_URL` from the `JIRA_*` variables in `.env`. Running the docs repo's publish script directly needs the `CONFLUENCE_*` variables in the environment.

`make` also clones [trade-imports-schemas](https://github.com/DEFRA/trade-imports-schemas), the JSON Schema and JSON-LD artefacts for trade-import payloads - a self-contained sibling with its own README.

## Origins

This workspace descends from `trade-imports-animals-workspace`, the equivalent harness for DEFRA animals-imports work. Skills, tools and hooks were copied across rather than rewritten.