#!/bin/bash
# PreToolUse guard for Edit and Write: no spy assertions in test files under
# cli/. A block that holds `// allow-spy-assertion: <why>` passes. The rule
# lives in .claude/rules/cli-tests.md.
#
# stdin: PreToolUse hook JSON. Deny via hookSpecificOutput JSON, exit 0.
# A clean call prints nothing.

set -uf

INPUT=$(cat)

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

abs=$(expand_home "$FP")
case "$abs" in
  /*) ;;
  *) abs="$(expand_home "$CWD")/$abs" ;;
esac

case "$abs" in
  */cli/*.test.js) ;;
  *) exit 0 ;;
esac

VERDICT=$(printf '%s' "$INPUT" | jq -r '
  (if .tool_name == "Write" then .tool_input.content
   elif .tool_name == "Edit" then .tool_input.new_string
   else null end) // ""
  | if test("\\btoHaveBeenCalled(With|Times)?\\b")
       and (test("//\\s*allow-spy-assertion:") | not)
    then "deny" else "allow" end')

[ "$VERDICT" = "deny" ] || exit 0

deny "Blocked: $(basename "$abs") holds a spy assertion (toHaveBeenCalled, toHaveBeenCalledWith or toHaveBeenCalledTimes). Assert behaviour instead: call the function and assert its return value or thrown error; spawn the CLI through cli/src/test-support/cli.js and assert the parsed envelope and exit code; or capture the request at the nock boundary and assert on its payload. Only when the call is itself the external side effect, put '// allow-spy-assertion: <why>' in the block and assert on the captured payload, not the spy record. Rule: .claude/rules/cli-tests.md."
