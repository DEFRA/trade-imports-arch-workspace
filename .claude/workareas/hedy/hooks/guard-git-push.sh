#!/bin/bash
# PreToolUse guard for the Bash tool - denies force pushes, any push to main,
# and any push that does not name its destination branch.
#
# Adapted from tim's guard-git-push.sh to this workspace's deny idiom: print the
# hookSpecificOutput deny JSON and exit 0, with a reason that names the allowed
# form, so an unattended agent reads it and retries (see guard-bash.sh).
#
# The rule: an agent push names its destination branch, and that branch is not
# main. A push with no explicit destination (bare git push, git push origin,
# git push origin HEAD) is denied, so no decision depends on which branch is
# checked out or on the repository's push configuration. The hook reads only
# the command text and runs no git command.
#
# How a command is read:
#   1. The command is split into words and simple commands the way the shell
#      does: quotes and backslashes group and are removed, # starts a comment,
#      and ; & | ( ) ` and newlines end a command. A quoted word that holds
#      git and whitespace, as in sh -c "...", is scanned again as a command.
#   2. Every git word starts a candidate. Git's global options before the
#      subcommand are skipped: -C <path>, -c <k=v>, --git-dir[=]<p>,
#      --work-tree[=]<p>, --namespace[=]<n>, --super-prefix[=]<p>,
#      --attr-source[=]<t>, --config-env[=]<n=v>, and any other -x, --opt or
#      --opt=value.
#   3. A push is denied for:
#      - force: -f, --force, --force-with-lease, a short option cluster
#        holding f, a +refspec;
#      - every branch: --all, --mirror, --branches;
#      - no destination: no refspec after the remote, a refspec of HEAD or @,
#        a destination of HEAD, refs/HEAD or @, an empty destination (src:);
#      - main: a destination of main, heads/main or refs/heads/main, a glob,
#        or the matching refspec ":";
#      - hidden input: a variable in the subcommand or in a refspec; a -c
#        alias.<name> that pushes or a -c remote.<name>.push refmap; a
#        GIT_DIR, GIT_WORK_TREE, GIT_NAMESPACE, GIT_COMMON_DIR or GIT_CONFIG*
#        prefix, or --config-env.
#   4. git config is denied when it writes an alias that pushes, or a
#      remote.<name>.push refmap, since either can send a later push to main.
#
# Limits: a word scanner cannot see through every indirection (scripts on
# disk, aliases or refmaps already in a config file). Branch protection on
# the remote is the authoritative control; this hook is the agent-side
# refusal. Quoted text that reads as a push to main or a force push, such as
# a commit message, is also denied; pass such text in a file instead.
#
# Owner step: copy to .claude/hooks/guard-git-push.sh. The existing PreToolUse
# Bash wiring in .claude/settings.json already calls it.
#
# Compatible with bash 3.2 (the macOS /bin/bash).
# stdin: PreToolUse hook JSON. Deny via hookSpecificOutput JSON, exit 0.

set -uf

INPUT=$(cat)
CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty')
[ -z "$CMD" ] && exit 0

# Fast path: a command without the word git has nothing to inspect.
case "$CMD" in *git*) ;; *) exit 0 ;; esac

ALLOWED="Push the feature branch by name and open a pull request: git push -u origin <branch>, with the branch written out, then the pr skill."

deny() {
  jq -n --arg reason "$1" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$reason}}'
  exit 0
}

deny_force() {
  deny "Force pushes rewrite history that others may have pulled. Push without --force; if a feature branch genuinely needs rewriting after a rebase, the user runs it themselves: ! git push --force-with-lease ..."
}

deny_main() {
  deny "Pushes to main are not allowed from an agent. $ALLOWED"
}

deny_unnamed() {
  deny "This push does not name its destination branch, so the branch it updates depends on the checkout and the push configuration. $ALLOWED"
}

lower() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]'
}

# A destination that git resolves to the remote's main branch.
is_main() {
  case "$1" in main|heads/main|refs/heads/main) return 0 ;; esac
  return 1
}

