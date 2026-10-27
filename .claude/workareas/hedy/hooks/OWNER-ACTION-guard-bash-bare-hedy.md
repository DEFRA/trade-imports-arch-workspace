# Owner Action Required: guard-bash.sh Does Not Gate Bare hedy

**Severity: MAJOR (enforcement hole). Agents cannot fix this. Edits under `.claude/hooks/**` are blocked by guard-edits.sh by design.**

## Finding

`.claude/settings.json` allowlists `Bash(hedy:*)`. `make link` installs `hedy` with `npm link` from the live checkout, so every `hedy` call executes the uncommitted worktree under `hedy/src/`. Check 2 of `guard-bash.sh` denies a path-invoked executable that is uncommitted or differs from HEAD, which is this incident class. Check 2 skips bare command names, so `hedy hello` after an agent edits `hedy/src/commands/hello.js` runs the edit with no prompt. The other hooks miss this case too. `guard-edits.sh` protects only settings and hooks, `hedy-require-sibling-test.sh` fires only on a new source file, and `hedy-forbid-spy-assertions.sh` fires only on test files.

Probing the current hook with piped payloads on 27 Oct 2026 found two more gaps on the same route:

- **Interpreter launches pass check 2.** `bash <dirty script>` printed nothing, because check 2 inspects only word 1 and `bash` is a bare name. `node ~/trade-imports-arch-workspace/hedy/src/cli.js hello` passes for the same reason, so the existing path check does not catch that launch.
- **Check 2 checks one file.** `hedy/src/cli.js` invoked by path is denied only when `cli.js` itself is dirty. An edited command module that `cli.js` imports still runs.

The snippet below closes all three gaps. Each hedy entry point now needs a clean hedy tree, not only a clean file at word 1.

## Snippet

Part 1 goes at the top level of `guard-bash.sh`, directly after the `READERS=` line.

```bash
# hedy is installed with `npm link` from the live checkout, so every hedy call
# runs the worktree under hedy/. Any hedy entry point needs a committed, clean
# hedy tree, not only a clean file at word 1 (check 2 checks only that file).
HEDY_REPO="$HOME/trade-imports-arch-workspace"
HEDY_REAL=$(realpath "$HEDY_REPO/hedy" 2>/dev/null)

# 0 when $1 resolves to hedy/ or a path inside it (any path form).
hedy_path() {
  local p=$1 r
  [ -n "$HEDY_REAL" ] || return 1
  case "$p" in
    '~/'*)     p="$HOME/${p#\~/}" ;;
    '$HOME/'*) p="$HOME/${p#\$HOME/}" ;;
    /*)        ;;
    *)         p="$CWD/$p" ;;
  esac
  r=$(realpath "$p" 2>/dev/null) || return 1
  [ -e "$r" ] || return 1
  case "$r" in
    "$HEDY_REAL"|"$HEDY_REAL"/*) return 0 ;;
  esac
  return 1
}

# Deny when hedy/ has uncommitted source or dependency changes.
hedy_clean_or_deny() {
  local dirty
  dirty=$(git -C "$HEDY_REPO" status --porcelain -- hedy/src hedy/package.json hedy/package-lock.json 2>/dev/null \
    | head -n 5 | sed 's/^ *//' | tr '\n' ' ')
  [ -z "$dirty" ] && return 0
  deny "Blocked: '$1' runs the hedy checkout (npm link), which has uncommitted changes: ${dirty% }. Commit or revert the hedy change, then run the command. To exercise uncommitted hedy code, run the tests through npm instead (npm test in hedy/, as hedy/CLAUDE.md sets out)."
}
```

Part 2 goes inside `check_segment`, after the check 3 block and before the `# 2. path-invoked executable` comment. Check 2 returns early for bare names, so the new check must sit above check 2.

```bash
  # 7. hedy runs the live checkout: bare `hedy`, a path into hedy/ at word 1,
  #    `env|xargs|npx ... hedy` and `node|env|xargs <path in hedy/>` all need
  #    a clean hedy tree. npx is not path-scanned, so `npx vitest run <test>`
  #    stays allowed.
  [ "$cmdname" = hedy ] && hedy_clean_or_deny "$first"
  case "$first" in */*) hedy_path "$first" && hedy_clean_or_deny "$first" ;; esac
  case "$cmdname" in
    env|xargs|npx|node)
      local IFS=$' \t'   # the segment loop sets IFS to newline only
      for arg in $seg; do
        arg=${arg//\"/}; arg=${arg//\'/}
        case "$arg" in -*) continue ;; esac
        if [ "$arg" = hedy ]; then
          hedy_clean_or_deny "$cmdname hedy"
        elif [ "$cmdname" != npx ] && hedy_path "$arg"; then
          hedy_clean_or_deny "$cmdname $arg"
        fi
      done ;;
  esac
```

The check runs per segment, so it inherits the guard's existing coverage. Leading `VAR=value` assignments are stripped, and so are the wrappers `sudo`, `command`, `exec`, `nohup`, `time`, `nice`, `stdbuf`, `setsid` and `timeout`. Segments split on `;`, `|`, `||`, `&` and newlines, and command substitutions are checked too. `&&` never reaches the check, because the chaining redirect denies it first.

Also add a line for check 7 to the header comment list at the top of the file.

## Effect on the Order of Work

The orchestrator must commit each hedy step before running `hedy` to verify the step. That is the intended order, because the commit is the visible, reviewable step that check 2 already demands of path-invoked scripts. Tests stay available on uncommitted code through `npm test`, which the check does not touch.

