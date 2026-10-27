# Guard Hook Fixes for the Owner

Agents cannot write under `.claude/hooks/`, so the three fixed hooks wait here as whole-file drafts for the owner to copy into place.

## The Two Findings

**Aliased pushes.** The push guard recognised a push only when the git subcommand word was literally `push`. An alias defined with `git -c alias.x=push`, with `git config alias.x push` or through a `GIT_CONFIG_*` variable ran a push the guard never inspected. A push inside a `$(...)` substitution, behind quotes such as `pu"sh"` or under `bash -c` escaped the guard too. The draft denies every alias and config override on a git command, reads substitution bodies and wrapped commands, and denies `git push --no-verify`.

**Hooks-path and commit gate bypasses.** The bash guard matched `core.hooksPath` case-sensitively and only in the `--unset` and key-value forms. Lower-case keys, the git 2.46 `unset`, `remove-section` and `rename-section` forms, `GIT_CONFIG_*` variables and `git commit -n` all detached the gates. The edit guard also left `.githooks/`, `.git/config` and `.git/hooks/` open to the Edit and Write tools. The drafts deny each of these forms, and the edit guard now protects the global git config as well.

## Verify the Drafts

Both runners are committed. Each takes a draft as its argument, so the drafts can be checked before the copy:

```bash
bash ~/trade-imports-arch-workspace/.claude/tools/workspace/guard-bash-tests.sh ~/trade-imports-arch-workspace/.claude/workareas/hedy/hooks/guard-bash.sh
bash ~/trade-imports-arch-workspace/.claude/tools/workspace/guard-git-push-tests.sh ~/trade-imports-arch-workspace/.claude/workareas/hedy/hooks/guard-git-push.sh
```

Each run ends with `fails: 0` when every case holds.

## Install the Drafts

```bash
cp ~/trade-imports-arch-workspace/.claude/workareas/hedy/hooks/guard-bash.sh ~/trade-imports-arch-workspace/.claude/hooks/guard-bash.sh
cp ~/trade-imports-arch-workspace/.claude/workareas/hedy/hooks/guard-git-push.sh ~/trade-imports-arch-workspace/.claude/hooks/guard-git-push.sh
cp ~/trade-imports-arch-workspace/.claude/workareas/hedy/hooks/guard-edits.sh ~/trade-imports-arch-workspace/.claude/hooks/guard-edits.sh
```

Then run both runners again with no argument, which tests the live hooks:

```bash
bash ~/trade-imports-arch-workspace/.claude/tools/workspace/guard-bash-tests.sh
bash ~/trade-imports-arch-workspace/.claude/tools/workspace/guard-git-push-tests.sh
```

## The Control a Typed Command Cannot Bypass

The guards read command text, so a determined command can still route around every guard: a script that rewrites `.githooks/pre-commit`, or a shell redirect into `.git/config`. A GitHub ruleset on `main` that requires a pull request and blocks force pushes is the only control that holds whatever runs on this machine.
