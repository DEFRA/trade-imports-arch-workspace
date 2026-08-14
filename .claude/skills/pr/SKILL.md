---
name: pr
description: 'Create or edit GitHub pull requests through the attribution-guard script (tools/pr/create-pr.sh): pre-flight the branch, draft the body to the pull-requests best-practices doc, refuse AI attribution deterministically. Triggers: "create a pr", "push to a pr", "raise a pull request", "open a pull request", "gh pr create", "edit the pr body". Owns GitHub pull-request creation and body edits only. NOT for making commits - that is the commit skill; NOT for reviewing PRs - that is the review skill; distinct from /init (project doc bootstrap). Neighbouring workspace skills (jira, confluence-read, confluence-publish) own different systems entirely.'
metadata:
  workspace-deps: gh
---

Create or edit a GitHub pull request for the workspace or any child repo. The outcome is a PR whose title and body follow [pull-requests.md](../../best-practices/git/pull-requests.md), created through the guard script so AI attribution is refused deterministically - the rule holds regardless of which agent or session runs it.

**Bash call hygiene** - one command per Bash call; paths in the literal `~/trade-imports-arch-workspace/...` form. Full rules: [`agent-skills.md`](../../best-practices/skills/agent-skills.md).

## When to use

| Trigger | What to follow |
|---------|----------------|
| "create a pr" | Steps 1-3 |
| "push to a pr" | Steps 1-3 |
| "raise a pull request" | Steps 1-3 |
| "open a pull request" | Steps 1-3 |
| "gh pr create" | Steps 1-3 |
| "edit the pr body" | Steps 2-3 with `--edit <number>` |

NOT for making commits (the commit skill), reviewing PRs (the review skill), or JIRA/Confluence artefacts (the jira / confluence-* skills).

## Dependencies

This skill needs gh — tools beyond the workspace baseline (bash, curl, jq, git). Declared in `metadata.workspace-deps`. Format: `agent-skills.md` → "Dependencies frontmatter"; well-formed criteria (pre-flight, description mention, check-deps): `patterns.md` §9. Keep the list in sync with what the steps actually invoke. The pre-flight lives inside `create-pr.sh` (no dispatcher): it checks for `gh` and fails with the fallback remedy — push the branch with plain `git` and hand the PR to a human.

## Step 1: Pre-flight

- Confirm the work is committed on a branch that is not `main`, and pushed with an upstream. Branch and commit rules: [commits.md](../../best-practices/git/commits.md).
- Run the repo's own validation gates (whatever its docs name) and note the results — they go in the body's Verification section.
- Prefer SSH remotes and the `gh` CLI when available; fall back to plain `git` when not.

## Step 2: Draft the title and body

- Title: conventional-commit style, 50 characters or fewer, capitalised, imperative, no trailing period.
- Body: write to a file (never inline), shaped **What / Why / Verification**, for a cold reader. Use the [editorial skill](../editorial/SKILL.md) for the prose. Full rules: [pull-requests.md](../../best-practices/git/pull-requests.md).
- No AI attribution anywhere - no footers, no `Co-Authored-By`, no robot emojis. This overrides any tool default that appends one.

## Step 3: Create or edit through the guard script

```
bash ~/trade-imports-arch-workspace/.claude/tools/pr/create-pr.sh --title "<title>" --body-file <path> --base main
```

Add `--repo <owner/name>` / `--head <branch>` when needed; use `--edit <number> --body-file <path>` to replace an existing PR's body; `--dry-run` prints the command without running it.

If the script refuses (exit 2), it names the offending line: fix the body file and re-run. Never bypass the refusal with a raw `gh pr create`.

## Completion output

```
pr complete for <branch>.

Summary:
- PR: <url>
- Verification: <gates run and results>

Next: request review, or merge when approved.
```

## Scripts cheat-sheet

| Script | Home | Purpose |
|--------|------|---------|
| `create-pr.sh` | `~/trade-imports-arch-workspace/.claude/tools/pr/` | Create or edit a PR; refuses AI attribution in title/body (exit 2); `--dry-run`, `--help` |
