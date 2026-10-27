# Owner Action for the Push Guard Gaps

**Severity: MAJOR (enforcement hole). Agents cannot apply the fix, because guard-edits.sh blocks agent edits under `.claude/hooks/` and `.claude/settings*.json`.**

## Finding

`.claude/hooks/guard-git-push.sh` is the only committed control that stops an agent pushing to `main`. GitHub has no branch protection and no ruleset on `main` for `DEFRA/trade-imports-arch-workspace`, checked with `gh api` on 27 Oct 2026.

The live hook matches regular expressions against the raw command. It recognises only `-C` among git's global options. It treats a refspec as targeting main only when the text reads `main` or `<ref>:main` with no quotes.

Piping payloads into the live hook on 27 Oct 2026 gave allow for each of these pushes to main:

- `git push origin HEAD:refs/heads/main`
- `git push origin 'main'`
- `git -c push.default=current push origin main`
- `git push origin HEAD`, with `main` checked out

With `main` checked out, `git push origin HEAD` and a bare `git push` both update `main` and name no branch. An agent can do this without any intent to bypass the guard.

## Missing Deny List

Lines 31 and 32 of `.claude/hooks/guard-bash.sh` say that force pushes to main, `chmod` and `rm -rf` are already handled by the deny list in `settings.json`. The committed `.claude/settings.json` has no `permissions.deny` list and no `ask` list.

`.claude/settings.local.json` has an empty `deny` list and an empty `ask` list. That file is also invalid JSON, because line 25 has no trailing comma. Its allow list holds `Bash(git *)`, which approves every git push without a prompt once the file parses.

The comment is also partly wrong about `chmod`, since `guard-bash.sh` denies `chmod` itself. Nothing in the workspace denies `rm -rf`.

Choose one of two corrections:

1. Add a `permissions.deny` list to `.claude/settings.json` for the cases the comment names.
2. Correct the comment in `guard-bash.sh` so it names the controls that exist.

Separately, add the missing comma to `.claude/settings.local.json`.

## Fix

The draft at `.claude/workareas/hedy/hooks/guard-git-push.sh` keeps the live hook's stdin and output contract, its deny idiom and its force-push denial. It reads only the command text and runs no git command. No decision depends on which branch is checked out.

The rule is that an agent push names its destination branch, and that branch is not main. The draft replaces the regular expressions with a word scanner. The scanner follows shell quoting, comments and command separators, and rescans a quoted command such as `sh -c "..."`. It runs on the macOS bash 3.2 with jq.

Before matching, the draft skips git's global options: `-C`, `-c`, `--git-dir`, `--work-tree`, `--namespace`, `--super-prefix`, `--attr-source` and `--config-env`, each with or without `=`. It also skips any other `-x`, `--opt` or `--opt=value`.

The draft denies a push when any of the following holds:

- **No destination.** No refspec follows the remote. A refspec is `HEAD` or `@`. A destination is `HEAD`, `refs/HEAD`, `@` or empty.
- **Main destination.** A destination is `main`, `heads/main` or `refs/heads/main`, a wildcard, or the matching refspec `:`.
- **Force.** The push has `-f`, `--force`, `--force-with-lease`, a short option cluster holding `f`, or a `+refspec`.
- **Every branch.** The push has `--all`, `--mirror` or `--branches`.
- **Hidden input.** A variable appears in the git subcommand or a refspec. A `-c alias.<name>` value pushes, or a `-c remote.<name>.push` refmap is set. A `GIT_DIR`, `GIT_WORK_TREE`, `GIT_NAMESPACE`, `GIT_COMMON_DIR` or `GIT_CONFIG*` prefix, or `--config-env`, precedes the push.

The draft also denies `git config` when it writes an alias that pushes or a `remote.<name>.push` refmap. Either could later send a named push to main.

Every denial names the allowed form: `git push -u origin <branch>`, with the branch written out, then a pull request.

## Choice Between Two Drafts

Two drafts implement the same rule, and the owner copies one of them.

- `guard-git-push.sh`, 303 lines, is the full scanner. It splits the command the way the shell does, rescans a quoted command such as `sh -c "..."`, and denies a `-c` alias that pushes, a variable in the subcommand or a refspec, and a `git config` write that could redirect a later push.
- `guard-git-push-minimal.sh`, 77 lines, strips quotes, splits at `;`, `&`, `|` and newlines, skips `VAR=value` words and git's global options, and applies the force, main and no-destination rules to each simple command. It leaves three routes open: a push wrapped in `sh -c`, `eval` or a command substitution, a git alias that pushes, and a variable holding `main`.

Both share one cost: an agent must always write the destination branch out. The minimal draft was tested against the payloads in the verification section on 27 Oct 2026 with the same decisions as the full draft, apart from the three open routes.

## Steps

