#!/usr/bin/env bash
# PreToolUse hook for Read, Edit, Write and MultiEdit: rewrite a file_path
# reached through the canonical symlink ~/trade-imports-arch-workspace to the
# real checkout path, so Claude Code's rule matching and nested CLAUDE.md
# traversal see a path inside the project. Everything else in tool_input is
# passed through unchanged. Prints nothing when the path needs no change.
#
# Draft for the owner to wire from settings.local.json while testing:
#   "PreToolUse": [ { "matcher": "Read|Edit|Write|MultiEdit",
#     "hooks": [ { "type": "command",
#       "command": "bash \"$CLAUDE_PROJECT_DIR/analysis/authoring-voice/realpath-file-tools.sh\"",
#       "timeout": 5 } ] } ]
# If the test proves the point, the script moves to .claude/hooks/ and the
# entry to settings.json, both owner steps.
set -u

INPUT=$(cat)
FP=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // empty')
[ -n "$FP" ] || exit 0

LINK="$HOME/trade-imports-arch-workspace"
case "$FP" in
  "$LINK"/*) ;;
  *) exit 0 ;;
esac

REAL_ROOT=$(cd "$LINK" 2>/dev/null && pwd -P) || exit 0
[ "$REAL_ROOT" != "$LINK" ] || exit 0

NEW="$REAL_ROOT/${FP#"$LINK"/}"
printf '%s' "$INPUT" | jq -c --arg fp "$NEW" '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    updatedInput: (.tool_input + { file_path: $fp })
  }
}'
