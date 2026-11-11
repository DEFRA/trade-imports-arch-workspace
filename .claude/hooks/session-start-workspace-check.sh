#!/bin/bash
# SessionStart hook: runs hedy workspace check for the session's workspace and
# adds each failed check, with its next step, to the session's context, so the
# agent tells the user before other work. Never blocks the session.
#
# A session started in a subfolder loads no workspace hooks, so this hook
# cannot see that case. It runs hedy from the session's folder as Claude Code
# typed it, so a folder reached through a symlink is reported.
#
# stdin: the SessionStart JSON. Prints hookSpecificOutput JSON only when a check
# fails or hedy cannot run. Exit 0 always.

set -u

INPUT=$(cat)
CWD=$(printf '%s' "$INPUT" | jq -r '.cwd // empty')
ROOT=${CLAUDE_PROJECT_DIR:-$CWD}
[ -n "$ROOT" ] || exit 0

add_context() {
  jq -n --arg context "$1" '{hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:$context}}'
  exit 0
}

command -v hedy >/dev/null 2>&1 \
  || add_context "The workspace setup check could not run because hedy is not on PATH. Tell the user to run make -C $ROOT install."

OUTPUT=$(cd "${CWD:-$ROOT}" 2>/dev/null && hedy --workspace "$ROOT" workspace check --json 2>/dev/null)
[ "$(printf '%s' "$OUTPUT" | jq -r '.ok // empty' 2>/dev/null)" = "true" ] && exit 0

FAILURES=$(printf '%s' "$OUTPUT" | jq -r '[.errors[]?.message] | join(" ")' 2>/dev/null)
[ -n "$FAILURES" ] || FAILURES="hedy workspace check printed no result."
add_context "The workspace setup check failed. Tell the user before other work, and give each next step: $FAILURES"
