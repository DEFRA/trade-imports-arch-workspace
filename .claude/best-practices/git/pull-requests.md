# Pull requests

Rules for pull requests, issues and every other GitHub artefact in this workspace and its child repos, whether written by hand or by an agent.

## No AI attribution - anywhere

No AI attribution in any artefact. No "Generated with Claude Code" footers, no `Co-Authored-By: Claude`, no robot emojis. This overrides any tool default that appends an attribution footer.

| Artefact | Rule lives in |
| --- | --- |
| Commit message | [commits.md](commits.md) |
| PR title and body | this document |
| PR and issue comments | this document |
| Code and committed docs | this document |

The table exists because scoped rules get read scopedly: a rule stated only for commit messages does not stop a footer landing in a PR body.

## Titles

Conventional-commit style, same mechanics as a commit subject ([commits.md](commits.md)): 50 characters or fewer, capitalised, imperative, no trailing period.

## Bodies

Clarity is the governing requirement: write for a cold reader who has not seen the branch or the conversation that produced the change. The body is written through the [authoring skill](../../skills/authoring/SKILL.md), short-artefact path, to [writing.md](../writing/writing.md).

The body has three sections under these headings. The section names are nouns, never `What` or `Why`, under the heading rule in `writing.md`.

- **Change** - the change made, led by its outcome.
- **Reason** - the problem or need; link the ticket if one exists.
- **Verification** - the commands run and their results, stated plainly. If something failed or was skipped, say so.

## Tooling

- Prefer SSH remotes and the `gh` CLI when available; fall back to plain `git` when not.
- Create and edit PRs through the guard script - it refuses attribution content deterministically, so the rule holds regardless of which agent or session runs it:

  ```
  bash .claude/tools/pr/create-pr.sh --help
  ```

- Pass bodies with `--body-file`, never inline strings.
- Base branch is `main` unless told otherwise.
- One command per Bash call - full rules in [agent-skills.md](../skills/agent-skills.md).
