#!/usr/bin/env bash
# hook-check-written.sh - PostToolUse hook: gate the prose the model just wrote.
#
# Usage (matcher Write|Edit|MultiEdit, the hook JSON on stdin):
#   bash hook-check-written.sh --scope <rule.md> [--record]
#   bash hook-check-written.sh --scope <rule.md> --outside-scope [--record]
#   bash hook-check-written.sh [--record]
#
# Wired once in settings.json with --scope naming the authoring-voice rule,
# so every write in the rule's scope is checked in every session. The
# rule's frontmatter lists decide the scope (rule-scope.sh): the paths
# globs, minus gate-exclude, minus files git ignores in their own
# repository, inside the workspace only. The editorial and pr skills wire
# the complement, --scope with --outside-scope, which checks only the
# markdown and text files the global entry skips (drafts under /tmp or
# analysis/, for example), so each write is checked once. Without --scope
# the hook checks every *.md, *.markdown and *.txt file, as before.
#
# The hook extracts the written text (content / new_string /
# edits[].new_string) and runs it through check-prose.sh. Introduction-only,
# matching hook-stop.sh: the harness can deliver the WHOLE updated file for
# an edit, so FAIL lines in the written text are excused when they already
# exist byte-identically in the file's git HEAD version. A violation the
# write introduced exits 2 with the lines on stderr, which the harness
# injects as corrective feedback (PostToolUse cannot block a completed
# write). Golden-test fixtures under .claude/tools/*/tests/ are never
# checked.
#
# --record appends the file path to the session state file consumed by
# hook-stop.sh, after the scope decision, so the Stop hook inherits the
# scope. Recording happens in this hook process, so the model cannot skip
# it.
#
# Exit: 0 nothing introduced or out of scope; 1 a usage error, a missing
# scope rule or one with no paths; 2 FAIL lines introduced.

set -uo pipefail

GATE="$HOME/trade-imports-arch-workspace/.claude/tools/editorial/check-prose.sh"
SCOPE_LIB="$HOME/trade-imports-arch-workspace/.claude/tools/editorial/rule-scope.sh"

die() { printf 'hook-check-written: %s\n' "$1" >&2; exit 1; }

SCOPE="" OUTSIDE=0 RECORD=0
while [ $# -gt 0 ]; do
  case "$1" in
    --scope)         [ $# -ge 2 ] || die "--scope needs a rule file"; SCOPE=$2; shift 2 ;;
    --outside-scope) OUTSIDE=1; shift ;;
    --record)        RECORD=1; shift ;;
    *)               die "unknown argument '$1'" ;;
  esac
done
[ "$OUTSIDE" -eq 0 ] || [ -n "$SCOPE" ] || die "--outside-scope needs --scope"
if [ -n "$SCOPE" ]; then
  [ -f "$SCOPE" ] || die "scope rule missing: $SCOPE"
  [ -f "$SCOPE_LIB" ] || die "scope library missing: $SCOPE_LIB"
  # shellcheck source=rule-scope.sh
  . "$SCOPE_LIB"
  [ -n "$(scope_globs "$SCOPE")" ] || die "scope rule has no paths: $SCOPE"
fi

INPUT=$(cat)
FP=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // empty')
[ -z "$FP" ] && exit 0

# Golden-test fixtures legitimately hold banned bytes - same exemption as
# the pre-commit staged-markdown gate. Never gated, never recorded.
case "$FP" in
  */.claude/tools/*/tests/*) exit 0 ;;
esac

prose_extension() {
  case "$FP" in
    *.md|*.markdown|*.txt) return 0 ;;
  esac
  return 1
}

# The scope decision. Under --scope alone the rule's globs decide, so a
# .txt file is out of scope unless a glob names it.
if [ -z "$SCOPE" ]; then
  prose_extension || exit 0
elif [ "$OUTSIDE" -eq 1 ]; then
  prose_extension || exit 0
  rule_gates "$SCOPE" "$FP" && exit 0
else
  rule_gates "$SCOPE" "$FP" || exit 0
fi

if [ "$RECORD" -eq 1 ]; then
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
# this write's - same baseline rule as hook-stop.sh. Untracked or new
# files have an empty baseline.
baseline_fail_lines() {  # $1 file on disk
  local dir rel
  dir=$(dirname "$1")
  rel=$(git -C "$dir" ls-files --full-name --error-unmatch -- "$(basename "$1")" 2>/dev/null) || return 0
  # Labelled with the file's own path, so the gate applies the same
  # editorial profile to the baseline as to the written text.
  git -C "$dir" show "HEAD:$rel" 2>/dev/null \
    | bash "$GATE" --stdin --label "$1" --print-fail-lines 2>/dev/null
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
  printf 'hook-check-written: fix these lines now (run check-prose.sh on the file for the governing rule per line) - the same gate runs at commit and PR creation and, in editorial sessions, blocks the turn from ending. Rules: ~/trade-imports-arch-workspace/.claude/best-practices/writing/language.md.\n'
} >&2
exit 2
