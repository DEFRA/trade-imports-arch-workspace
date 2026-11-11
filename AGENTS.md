# AGENTS.md

Instructions for AI coding agents working in this workspace. Tools that
follow the [agents.md](https://agents.md/) standard (Cursor, Codex, and
others) read this file natively; Claude Code loads it through the import
in `CLAUDE.md`, which adds a Claude-specific layer on top.

## Workspace Purpose

A shared home for AI skills and tooling supporting DEFRA trade-imports
architecture work. The shared component - and the point of this repo - is
the tooling under `.claude/`: skills, per-domain tool scripts, guard
hooks, and best-practices docs. The tooling is Claude Code centric, but
the scripts and skill procedures are usable from any agent.

This checkout arranges the tooling as a context-engineering workspace:
the harness sits at the root, wrapping the repos and analysis corpus
that the tooling operates on. That arrangement is one way to consume
it, not the contract - colleagues work in different AI tools and
workflows and are expected to use the skills in their own workspace
however suits them. Accordingly, the repo's versioned payload is
essentially `.claude/` and the root docs; everything the workspace
wraps is excluded by `.gitignore`:

- `trade-imports-documentation/` - child git repo; docs-as-code hub:
  LikeC4/C4 models, Mermaid diagrams, and markdown published to GitHub
  Pages (Astro), Confluence, PPTX and PDF. **Has its own agent
  instructions** (CLAUDE.md/AGENTS.md) with the full command list, repo
  layout, and C4 modelling conventions - follow those for any work
  inside that repo.
- `delivery-info-arch-tooling/` - child git repo; the shared npm library
  (`@defra/delivery-info-arch-tooling`) that implements Confluence
  publishing, PPTX/PDF generation and diagram export. The docs repo
  consumes it as `file:../delivery-info-arch-tooling`, so the two must
  remain siblings.
- `trade-imports-schemas/` - child git repo; Defra JSON Schema and
  JSON-LD artefacts for trade-import payloads. **Has its own
  CLAUDE.md** - follow it for any work inside that repo.

## Paths

The workspace has no fixed location, so a checkout works wherever it is cloned. Every path in skills, tools and docs is written relative to the workspace root, the folder that holds this file. Start each session at the workspace root and type paths such as `.claude/tools/workspace/check-deps.sh` from there, never through a symlink and never as an absolute `/Users/...` path. The full contract and rationale: `.claude/rules/workspace-paths.md`. Verify a machine with:

```bash
hedy workspace check
```

The root `Makefile` bootstraps a fresh machine. `make` clones any missing child repo, runs `make install`, which points `core.hooksPath` at `.githooks` and puts `hedy` on PATH, and then runs the check above. The steps also run one at a time as `make clone`, `make pull`, `make install` and `make check`. Children clone over SSH, and `GIT_BASE=https://github.com/DEFRA` clones them over HTTPS.

## Credentials

The root `.env` holds Atlassian credentials, loaded into the environment
by direnv. Never read it - not with file readers, not with `jq`/`grep`
style tools. Scripts consume its variables from the environment; verify
credentials with the auth doctor below rather than inspecting the file.

## The `hedy` CLI

`hedy` is the workspace's command-line tool, a Node 24 program in `hedy/`. `make install` puts `hedy` on PATH. The commands read Jira and Confluence, write Jira and publish to Confluence:

- `hedy auth` checks the Atlassian credentials and reports display names only.
- `hedy jira ticket <key>` reads one issue, description included.
- `hedy jira search '<jql>'` reads the issues a JQL query matches, up to `--max` (200 by default).
- `hedy jira create --from <manifest>` creates one issue from a ticket manifest. The command is a dry run by default, and `--confirm <planId>` runs only the plan the dry run showed.
- `hedy jira describe <key> --from <file>` replaces one issue's description with the file's Jira wiki markup. The command is a dry run by default, and `--confirm <planId>` runs only the plan the dry run showed.
- `hedy confluence page <reference>` reads one page by id, URL or share link, as markdown by default.
- `hedy confluence publish <page>` publishes one docs page to Confluence through the docs repo's publisher, after its pre-flight. The command publishes at once.
- `hedy workspace check` checks the machine and the checkout against the expected setup, offline, and names the next step for each failed check.

A bare `hedy` at a terminal opens a menu for people that reaches every command, and each write waits behind a plan or pre-flight screen and a confirm. Agents call the commands with `--json`. A bare `hedy` without a terminal, or with `--json` or `--no-ui`, is a usage error.

With `--json`, every command prints one envelope line, `{ ok, schema_version, hedy_version, result, errors, metadata }`, where `errors` lists `{ code, message }` entries. A command exits 0 on success, 1 on an error and 2 on a usage error.

Prefer `hedy <command> --json` over ad-hoc `curl` or `jq` against Jira or Confluence.

