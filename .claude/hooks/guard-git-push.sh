#!/bin/bash
# PreToolUse guard for the Bash tool - denies force pushes, pushes to main,
# pushes that do not name their destination branch, pushes that skip the
# pre-push gate, and the config overrides that can hide a push behind an alias.
#
# Minimal variant: reads the command text only. Quotes, backslashes, parentheses
# and braces are stripped, the bodies of $(...) and `...` substitutions are added
# as lines of their own, and the text is split at ; & | and newlines. A simple
# command is inspected when, after any leading VAR=value words and wrappers
# (env, sudo, timeout, eval, bash -c, direnv exec, if, ...), it starts with git.
# Then:
#   - a leading GIT_CONFIG* assignment, --config-env, -c on an alias, include or
#     includeIf key, or a git config write to one of those keys is denied: an
#     alias runs a push under another subcommand name;
#   - a subcommand built from $ or a backtick is denied: it cannot be checked;
#   - after git's global options, a push subcommand is checked for force,
#     --all, --mirror, --branches, --no-verify, a missing destination and a
#     destination of main.
# Everything else is allowed. There is no substring prefilter: quoting
# (pu"sh") and aliases both keep the word push out of the command text.
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
[ -z "$CMD" ] && exit 0

ALLOWED="Push the feature branch by name and open a pull request: git push -u origin <branch>, with the branch written out, then the pr skill."
OVERRIDE="Blocked: this git command overrides config for one run (--config-env or a GIT_CONFIG* variable), which can define an alias that hides a push from this guard. Run git without the override. $ALLOWED"
ALIAS="Blocked: this defines a git alias or include. An alias runs a push under another name, so the push escapes this guard. Type the git subcommand in full. $ALLOWED"

deny() {
  jq -n --arg reason "$1" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$reason}}'
  exit 0
}

SUBSTITUTIONS=$(printf '%s' "$CMD" \
  | grep -oE '\$\([^()]*\)|`[^`]*`' \
  | sed -E 's/^\$\(//; s/\)$//; s/^`//; s/`$//')

# One simple command per line, from the command and every substitution body.
LINES=$(printf '%s\n%s\n' "$CMD" "$SUBSTITUTIONS" | tr -d "'" | tr -d '"(){}\\' | tr ';&|' '\n\n\n')

while read -ra W; do
  n=${#W[@]}
  i=0
  override=0
  # Leading VAR=value words and wrappers, then git. A wrapper's options,
  # assignments and numeric arguments (nice -n 5, timeout 30) are skipped too,
  # and so is a shell's -c, whose command line follows once quotes are gone.
  while [ "$i" -lt "$n" ]; do
    case "${W[$i]}" in
      GIT_CONFIG*=*) override=1; i=$((i+1)) ;;
      *=*) i=$((i+1)) ;;
      direnv) i=$((i+3)) ;;
      env|command|exec|eval|builtin|sudo|nohup|time|nice|timeout|stdbuf|setsid|xargs|bash|sh|zsh|dash|ksh|*/bash|*/sh|*/zsh|if|then|elif|else|do|while|until|'!')
        i=$((i+1))
        while [ "$i" -lt "$n" ]; do
          case "${W[$i]}" in
            GIT_CONFIG*=*) override=1; i=$((i+1)) ;;
            -*|*=*|[0-9]*) i=$((i+1)) ;;
            *) break ;;
          esac
        done ;;
      *) break ;;
    esac
  done
  [ "$i" -lt "$n" ] || continue
  case "${W[$i]}" in git|*/git) i=$((i+1)) ;; *) continue ;; esac
  [ "$override" -eq 0 ] || deny "$OVERRIDE"
  # Git's global options, then the subcommand. -c and --config-env can define
  # an alias for this run.
  while [ "$i" -lt "$n" ]; do
    case "${W[$i]}" in
      --config-env|--config-env=*) deny "$OVERRIDE" ;;
      -c)
        key=$(printf '%s' "${W[$((i+1))]:-}" | tr '[:upper:]' '[:lower:]')
        case "${key%%=*}" in alias.*|include.*|includeif.*) deny "$ALIAS" ;; esac
        i=$((i+2)) ;;
      -C|--git-dir|--work-tree|--namespace|--attr-source) i=$((i+2)) ;;
      -*) i=$((i+1)) ;;
      *) break ;;
    esac
  done
  [ "$i" -lt "$n" ] || continue
  case "${W[$i]}" in
    *'$'*|*'`'*)
      deny "This git subcommand is built from a variable or a substitution, so the guard cannot tell whether it is a push. Type the subcommand literally. $ALLOWED" ;;
    config)
      # A write to an alias or include key, or to those sections. Reads
      # (--get, --list, get, list, a bare key) and removals stay allowed.
      pos=0
      reading=0
      aliasing=0
      skip=0
      for a in "${W[@]:$((i+1))}"; do
        if [ "$skip" -eq 1 ]; then skip=0; continue; fi
        la=$(printf '%s' "$a" | tr '[:upper:]' '[:lower:]')
        case "$la" in
          --get*|--list|-l) reading=1 ;;
          -f|--file|--blob|--type|--default|--comment|--value) skip=1 ;;
          -*) ;;
          *)
            pos=$((pos+1))
            if [ "$pos" -eq 1 ]; then
              case "$la" in get|list) reading=1 ;; esac
            fi
            case "$la" in alias|alias.*|include|include.*|includeif*) aliasing=1 ;; esac ;;
        esac
      done
      if [ "$aliasing" -eq 1 ] && [ "$reading" -eq 0 ] && [ "$pos" -ge 2 ]; then
        deny "$ALIAS"
      fi
      continue ;;
    push) ;;
    *) continue ;;
  esac

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
      --no-veri*)
        deny "git push --no-verify skips the pre-push gate. Fix what the gate names and push again. If the gate is wrong, the user runs the push: ! git push ..." ;;
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
$LINES
EOF

exit 0
