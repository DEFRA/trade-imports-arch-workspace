#!/bin/bash
# PreToolUse guard for the Bash tool - denies force pushes and any push to main.
#
# Adapted from tim's guard-git-push.sh to this workspace's deny idiom: print the
# hookSpecificOutput deny JSON and exit 0, with a reason that names the allowed
# form, so an unattended agent reads it and retries (see guard-bash.sh).
#
# Owner step: copy to .claude/hooks/guard-git-push.sh and wire it in
# .claude/settings.json under the existing PreToolUse Bash matcher.
#
# stdin: PreToolUse hook JSON. Deny via hookSpecificOutput JSON, exit 0.

set -uf

INPUT=$(cat)
CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty')
[ -z "$CMD" ] && exit 0

deny() {
  jq -n --arg reason "$1" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$reason}}'
  exit 0
}

# Only git push commands are inspected.
printf '%s' "$CMD" | grep -Eq '(^|[[:space:];&|])git([[:space:]]+-C[[:space:]]+[^[:space:]]+)?[[:space:]]+push([[:space:]]|$)' || exit 0

# Force pushes: -f, --force, --force-with-lease and the +refspec form.
if printf '%s' "$CMD" | grep -Eq '[[:space:]](-f|--force|--force-with-lease(=[^[:space:]]*)?)([[:space:]]|$)|[[:space:]]\+[^[:space:]]'; then
  deny "Force pushes rewrite history that others may have pulled. Push without --force; if a feature branch genuinely needs rewriting after a rebase, the user runs it themselves: ! git push --force-with-lease ..."
fi

# Pushes that target main: a bare main refspec, HEAD:main or <ref>:main.
if printf '%s' "$CMD" | grep -Eq '[[:space:]](main|[^[:space:]]+:main)([[:space:]]|$)'; then
  deny "Pushes to main are not allowed from an agent. Push the feature branch and open a pull request: git push -u origin <branch>, then the pr skill."
fi

exit 0
