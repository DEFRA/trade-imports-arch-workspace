#!/usr/bin/env bash
# hook-check-written.sh - PostToolUse hook: gate the prose the model just wrote.
#
# Wired from skill frontmatter (pr, editorial skills), matcher Write|Edit|MultiEdit.
# Reads the PostToolUse hook JSON on stdin, extracts only the newly written
# text (content / new_string / edits[].new_string), and runs it through
# check-prose.sh. A violation exits 2 with the report on stderr, which the
# harness injects as corrective feedback for the next turn (PostToolUse
# cannot block a completed write). Pre-existing text in the file is never
# scanned here, so legacy content cannot false-positive at this layer.
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

if ! printf '%s\n' "$WRITTEN" | bash "$GATE" --stdin --label "$FP"; then
  printf 'hook-check-written: the text just written to %s breaks the editorial style guide (FAIL lines above). Fix it now - the gate also runs at PR creation and, in editorial sessions, blocks the turn from ending.\n' "$FP" >&2
  exit 2
fi
exit 0