# True when the text holds the word push.
has_push() {
  case " $(printf '%s' "$1" | tr ';&|(){}`!"'"'"'' '           ') " in
    *[[:space:]]push[[:space:]]*) return 0 ;;
  esac
  return 1
}

# check_cfg_pair <key=value>: deny a -c pair that can redirect a push.
check_cfg_pair() {
  local key
  key=$(lower "${1%%=*}")
  case "$key" in
    alias.*)
      if has_push "${1#*=}"; then
        deny "The -c ${1%%=*} alias pushes, which hides the destination branch. $ALLOWED"
      fi ;;
    remote.*.push)
      deny "A -c remote.<name>.push refmap can send a named push to main. Drop the -c option. $ALLOWED" ;;
  esac
}

# check_refspec <refspec>: deny a refspec that does not name a branch other
# than main.
check_refspec() {
  local r=$1 dst
  case "$r" in +*) deny_force ;; esac
  case "$r" in *'$'*) deny "A variable in the refspec hides which branch the push updates. $ALLOWED" ;; esac
  case "$r" in
    :) deny "The matching refspec : pushes every branch that exists on both sides, main included. $ALLOWED" ;;
    *:*) dst=${r#*:} ;;
    *) dst=$r ;;
  esac
  case "$dst" in
    ''|HEAD|refs/HEAD|@) deny_unnamed ;;
    *'*'*) deny "Wildcard refspecs can update main. $ALLOWED" ;;
  esac
  if is_main "$dst"; then deny_main; fi
}

# inspect_config <index>: T[index] onwards are the words after git config.
# Deny writing an alias that pushes or a remote push refmap.
inspect_config() {
  local k=$1 key="" tok
  while [ "$k" -lt "$N" ]; do
    tok=${T[$k]}
    if [ -z "$key" ]; then
      case "$(lower "$tok")" in
        alias.*|remote.*.push) key=$(lower "$tok") ;;
      esac
    else
      case "$key" in
        alias.*)
          if has_push "$tok"; then
            deny "Defining a git alias that pushes hides the destination branch from this guard. $ALLOWED"
          fi ;;
        remote.*.push)
          case "$tok" in
            -*) ;;
            *) deny "A remote.<name>.push refmap can send a named push to main. Leave the push configuration to the user. $ALLOWED" ;;
          esac ;;
      esac
    fi
    k=$((k+1))
  done
}

# inspect_git <index>: T[index] onwards are the words after a git word.
inspect_git() {
  local k=$1 tok sub a skip=0 endopts=0 cfgenv=0
  local args=() positional=()

  # Skip git's global options; check the -c pairs.
  while [ "$k" -lt "$N" ]; do
    tok=${T[$k]}
    case "$tok" in
      -c)
        k=$((k+1)); [ "$k" -lt "$N" ] || return 0
        check_cfg_pair "${T[$k]}" ;;
      --config-env)
        cfgenv=1
        k=$((k+1)) ;;
      --config-env=*) cfgenv=1 ;;
      -C|--git-dir|--work-tree|--namespace|--super-prefix|--attr-source) k=$((k+1)) ;;
      -*) ;;
      *) break ;;
    esac
    k=$((k+1))
  done
  [ "$k" -lt "$N" ] || return 0

  sub=${T[$k]}
  case "$sub" in
    *'$'*) deny "A variable in the git subcommand hides whether the command pushes. Name the subcommand. $ALLOWED" ;;
    config) inspect_config $((k+1)); return 0 ;;
    push) ;;
    *) return 0 ;;
  esac

  if [ "$ENVFLAG" -eq 1 ] || [ "$cfgenv" -eq 1 ]; then
    deny "GIT_DIR, GIT_WORK_TREE, GIT_NAMESPACE, GIT_COMMON_DIR, GIT_CONFIG* and --config-env overrides hide where a push goes. Drop the override. $ALLOWED"
  fi

  args=( "${T[@]:$((k+1))}" )
  for a in ${args[@]+"${args[@]}"}; do
    if [ "$skip" -eq 1 ]; then skip=0; continue; fi
    if [ "$endopts" -eq 0 ]; then
      case "$a" in
        --) endopts=1; continue ;;
        --force|--force-with-lease|--force-with-lease=*) deny_force ;;
        --all|--mirror|--branches) deny "--all, --mirror and --branches push every local branch, main included. $ALLOWED" ;;
        --push-option|--receive-pack|--exec|--repo) skip=1; continue ;;
        --*) continue ;;
        -o) skip=1; continue ;;
        -o*) continue ;;
        -*f*) deny_force ;;
        -*) continue ;;
        '>'|'>>'|'<'|[0-9]'>'|[0-9]'>>'|[0-9]'<') skip=1; continue ;;
        '>'*|'<'*|[0-9]'>'*|[0-9]'<'*) continue ;;
      esac
    fi
    positional+=("$a")
  done

  # positional[0] is the remote; the rest are refspecs.
  if [ "${#positional[@]}" -le 1 ]; then
    deny_unnamed
  fi
  for a in "${positional[@]:1}"; do
    check_refspec "$a"
  done
  return 0
}

