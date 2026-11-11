# Hand-Off: File Tools Refuse Symlinked Paths

This note hands an investigation to a fresh agent. Ben Letton owns the workspace and parked the investigation on 10 November 2026 to finish other work. Read the whole note before running anything.

## The Question

Claude Code's Edit and Write tools refuse a file reached through the canonical path `~/trade-imports-arch-workspace/...` with "File has not been read yet. Read it first before writing to it", even straight after a Read of the same path. Ben wants the root cause established and a recommended fix he can apply. The fix will touch `.claude/hooks/`, `.claude/settings.json` or the checkout's location, all of which only Ben may change.

## The Short Answer So Far

No guard denies anything. The refusal comes from Claude Code's built-in rule that a file is read before it is edited, and that rule collides with a workspace hook that rewrites file paths. The underlying cause is that the canonical path is a symlink to a checkout stored elsewhere, while Claude Code compares paths as typed and does not resolve symlinks. Each layer added since has patched the gap between the two spellings of one path.

## Constraints on Your Work

- You cannot edit `.claude/settings.json`, `.claude/settings.local.json` or anything under `.claude/hooks/`. `guard-edits.sh` blocks those edits. Draft any change as text for Ben.
- `guard-bash.sh` runs on every Bash call. One command per call, no `&&` chaining, and no literal `/Users/` path in a command. Type `~/trade-imports-arch-workspace/...` in Bash, or `$HOME/...` inside a quoted path.
- Never read the root `.env`, which holds Atlassian credentials, with any tool.
- Commit, push or move nothing without Ben's explicit instruction. Moving the checkout is Ben's decision and Ben's action.
- Follow `AGENTS.md` and `CLAUDE.md` at the workspace root.

## Background: The Chain of Causes

1. **The canonical path.** Every path in the estate is written against `~/trade-imports-arch-workspace`, so the same text resolves on every machine. The Bash permission allowlist in `settings.json` matches that typed form, for example `Bash(~/trade-imports-arch-workspace/.claude/tools/:*)`. The contract is in `.claude/rules/workspace-paths.md` and `.claude/best-practices/skills/agent-skills.md`, section "Workspace root resolution".
2. **The symlink on Ben's machine.** On Ben's machine `~/trade-imports-arch-workspace` is a symlink to the real checkout at `~/projects/defra/trade-imports-arch-workspace`. `make link` creates the symlink (`Makefile`, target `link`) and points it at the directory `make` runs in. The design intends the symlink for "a machine where the checkout lives elsewhere".
3. **Rules stopped loading.** Claude Code loads path-scoped rules (`.claude/rules/*.md` with `paths:` frontmatter) and nested CLAUDE.md files by matching the typed file path against the project directory, which is the real checkout path. A path through the symlink matched nothing, so `authoring-voice.md`, `hedy-clients.md` and the docs repository's CLAUDE.md never loaded. An InstructionsLoaded log proved this on 30 October 2026.
4. **The fix for rule loading.** Commit `4961f2e` (30 October 2026) added `.claude/hooks/realpath-file-tools.sh`. The hook is wired in `settings.json` as a `PreToolUse` hook with the matcher `Read|Edit|Write|MultiEdit`. It rewrites `tool_input.file_path` from the symlinked form to the real path through `updatedInput`. The hook exits without output when the real root equals the link, so the hook does nothing on a machine whose checkout already sits at `~/trade-imports-arch-workspace`. `.claude/best-practices/claude-code/enforcement.md`, section "Rules and Their Scope", records the finding.
5. **The fix broke read tracking.** A Read through `~` is rewritten, so Claude Code records the file as read under the real path. An Edit through `~` is checked against the typed path before the rewrite applies, finds no read under that path, and is refused.

## Evidence

The reproduction ran on 10 November 2026 on a disposable copy, `trial/round-2/ins-event-design/read-x.md`:

1. Read the file through `~/trade-imports-arch-workspace/trial/round-2/ins-event-design/read-x.md`. The Read succeeded.
2. Edit the file through the same `~` path. Claude Code refused with "File has not been read yet".
3. Edit the file through the real path, `~/projects/defra/trade-imports-arch-workspace/...`, typed in full as the file tool requires. The Edit succeeded.
4. The test edit was reverted, and `cmp` confirmed the copy matches its source, `page-2.md`.