One side effect needs a decision. While any agent holds uncommitted edits under `hedy/src`, every `hedy` call in the session is denied. That includes the jira and confluence-read skills, which now call `hedy`. Parallel hedy workers sharing one worktree will therefore block each other's verification and any unrelated Jira or Confluence call. Separate worktrees per worker avoid the problem. A test of the drafted check on 27 Oct 2026 denied `hedy auth` against the real checkout, because five hedy client files held uncommitted edits from a running worker.

## Residual Gaps

The hook sees only the command string, so these routes still run a dirty hedy tree:

- **Scripts that call hedy internally.** `check-auth.sh` runs `hedy auth` inside the script, and `make check` runs `check-auth.sh`. The hook sees only the outer command.
- **Indirect shells.** `bash -c "hedy auth"`, `sh -c`, `eval` and `node -e` with an inline import pass.
- **npm launchers.** `npm exec hedy` and `npm x hedy` pass. They are left out because a name scan of npm arguments would also deny `npm uninstall -g hedy`.
- **Git failure.** The check fails open when `git status` errors, for example when the canonical root is missing.

The stronger fix sits outside the hook. Installing hedy from a HEAD snapshot (for example `git archive HEAD hedy` unpacked and installed globally) instead of `npm link` closes every route above, at the cost of a reinstall per commit.

## Related Defect Not Fixed Here

Check 3 (secret-file reads) misses a secret path that is not the last word. The segment loop sets `IFS=$'\n'`, so `for arg in $seg` in check 3 sees the whole segment as one word. The probe `grep foo ~/trade-imports-arch-workspace/.env -n` printed nothing, and `grep -n foo ~/trade-imports-arch-workspace/.env` was denied with the whole segment quoted as the path. The one-line fix is `local IFS=$' \t'` before check 3's loop. Part 2 above sets the same separator for its own loop only.

## Verification

Run these from any directory after wiring. Each payload pipes into the live hook.

Make the hedy tree dirty with an untracked probe file:

```
touch ~/trade-imports-arch-workspace/hedy/src/zz-guard-probe.js
```

Each of these must print a deny whose reason names the probe file and the fix:

```
printf '%s' '{"tool_input":{"command":"hedy hello"},"cwd":"/tmp"}' | bash ~/trade-imports-arch-workspace/.claude/hooks/guard-bash.sh
printf '%s' '{"tool_input":{"command":"JIRA_TOKEN=x hedy auth"},"cwd":"/tmp"}' | bash ~/trade-imports-arch-workspace/.claude/hooks/guard-bash.sh
printf '%s' '{"tool_input":{"command":"echo a; hedy hello"},"cwd":"/tmp"}' | bash ~/trade-imports-arch-workspace/.claude/hooks/guard-bash.sh
printf '%s' '{"tool_input":{"command":"false || hedy hello"},"cwd":"/tmp"}' | bash ~/trade-imports-arch-workspace/.claude/hooks/guard-bash.sh
printf '%s' '{"tool_input":{"command":"echo x | hedy hello"},"cwd":"/tmp"}' | bash ~/trade-imports-arch-workspace/.claude/hooks/guard-bash.sh
printf '%s' '{"tool_input":{"command":"echo $(hedy hello)"},"cwd":"/tmp"}' | bash ~/trade-imports-arch-workspace/.claude/hooks/guard-bash.sh
printf '%s' '{"tool_input":{"command":"timeout 30 hedy auth"},"cwd":"/tmp"}' | bash ~/trade-imports-arch-workspace/.claude/hooks/guard-bash.sh
printf '%s' '{"tool_input":{"command":"npx hedy auth"},"cwd":"/tmp"}' | bash ~/trade-imports-arch-workspace/.claude/hooks/guard-bash.sh
printf '%s' '{"tool_input":{"command":"node ~/trade-imports-arch-workspace/hedy/src/cli.js hello"},"cwd":"/tmp"}' | bash ~/trade-imports-arch-workspace/.claude/hooks/guard-bash.sh
printf '{"tool_input":{"command":"node src/cli.js hello"},"cwd":"%s/trade-imports-arch-workspace/hedy"}' "$HOME" | bash ~/trade-imports-arch-workspace/.claude/hooks/guard-bash.sh
```

Each of these must print nothing, even with the dirty tree:

```
printf '{"tool_input":{"command":"npm test"},"cwd":"%s/trade-imports-arch-workspace/hedy"}' "$HOME" | bash ~/trade-imports-arch-workspace/.claude/hooks/guard-bash.sh
printf '{"tool_input":{"command":"npx vitest run src/cli.test.js"},"cwd":"%s/trade-imports-arch-workspace/hedy"}' "$HOME" | bash ~/trade-imports-arch-workspace/.claude/hooks/guard-bash.sh
printf '%s' '{"tool_input":{"command":"git -C ~/trade-imports-arch-workspace status -- hedy"},"cwd":"/tmp"}' | bash ~/trade-imports-arch-workspace/.claude/hooks/guard-bash.sh
```

Remove the probe file to make the tree clean again:

```
rm ~/trade-imports-arch-workspace/hedy/src/zz-guard-probe.js
```

With the clean tree, the first block must print nothing for every hedy payload. Finally, wire-level proof: in a Claude Code session with a dirty hedy tree, a `hedy hello` Bash call must come back denied with the same reason.

## Steps to Apply

1. Paste part 1 of the snippet into `.claude/hooks/guard-bash.sh`, directly after the `READERS=` line.
2. Paste part 2 inside `check_segment`, after the check 3 block and before the check 2 comment.
3. Add check 7 to the header comment list.
4. Run the verification commands above, dirty then clean.
5. Decide on the parallel-worker side effect: separate worktrees per hedy worker, or accept the blocking.
6. Optionally apply the check 3 separator fix as its own change.
7. Delete this file once applied.