# process_segment: inspect the words in T, one simple command.
process_segment() {
  local i tok ENVFLAG=0
  N=${#T[@]}
  [ "$N" -gt 0 ] || return 0
  i=0
  while [ "$i" -lt "$N" ]; do
    tok=${T[$i]}
    case "$tok" in
      GIT_DIR=*|GIT_WORK_TREE=*|GIT_NAMESPACE=*|GIT_COMMON_DIR=*|GIT_CONFIG*=*) ENVFLAG=1 ;;
      git|*/git) inspect_git $((i+1)) ;;
      *[[:space:]]*git*|*git*[[:space:]]*)
        # A quoted word that holds a command, as in sh -c "...".
        if [ "$depth" -lt 4 ]; then scan_command "$tok" $((depth+1)); fi ;;
    esac
    i=$((i+1))
  done
}

# scan_command <text> <depth>: split the text into words and simple commands
# the way the shell does (quotes, backslashes, comments, ; & | ( ) ` and
# newlines), and inspect each command.
scan_command() {
  local s=$1 depth=$2 len i=0 c q="" w="" inword=0 N=0
  local T=()
  len=${#s}
  while [ "$i" -lt "$len" ]; do
    c=${s:$i:1}
    if [ -n "$q" ]; then
      if [ "$c" = "$q" ]; then
        q=""
      elif [ "$q" = '"' ] && [ "$c" = '\' ]; then
        i=$((i+1)); w="$w${s:$i:1}"
      else
        w="$w$c"
      fi
    else
      case "$c" in
        "'"|'"') q=$c; inword=1 ;;
        '\')
          i=$((i+1))
          # A backslash before a newline continues the line.
          if [ "${s:$i:1}" != $'\n' ]; then w="$w${s:$i:1}"; inword=1; fi ;;
        '$')
          # $'...' and $"..." quote like '...' and "...".
          case "${s:$((i+1)):1}" in
            "'"|'"') ;;
            *) w="$w$c"; inword=1 ;;
          esac ;;
        ' '|$'\t')
          if [ "$inword" -eq 1 ]; then T+=("$w"); w=""; inword=0; fi ;;
        ';'|'&'|'|'|'('|')'|'`'|$'\n')
          if [ "$inword" -eq 1 ]; then T+=("$w"); w=""; inword=0; fi
          process_segment
          T=() ;;
        '#')
          if [ "$inword" -eq 1 ]; then
            w="$w$c"
          else
            # A comment runs to the end of the line.
            while [ "$i" -lt "$len" ] && [ "${s:$i:1}" != $'\n' ]; do i=$((i+1)); done
            continue
          fi ;;
        *) w="$w$c"; inword=1 ;;
      esac
    fi
    i=$((i+1))
  done
  if [ "$inword" -eq 1 ]; then T+=("$w"); fi
  process_segment
}

# Byte-wise string indexing keeps the word splitter linear.
LC_ALL=C
export LC_ALL

scan_command "$CMD" 0

exit 0
