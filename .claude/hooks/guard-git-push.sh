#!/bin/bash
# PreToolUse guard for the Bash tool - denies force pushes, pushes to main,
# and pushes that do not name their destination branch.
#
# Minimal variant: reads the command text only. Quotes are stripped and the
# command is split at ; & | and newlines. A simple command is inspected when,
# after any leading VAR=value words, it starts with git and, after git's
# global options, its subcommand is push. Everything else is allowed.
#
# Deny idiom as in guard-bash.sh: print the hookSpecificOutput deny JSON and
# exit 0, with a reason that names the allowed form.
#
# Owner step: copy to .claude/hooks/guard-git-push.sh. The existing PreToolUse
# Bash wiring in .claude/settings.json already calls it.
#
# stdin: PreToolUse hook JSON. Deny via hookSpecificOutput JSON, exit 0.

set -uf

INPUT=$(cat)
CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty')
case "$CMD" in *push*) ;; *) exit 0 ;; esac

ALLOWED="Push the feature branch by name and open a pull request: git push -u origin <branch>, with the branch written out, then the pr skill."

deny() {
  jq -n --arg reason "$1" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$reason}}'
  exit 0
}

while read -ra W; do
  n=${#W[@]}
  i=0
  # Leading VAR=value words, then git.
  while [ "$i" -lt "$n" ] && [[ ${W[$i]} == *=* ]]; do i=$((i+1)); done
  [ "$i" -lt "$n" ] || continue
  case "${W[$i]}" in git|*/git) i=$((i+1)) ;; *) continue ;; esac
  # Git's global options, then push.
  while [ "$i" -lt "$n" ]; do
    case "${W[$i]}" in
      -C|-c|--git-dir|--work-tree|--namespace) i=$((i+2)) ;;
      -*) i=$((i+1)) ;;
      *) break ;;
    esac
  done
  [ "$i" -lt "$n" ] && [ "${W[$i]}" = push ] || continue

  words=0
  skip=0
  for a in "${W[@]:$((i+1))}"; do
    if [ "$skip" -eq 1 ]; then skip=0; continue; fi
    case "$a" in
      --force|--force-with-lease|--force-with-lease=*|+*)
        deny "Force pushes rewrite history that others may have pulled. Push without --force; if a feature branch genuinely needs rewriting after a rebase, the user runs it themselves: ! git push --force-with-lease ..." ;;
      --all|--mirror|--branches)
        deny "--all, --mirror and --branches push every local branch, main included. $ALLOWED" ;;
      -o|--push-option|--repo|--receive-pack|--exec|'>'|'>>'|'<'|[0-9]'>'|[0-9]'>>') skip=1; continue ;;
      --*) continue ;;
      -*f*)
        deny "Force pushes rewrite history that others may have pulled. Push without --force; if a feature branch genuinely needs rewriting after a rebase, the user runs it themselves: ! git push --force-with-lease ..." ;;
      -*|*'>'*|*'<'*) continue ;;
    esac
    # The first word is the remote; each later word is a refspec.
    words=$((words+1))
    [ "$words" -eq 1 ] && continue
    case "${a#*:}" in
      ''|HEAD|@) deny "This push does not name its destination branch. $ALLOWED" ;;
      main|heads/main|refs/heads/main) deny "Pushes to main are not allowed from an agent. $ALLOWED" ;;
    esac
  done
  [ "$words" -ge 2 ] || deny "This push does not name its destination branch. $ALLOWED"
done <<EOF
$(printf '%s\n' "$CMD" | tr -d "'\"" | tr ';&|' '\n\n\n')
EOF

exit 0
