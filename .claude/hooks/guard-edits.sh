#!/bin/bash
# PreToolUse guard for Edit/Write/MultiEdit/NotebookEdit — protects the security
# config from being modified by the agent itself. Without this, the deny list and
# the guard hooks live under ~/trade-imports-arch-workspace (which the agent can Write/Edit), so a
# determined agent could neuter its own guardrails. This blocks edits to:
#   - .claude/settings.json / .claude/settings.local.json (the permission rules)
#   - .claude/hooks/**                                     (the guard scripts)
#
# Repo-scoped and self-referential by design (the user chose the no-sudo option):
# it cannot stop a human, and a sufficiently determined edit to THIS file would
# disarm it — but it removes the casual/accidental path and forces any change to
# the guardrails to be a deliberate, visible act (the user editing via `! ...`,
# or removing the hook in a reviewed commit).
#
# stdin: PreToolUse hook JSON. Deny via hookSpecificOutput JSON, exit 0.

set -uf

INPUT=$(cat)
FP=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // .tool_input.notebook_path // empty')
[ -z "$FP" ] && exit 0

deny() {
  jq -n --arg reason "$1" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$reason}}'
  exit 0
}

# Resolve to an absolute, symlink-collapsed path (parent may not exist for Write).
abs=$FP
case "$abs" in
  '~/'*) abs="$HOME/${abs#\~/}" ;;
esac
dir=$(dirname "$abs"); base=$(basename "$abs")
rdir=$(realpath "$dir" 2>/dev/null) && abs="$rdir/$base"

case "$abs" in
  */.claude/settings.json|*/.claude/settings.local.json)
    deny "Blocked: $base is the Claude Code permission config and is protected from agent edits. If a change is genuinely intended, the user must make it directly (e.g. open it themselves or run via !), not the agent." ;;
  */.claude/hooks/*)
    deny "Blocked: files under .claude/hooks/ are the security guard scripts and are protected from agent edits. The user must change them directly." ;;
esac

exit 0