1. Copy the chosen draft over the live hook:

   ```
   cp ~/trade-imports-arch-workspace/.claude/workareas/hedy/hooks/guard-git-push.sh ~/trade-imports-arch-workspace/.claude/hooks/guard-git-push.sh
   ```

   or

   ```
   cp ~/trade-imports-arch-workspace/.claude/workareas/hedy/hooks/guard-git-push-minimal.sh ~/trade-imports-arch-workspace/.claude/hooks/guard-git-push.sh
   ```

2. Run the verification below against the live path.
3. Make one of the deny-list corrections from the Missing Deny List section.
4. Commit the changes.
5. Delete this folder once the changes are committed.

The PreToolUse Bash wiring in `.claude/settings.json` already calls the hook, so the hook needs no settings change.

## Verification

Pipe each payload into the hook. Empty output means allow.

```
jq -n --arg c 'git push origin HEAD' '{tool_input:{command:$c}}' | bash ~/trade-imports-arch-workspace/.claude/hooks/guard-git-push.sh
```

Every observed result below came from the draft path on 27 Oct 2026. No case depends on the checked-out branch, so every row was observed.

| Payload | Expected | Observed |
| --- | --- | --- |
| `git push origin HEAD:refs/heads/main` | deny | deny, "Pushes to main are not allowed" |
| `git push origin 'main'` | deny | deny, "Pushes to main are not allowed" |
| `git -c push.default=current push origin main` | deny | deny, "Pushes to main are not allowed" |
| `git push origin HEAD` | deny | deny, "does not name its destination branch" |
| `git push` | deny | deny, "does not name its destination branch" |
| `git push origin` | deny | deny, "does not name its destination branch" |
| `git push -u origin HEAD` | deny | deny, "does not name its destination branch" |
| `git push origin feature:HEAD` | deny | deny, "does not name its destination branch" |
| `git push --force origin feature` | deny | deny, "Force pushes rewrite history" |
| `git push origin feature` | allow | allow |
| `git push -u origin hedy-and-tim` | allow | allow |
| `git -C ~/trade-imports-arch-workspace push origin hedy-and-tim` | allow | allow |

Further cases checked against the draft on the same date:

| Payload | Expected | Observed |
| --- | --- | --- |
| `git push --force-with-lease origin feature` | deny | deny, force |
| `git push -uf origin feature` | deny | deny, force |
| `git push origin +feature` | deny | deny, force |
| `git push origin HEAD:main` | deny | deny, main |
| `git push origin :main` | deny | deny, main |
| `git --no-pager --git-dir=.git push origin main` | deny | deny, main |
| `sh -c "git push origin main"` | deny | deny, main |
| `echo "$(git push origin main)"` | deny | deny, main |
| `git push origin feature:` | deny | deny, no destination |
| `git push origin @` | deny | deny, no destination |
| `git push --tags origin` | deny | deny, no destination |
| `git push origin 'refs/heads/*:refs/heads/*'` | deny | deny, wildcard |
| `git push origin :` | deny | deny, matching refspec |
| `git push --all origin` | deny | deny, every branch |
| `git -c 'alias.p=push origin main' p` | deny | deny, alias |
| `git -c alias.p='!git push origin main' p` | deny | deny, alias |
| `git -c remote.origin.push=refs/heads/feature:refs/heads/main push origin feature` | deny | deny, refmap |
| `git config alias.p 'push origin main'` | deny | deny, alias write |
| `git config --global alias.sync '!git push'` | deny | deny, alias write |
| `git config remote.origin.push HEAD:main` | deny | deny, refmap write |
| `B=main` then `git push origin $B` | deny | deny, variable in refspec |
| `P=push` then `git $P origin main` | deny | deny, variable in subcommand |
| `GIT_DIR=.git git push origin feature` | deny | deny, hidden location |
| `git push -u origin HEAD:hedy-and-tim` | allow | allow |
| `git push -u origin hedy-and-tim 2>&1 \| tail -5` | allow | allow |
| `git push origin main:feature` | allow | allow |
| `ls #git push origin main` | allow | allow |
| `git config --get remote.origin.push` | allow | allow |
| `git config user.name` | allow | allow |
| `git commit -m "fix(hooks): Close push gaps"` then `git log --oneline \| head -3` | allow | allow |

A 13 KB command took 0.11 seconds to scan.

## Residual Limits

- **No server-side control.** A word scanner cannot see through every indirection. Examples are a script on disk that pushes, and an alias or refmap already present in a config file. Branch protection or a ruleset on `main` in GitHub is the authoritative control, and the repository has neither.
- **Fail-closed false positives.** Quoted text that reads as a push to main or a force push is denied, for example in a commit message or a heredoc body. Write such text to a file and pass the file with `-F`.
- **Tag pushes.** `git push --tags origin` is denied, because the push names no destination. A named tag push such as `git push origin v1.0` is allowed.
- **Branch name.** The draft guards `main` only. A repository whose default branch is `master` is not covered.