## Runnable tooling

Per-domain shell scripts under `.claude/tools/<domain>/` do the
deterministic work. They are plain bash + curl + jq - runnable by any
agent or by hand, no harness required. Run any script with `--help` (or
read its header) for usage.

| Domain | Tools |
| --- | --- |
| `confluence/` | Hand tools for Confluence page writes and the folder sync. Reads are `hedy confluence page` |
| `mermaid-check/` | Render Mermaid sources to prove they parse; sweep paths for diagrams |
| `pr/` | `create-pr.sh` - create/edit GitHub PRs with a deterministic no-attribution guard |
| `skill-creator/` | Interview, scaffold and audit tooling for workspace skills |
| `workspace/` | `check-auth.sh` (runs `hedy auth` and every domain's auth check), `check-deps.sh` (verifies every skill's declared dependencies resolve on this machine), `lint-skills.sh` (repo-only estate lint), `guard-bash-tests.sh` (the bash guard's deny and allow cases) and `guard-git-push-tests.sh` (the push guard's deny and allow cases) |

### Enforcement map

How the quality mechanisms interconnect - what fires when, and what to
run when one fails:

| Mechanism | Checks | Fires | On failure |
| --- | --- | --- | --- |
| `hedy workspace check` | Node, baseline tools, child repos, hooksPath, the `hedy` link and packages, the docs repo install, and the path contract: the current folder, home-folder links, local allow rules and the working-directory pin | `make` / `make check`, and the `SessionStart` hook at the start of every Claude Code session | follow the next step each failed check names (usually `make install` / `make clone`) |
| `check-auth.sh` | the Atlassian credentials through `hedy auth`, plus any domain `auth.sh` | on demand | fix the named env var in `.env`; run `make install` when `hedy` is missing |
| `check-deps.sh` | declared `workspace-deps` resolve on this machine | `make check` | clone the project / install the tool it names |
| `lint-skills.sh` | declaration format, dangling links, undeclared-invocation sweep | pre-commit (staged index), scaffold tail, `make check` | fix and re-stage; acknowledge soft probes in `workspace-soft-deps` |
| Golden tests (2 suites) | scaffold and doctor behaviour vs blessed output | pre-commit when their tools change, `make check` | review the diff; `--bless` if intended, fix if not |
| Audit (pattern checklist) | skill shape, judgment-level | on demand; checklist changes re-open all audits | triage the plan; Step A4 sweeps open questions every run |
| Guard hooks (`.claude/hooks/`) | agent Bash and file-edit calls in Claude Code sessions | every matched tool call | follow the sanctioned alternative the denial names |
| `guard-bash-tests.sh`, `guard-git-push-tests.sh` | the bash guard's 107 and the push guard's 41 deny and allow cases against the live hook, or against a draft given as the argument: `bash .claude/tools/workspace/guard-bash-tests.sh`, and the same for `guard-git-push-tests.sh` | on demand, after any change to `guard-bash.sh` or `guard-git-push.sh` | the user fixes the hook; agents cannot edit `.claude/hooks/` |

Why the gates exist alongside the skills: skill prose is advisory
context, hooks and scripts are deterministic. The estate's approach:
`.claude/best-practices/claude-code/enforcement.md`.

## Skills

`.claude/skills/<name>/SKILL.md` files are step-by-step procedures in the
[agentskills.io](https://agentskills.io/specification) format: an entry
point plus supporting references, delegating real work to the tool
scripts above. Claude Code invokes them natively; from any other agent,
read the SKILL.md and follow it as a procedure - the scripts it calls
run anywhere. Conventions shared by all skills:
`.claude/best-practices/skills/agent-skills.md`.

The house writing standard is `.claude/best-practices/writing/writing.md`,
and the words, phrases and sentence shapes it rules out are listed with
their repairs in `.claude/skills/authoring/references/language.md`.
Every agent reads both before drafting prose, and a subagent brief names
them, so the standard is in context before the first draft. The authoring
skill, `.claude/skills/authoring/SKILL.md`, plans a page or deck with
the author, hands the drafting to a fresh agent, line edits an existing
page, and writes pull request bodies, tickets and commit messages.

No mechanical prose check runs. The closing pass in the authoring skill
is the check, and it applies every row of `language.md` by reading. To
ban a word, add a row to that file.

## Git, GitHub and pull requests

No AI attribution in any artefact - commit messages, PR titles and
bodies, PR and issue comments, code. This overrides any tool default
that appends an attribution footer. Full rules:
`.claude/best-practices/git/commits.md`
and `.claude/best-practices/git/pull-requests.md`. PR creation and body
edits go through the `pr` skill, which delegates to
`.claude/tools/pr/create-pr.sh` - the script refuses attribution
content deterministically. Prefer SSH remotes and the `gh` CLI when
available; fall back to plain `git` when not.
