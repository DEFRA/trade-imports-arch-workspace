# Owner Action: Replace guard-bash.sh

**Severity: MAJOR (enforcement hole). Agents cannot apply the fix, because guard-edits.sh blocks agent edits under `.claude/hooks/`.**

## Finding

`.claude/settings.json` allowlists `Bash(hedy:*)`, and `make link` installs `hedy` with `npm link` from the live checkout, so every `hedy` call runs the uncommitted worktree under `hedy/src/`. The live `guard-bash.sh` denies an uncommitted or modified executable only when the executable is word 1 of the command and is written as a path. A bare name such as `hedy`, and an interpreter launch such as `bash <path>` or `node <path>`, pass that check. An agent can therefore edit `hedy/src/commands/hello.js` and run `hedy hello` with no prompt, which is the write-then-execute route the guard exists to close. Two further defects were found while probing: the secret-read check misses a `.env` path unless the path is the last word of the command, and the header claims a `settings.json` deny list that does not exist.

## Fix

`guard-bash.sh` in this folder is a complete replacement, not a patch. The owner copies the whole file over the live hook. The file keeps the live hook's stdin and output contract, its deny idiom and its nine checks, and changes the following.

- **hedy tree rule, new.** Any hedy entry point needs a clean hedy tree: no uncommitted change under `hedy/src` or to `hedy/package.json` and `hedy/package-lock.json`. Entry points are the bare name, a path into `hedy/`, and a launcher (`bash`, `sh`, `zsh`, `node`, `python`, `python3`, `env`, `xargs`, `npx`) given one of those. The denial names the fix: commit or revert the hedy change, and run uncommitted hedy code through `npm test`.
- **Launchers, extended.** The committed-and-unmodified rule now also applies to the first plain argument of `bash`, `sh`, `zsh`, `node`, `python`, `python3`, `env` and `xargs`, so `bash <uncommitted script>` is denied as `./<uncommitted script>` already was. This is a behaviour change for the whole estate: a tool script under `.claude/tools/` that an agent has edited cannot be run until the edit is committed, and a script under `/tmp` cannot be run through `bash` at all. Both follow the rule the live hook already states for path invocation. To drop the change, remove `bash|sh|zsh|python|python3` from `is_launcher`.
- **Secret reads, fixed.** Every argument of a reader is checked, not only the last word.
- **direnv exec, stripped.** `direnv exec <dir> <command>` is the sanctioned way to run the Atlassian scripts and is allowlisted, so the guard now strips that wrapper and checks the command behind it, as it does for `sudo` and `timeout`.
- **core.hooksPath, denied.** Setting, unsetting or overriding `core.hooksPath` detaches the pre-commit gates the `--no-verify` check protects; reading the value stays allowed.
- **Header, corrected.** No claim about a settings deny list. Pushes are named as `guard-git-push.sh`'s job.
- **Removed.** The `npx playwright test` redirect, which belonged to the workspace this hook was copied from; the ticket codes in comments; and the half-pasted hedy functions from the earlier draft.
- **Structure.** One helper per rule, one segment checker calling them in order, then the whole-command checks, then the redirects.

## Effect on the Order of Work

The orchestrator commits each hedy step before running `hedy` to verify the step. That is the intended order: the commit is the visible, reviewable step the guard already demands of path-invoked scripts. Tests stay available on uncommitted code through `npm test`, which the guard does not touch.

While any agent holds uncommitted edits under `hedy/src`, every `hedy` call in the session is denied, including the jira and confluence-read skills' pre-flight. Parallel hedy workers sharing one worktree therefore block each other's verification. Separate worktrees per worker avoid that.

## Residual Gaps

The hook sees only the command string, so these routes still run a dirty hedy tree or an uncommitted script: a script that calls `hedy` or another script internally (`check-auth.sh` runs `hedy auth`, `make check` runs `check-auth.sh`); `bash -c "..."`, `eval` and `node -e` with inline code; `npm exec hedy`. The hedy rule fails open when `git status` errors, for example when the canonical root is missing. Installing hedy from a committed snapshot instead of `npm link` would close every route above at the cost of a reinstall per commit.

## Steps

1. Copy the replacement over the live hook:

   ```
   cp ~/trade-imports-arch-workspace/.claude/workareas/hedy/hooks/guard-bash.sh ~/trade-imports-arch-workspace/.claude/hooks/guard-bash.sh
   ```

2. Run the test runner against the live path. Every line must read `ok` and the last line `fails: 0`. The runner creates and removes an untracked probe file under `hedy/src` and a probe script under `/tmp`:

   ```
   bash ~/trade-imports-arch-workspace/.claude/workareas/hedy/hooks/guard-bash-tests.sh ~/trade-imports-arch-workspace/.claude/hooks/guard-bash.sh
   ```

3. Wire-level proof: in a Claude Code session with an untracked file under `hedy/src`, a `hedy hello` Bash call comes back denied with the reason above.
4. Commit the hook change.
5. Delete this folder once the change is committed.

The PreToolUse Bash wiring in `.claude/settings.json` already calls the hook, so the settings need no change.
