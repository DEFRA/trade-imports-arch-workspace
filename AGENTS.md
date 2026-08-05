# AGENTS.md

Instructions for AI coding agents working in this workspace. Tools that
follow the [agents.md](https://agents.md/) standard (Cursor, Codex, and
others) read this file natively; Claude Code loads it through the import
in `CLAUDE.md`, which adds a Claude-specific layer on top.

## What this workspace is

A shared home for AI skills and tooling supporting DEFRA trade-imports
architecture work. The shared component — and the point of this repo — is
the tooling under `.claude/`: skills, per-domain tool scripts, guard
hooks, and best-practices docs. The tooling is Claude Code centric, but
the scripts and skill procedures are usable from any agent.

This checkout arranges the tooling as a context-engineering workspace:
the harness sits at the root, wrapping the repos and analysis corpus it
operates on. That arrangement is one way to consume it, not the
contract — colleagues work in different AI tools and workflows and are
expected to leverage the skills in their own workspace however suits
them. Accordingly, the repo's versioned payload is essentially `.claude/`
and the root docs; everything the workspace wraps is excluded by
`.gitignore`:

- `trade-imports-documentation/` — child git repo; docs-as-code hub:
  LikeC4/C4 models, Mermaid diagrams, and markdown published to GitHub
  Pages (Astro), Confluence, PPTX and PDF. **Has its own agent
  instructions** (CLAUDE.md/AGENTS.md) with the full command list, repo
  layout, and C4 modelling conventions — follow those for any work
  inside that repo.
- `delivery-info-arch-tooling/` — child git repo; the shared npm library
  (`@defra/delivery-info-arch-tooling`) that implements Confluence
  publishing, PPTX/PDF generation and diagram export. The docs repo
  consumes it as `file:../delivery-info-arch-tooling`, so the two must
  remain siblings.
- `trade-imports-schemas/` — child git repo; Defra JSON Schema and
  JSON-LD artefacts for trade-import payloads. **Has its own
  CLAUDE.md** — follow it for any work inside that repo.

## Paths

The canonical workspace root is `~/trade-imports-arch-workspace`,
a HOME-level symlink to the checkout. Every path in skills, tools and
docs is spelled against it, so the same commands resolve identically on
every machine. Always type that form — never a resolved `/Users/...`
path. The full contract and rationale: `.claude/rules/workspace-paths.md`.
Verify a machine with:

```bash
bash ~/trade-imports-arch-workspace/.claude/tools/workspace/check-workspace.sh
```

The root `Makefile` bootstraps a fresh machine: `make` clones any missing
child repo, creates the canonical symlink, and runs the check above
(`make clone` / `make pull` / `make link` / `make check` individually;
`GIT_BASE=git@github.com:DEFRA` for SSH clones).

## Credentials

The root `.env` holds Atlassian credentials, loaded into the environment
by direnv. Never read it — not with file readers, not with `jq`/`grep`
style tools. Scripts consume its variables from the environment; verify
credentials with the auth doctor below rather than inspecting the file.

## Runnable tooling

Per-domain shell scripts under `.claude/tools/<domain>/` do the
deterministic work. They are plain bash + curl + jq — runnable by any
agent or by hand, no harness required. Run any script with `--help` (or
read its header) for usage.

| Domain | What it provides |
| --- | --- |
| `jira/` | `fetch.sh` (JQL or batch-key fetch, flat JSON projection), `create-ticket.sh`, `auth.sh` pre-flight |
| `confluence/` | Hand tools for ad-hoc Confluence page reads, writes and doc sync |
| `confluence-publish/` | Pre-flight and executor for publishing one docs page to Confluence |
| `mermaid-check/` | Render Mermaid sources to prove they parse; sweep paths for diagrams |
| `skill-creator/` | Interview, scaffold and audit tooling for workspace skills |
| `workspace/` | `check-workspace.sh` (path contract doctor) and `check-auth.sh` (runs every domain's auth check) |

## Skills

`.claude/skills/<name>/SKILL.md` files are step-by-step procedures in the
[agentskills.io](https://agentskills.io/specification) format: an entry
point plus supporting references, delegating real work to the tool
scripts above. Claude Code invokes them natively; from any other agent,
read the SKILL.md and follow it as a procedure — the scripts it calls
run anywhere. Conventions shared by all skills:
`.claude/best-practices/skills/agent-skills.md`.
