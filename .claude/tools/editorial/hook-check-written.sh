#!/usr/bin/env bash
# hook-check-written.sh - PostToolUse hook: gate the prose the model just wrote.
#
# Wired from skill frontmatter (pr, editorial skills), matcher Write|Edit|MultiEdit.
# Reads the PostToolUse hook JSON on stdin, extracts the written text
# (content / new_string / edits[].new_string), and runs it through
# check-prose.sh. Introduction-only, matching hook-stop.sh: the harness can
# deliver the WHOLE updated file for an edit, so FAIL lines in the written
# text are excused when they already exist byte-identically in the file's
# git HEAD version - legacy violations never gate a session that did not
# write them. A violation the session did introduce exits 2 with the lines
# on stderr, which the harness injects as corrective feedback (PostToolUse
# cannot block a completed write).
#
# --record additionally appends the file path to the session state file
# consumed by hook-stop.sh. Recording happens in this hook process, so the
# model cannot skip it.

set -uo pipefail

GATE="$HOME/trade-imports-arch-workspace/.claude/tools/editorial/check-prose.sh"

INPUT=$(cat)
FP=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // empty')
[ -z "$FP" ] && exit 0

case "$FP" in
  *.md|*.markdown|*.txt) ;;
  *) exit 0 ;;
esac

if [ "${1:-}" = "--record" ]; then
  SESSION=$(printf '%s' "$INPUT" | jq -r '.session_id // "nosession"')
  STATE="${TMPDIR:-/tmp}/claude-editorial-${SESSION}.paths"
  grep -qxF "$FP" "$STATE" 2>/dev/null || printf '%s\n' "$FP" >> "$STATE"
fi

WRITTEN=$(printf '%s' "$INPUT" | jq -r \
  '[.tool_input.content // empty, .tool_input.new_string // empty,
    (.tool_input.edits // [] | .[].new_string // empty)] | join("\n")')
[ -z "$WRITTEN" ] && exit 0

CURRENT=$(printf '%s\n' "$WRITTEN" | bash "$GATE" --stdin --label "$FP" --print-fail-lines 2>/dev/null)
[ -n "$CURRENT" ] || exit 0

# FAIL lines already in the file's git HEAD version are pre-existing, not
# this session's - same baseline rule as hook-stop.sh. Untracked or new
# files have an empty baseline.
baseline_fail_lines() {  # $1 file on disk
  local dir rel
  dir=$(dirname "$1")
  rel=$(git -C "$dir" ls-files --full-name --error-unmatch -- "$(basename "$1")" 2>/dev/null) || return 0
  git -C "$dir" show "HEAD:$rel" 2>/dev/null \
    | bash "$GATE" --stdin --label baseline --print-fail-lines 2>/dev/null
  return 0
}

BASELINE=$(baseline_fail_lines "$FP")
if [ -n "$BASELINE" ]; then
  NEW=$(printf '%s\n' "$CURRENT" | grep -vxF -f <(printf '%s\n' "$BASELINE") || true)
else
  NEW=$CURRENT
fi
[ -n "$NEW" ] || exit 0

{
  printf 'hook-check-written: %s - FAIL line(s) introduced by this write (pre-existing violations are excused):\n' "$FP"
  while IFS= read -r l; do printf '  %s\n' "$l"; done <<< "$NEW"
  printf 'hook-check-written: fix these lines now (run check-prose.sh on the file for the governing rule per line) - the same gate runs at PR creation and, in editorial sessions, blocks the turn from ending. Rules: ~/trade-imports-arch-workspace/.claude/skills/editorial/SKILL.md (Style guide).\n'
} >&2
exit 2