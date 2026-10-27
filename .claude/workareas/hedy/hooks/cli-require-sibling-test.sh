#!/bin/bash
# PreToolUse guard for Write: a new source file under cli/src/ needs its
# sibling *.test.js to exist first. Rewrites of existing files, test files,
# test-support/ and __fixtures__/ pass. The rule lives in
# .claude/rules/cli-tests.md.
#
# stdin: PreToolUse hook JSON. Deny via hookSpecificOutput JSON, exit 0.
# A clean call prints nothing.

set -uf

INPUT=$(cat)

TOOL=$(printf '%s' "$INPUT" | jq -r '.tool_name // empty')
[ "$TOOL" = "Write" ] || exit 0

FP=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // empty')
[ -z "$FP" ] && exit 0

CWD=$(printf '%s' "$INPUT" | jq -r '.cwd // empty')
[ -z "$CWD" ] && CWD=$PWD

deny() {
  jq -n --arg reason "$1" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$reason}}'
  exit 0
}

expand_home() {
  case "$1" in
    '~') printf '%s' "$HOME" ;;
    '~/'*) printf '%s' "$HOME/${1#\~/}" ;;
    *) printf '%s' "$1" ;;
  esac
}

# Absolute, symlink-resolved path; the parent may not exist yet for a Write.
abs=$(expand_home "$FP")
case "$abs" in
  /*) ;;
  *) abs="$(expand_home "$CWD")/$abs" ;;
esac
dir=$(dirname "$abs"); base=$(basename "$abs")
rdir=$(realpath "$dir" 2>/dev/null) && abs="$rdir/$base"

case "$abs" in
  */cli/src/*.js) ;;
  *) exit 0 ;;
esac

case "$abs" in
  *.test.js|*/test-support/*|*/__fixtures__/*) exit 0 ;;
esac

[ -e "$abs" ] && exit 0

sibling="${abs%.js}.test.js"
[ -e "$sibling" ] && exit 0

deny "Blocked: $base is a new source file under cli/src/ and has no sibling test. Write $sibling first, with the behavioural test the new file must pass, then write $base. Files exempt from this rule: *.test.js files, anything under test-support/ or __fixtures__/, and rewrites of files that already exist. Rule: .claude/rules/cli-tests.md."