Further evidence from the same session: a drafting subagent hit the refusal three times on `~` paths and worked round each one by deleting the file and writing the whole file again. That workaround bypasses the read-before-write safety check, so the bug carries a real risk of overwriting work.

## Open Questions

- **The internal order.** The conclusion that the read check runs on the typed path before `updatedInput` applies is an inference from the reproduction. Claude Code's internals were not inspected. Check the Claude Code hooks documentation on `updatedInput` and on when input validation runs.
- **The other combinations.** Untested: a Read through the real path followed by an Edit through `~`, a Write that creates a new file through `~`, MultiEdit, and NotebookEdit, which the realpath hook's matcher does not include.
- **The staleness check.** Claude Code also refuses an edit when the file changed since the last read. Whether that check is keyed on the typed or the rewritten path is unknown, and it matters for any fix that narrows the hook.
- **Subagents.** Whether a subagent's read tracking behaves the same way as the main session's is assumed from the drafter's reports and was not tested directly.

## Options

1. **File tools take the real path.** Agents type the real checkout path for Read, Edit and Write, and keep the `~` form for Bash. This is the workaround the main session used. The cost is an exception to the path contract that every skill, brief and agent has to remember, and the contract table in `workspace-paths.md` does not yet mention file tools.
2. **Move the checkout (the recommended root fix).** Move the checkout to `~/trade-imports-arch-workspace` itself, and leave a symlink at `~/projects/defra/trade-imports-arch-workspace` for anything that still uses the old path. The typed path is then the real path, rules load without a rewrite, read tracking matches and the Bash allowlist still matches. The realpath hook becomes a no-op by its own line 28 and can be removed later. Costs to check before recommending this:
   - Claude Code keys a project's memory directory on the path a session starts in. The current memory lives at `~/.claude/projects/-Users-benoit-projects-defra-trade-imports-arch-workspace/memory/`. Sessions started from the new path would get a new, empty directory, so the memory needs copying or linking across.
   - `make link` ran `npm link` for `hedy` from the real path, so the global `hedy` link may point at the old location and need `make link` again.
   - direnv approves an `.envrc` by its path, so the moved checkout needs a fresh approval. Ben runs that step himself. Agents never run `direnv allow` and never read `.env`.
   - Search the estate, IDE settings and git configuration for the literal old path. Use `command grep`, because a shell function hides gitignored paths, and give the root a trailing slash, because `grep -r` on the bare symlink returns nothing.
   - Another Claude session, "INS Env Config", ran against this workspace. Any open session should be closed before a move.
   - `Makefile` `link` points the symlink at `$(CURDIR)`, so the target's direction and wording may need to change for machines set up after the move.
3. **Narrow the hook.** Remove `Read` from the hook's matcher, or drop the hook. Either restores read tracking for `~` paths but brings back the failure to load path-scoped rules on Read, which was the reason the hook exists. Test the staleness check before choosing this.
4. **Report upstream.** A `PreToolUse` hook's `updatedInput` changes the path the tool uses but not the path the read check uses, which looks like an inconsistency in Claude Code. A report helps later but fixes nothing today.

## Suggested Next Steps

1. Read `.claude/hooks/realpath-file-tools.sh`, the `PreToolUse` block of `.claude/settings.json`, commit `4961f2e` and `enforcement.md`, section "Rules and Their Scope".
2. Read the Claude Code documentation on `PreToolUse` hooks and `updatedInput`, and settle the internal order wherever the documentation states the order.
3. Run the untested combinations on a disposable file you create for the purpose, and record each result. Delete the file afterwards.
4. For option 2, list every place the old path appears and every step of the move, in order, with the memory directory step first.
5. Write a recommendation for Ben with the evidence, and draft any change to `settings.json`, the hook or the `Makefile` as text for Ben to apply. Put each decision to Ben as a question with the recommendation first.

## Files

| File | Relevance |
| --- | --- |
| `.claude/hooks/realpath-file-tools.sh` | The hook that rewrites file paths |
| `.claude/settings.json`, the `PreToolUse` block | The hook's wiring and matcher |
| `.claude/best-practices/claude-code/enforcement.md` | The recorded finding on rule loading |
| `.claude/rules/workspace-paths.md` | The path contract |
| `.claude/best-practices/skills/agent-skills.md` | The rationale for the canonical path |
| `Makefile`, target `link` | The creation of the symlink and the `hedy` link |
| `.claude/tools/workspace/check-workspace.sh` | The path contract doctor to run after any change |
