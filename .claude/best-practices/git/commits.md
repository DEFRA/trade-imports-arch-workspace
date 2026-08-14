# Commit messages

Rules for every commit in this workspace and its child repos, whether written by hand or by an agent.

## Shape

- Subject: `<type>(<scope>)?: <Imperative summary>` - conventional types (`feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `style`, `perf`, `build`, `ci`); scope optional, lowercase, single word.
- Subject length: 50 characters or fewer. Capitalised, imperative mood ("Add", not "Added"), no trailing period.
- Separate subject from body with a blank line.
- Wrap body lines at 72 characters.

## Body

- Omit by default. Add one only when the subject cannot carry the meaning: a non-obvious why, a multi-area diff, a trade-off or follow-up worth recording.
- The body explains why, not what - the diff already shows the what.
- Tone: imperative, plain, factual. For prose style, follow the [editorial skill](../../skills/editorial/SKILL.md), which builds on [writing.md](../gds/writing.md) and [language.md](../gds/language.md).

## Never add

- Emojis.
- Attribution trailers: no `Co-Authored-By:`, no "Generated with Claude Code" footer, no `Signed-off-by:` unless explicitly requested. The same rule covers every GitHub artefact - see [pull-requests.md](pull-requests.md).

## Workflow rules

- Branch first: never commit to `main` directly; create a branch off `main`.
- Do not `--amend` a pushed commit without explicit permission.
- Never `--no-verify`. If a hook fails, the commit did not happen: fix the cause, re-stage, create a new commit.
- Stage paths explicitly; never `git add -A` or `git add .`.
