# Step 4: Owner Steps

Step 4 deletes the editorial estate. Three commits are on `authoring-voice` and the deletion is staged. The last commit needs changes to files that `guard-edits.sh` keeps from agents: the git hooks and the settings files. The finished files and a script that puts them in place are in `step-4-owner/`, beside this document.

## What Changes

| File | Change | Why |
| --- | --- | --- |
| `.githooks/pre-commit` | replaced by `step-4-owner/pre-commit` | The current hook exits when `check-prose.sh` is missing from the staged tree and runs three golden suites of deleted tools, so it fails the commit that deletes them. The new hook keeps the hedy lint and tests, the skills lint, and the scaffold and deps-doctor goldens. The two conditions that both set `NEED_TMP` collapse into one early exit. |
| `.githooks/commit-msg` | deleted | It only ran the prose gate on the commit message. |
| `.claude/settings.json` | staged as it stands | The two deleted skill allows and the write-time check hook are already removed by hand. The edit is unstaged and belongs in this commit. |
| `.claude/settings.local.json` | replaced by `step-4-owner/settings.local.json` | Drops the `Write` allow for the deleted editorial-triage workarea. Nothing else changes. The file is gitignored. |

`Skill(authoring)` is in neither allowlist. Adding it is the owner's choice, and the draft leaves it out.

## Applying

Review the two files, then run:

```
bash ~/trade-imports-arch-workspace/.claude/workareas/technical-authoring/step-4-owner/apply.sh
```

The script moves the files into place, stages the hook and the settings change, deletes `commit-msg`, and commits the index with the message in `step-4-commit-message.txt`. The new pre-commit hook runs on that commit, so the staged tree passes the skills lint and both goldens before the commit lands. After the commit the script proves the result: both settings files parse, no gate or settings file names the estate, and `make check` passes. On success it removes `step-4-owner/`.

The script stops at the first failure and skips any move already made, so it runs again after a fix. If `make check` fails after the commit has landed, fix the cause and run `make check` by hand.

Nothing is pushed. Step 5 waits for the owner's word.

## Afterwards

Four folders lost their `.gitignore` entries and show as untracked: `.claude/workareas/editorial/`, `.claude/workareas/editorial-triage/`, `.claude/workareas/design-consistency/` and `editorial-research/`. They hold run state of the deleted skills. Delete or keep them. Nothing tracked reads them, and an untracked folder enters a commit only when staged.
