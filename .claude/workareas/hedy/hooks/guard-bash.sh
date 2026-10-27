#!/bin/bash
# PreToolUse guard for the Bash tool. Denies the bypasses that permission string
# matching cannot catch, and redirects a few foot-guns to their sanctioned form.
# Every denial names what to do instead, so an unattended agent can retry.
#
# Origin: on 2026-06-10 a denied `node scan.mjs` was re-run by copying the script
# into an allowlisted path and chmod +x-ing it. Checks 1 and 2 close that route.
#
# Per command segment (top-level segments split at | ; & and newlines, plus the
# bodies of $(...) and `...` substitutions, one level deep):
#   1. chmod in command position. Also, on the whole command, through find -exec
#      and xargs.
#   2. An executable run by path (./x, ~/x, /abs/x, dir/x), or handed to bash, sh,
#      zsh, node, python, env or xargs, must be committed at HEAD and unmodified
#      in its git repository. node_modules and system prefixes are exempt. A bare
#      name is left to the permission rules, except for check 3.
#   3. hedy is installed with npm link from the live checkout, so every hedy call
#      runs the worktree under hedy/. A hedy entry point (bare hedy, a path into
#      hedy/, or a launcher given one of those) needs a clean hedy tree: no
#      uncommitted change under hedy/src or to hedy's package files.
#   4. A secret path (.env, .npmrc, .netrc, .ssh, .aws, credentials, secrets) must
#      not be read by an ad-hoc reader (jq, grep, awk, ...). The Read deny in the
#      settings is the primary control; this is the Bash-layer backstop.
#  10. A git command, read with quote-aware words and through wrappers (env,
#      sudo, timeout, eval, bash -c, direnv exec, ...):
#      - git commit -n, alone or first in a group of flags (-nm, -an), and any
#        abbreviation of --no-verify, skip the pre-commit gates (check 5);
#      - a git config write, -c or --config-env on core.hooksPath, in any case,
#        detaches the same gates (check 5). The writes are set, unset, --unset,
#        --unset-all, --replace-all, --add, a bare key and value, and removing
#        or renaming the core section;
#      - the same writes on an alias, include or includeIf key, or on those
#        sections: an alias hides the subcommand from the guards, and an include
#        loads keys from another file;
#      - git config --edit, and a config key built from $ or a backtick, which
#        the guard cannot check.
#      Reads (git config --get, --list, get, list, a bare key) stay allowed.
# On the whole command:
#   5. git commit --no-verify, and any change to core.hooksPath in any case, skip
#      the pre-commit gates. Check 10 covers the forms a pattern cannot see.
#   6. git commit --amend when HEAD is already on a remote branch rewrites
#      published history.
#  11. A GIT_CONFIG* variable (GIT_CONFIG_PARAMETERS, GIT_CONFIG_COUNT,
#      GIT_CONFIG_KEY_<n>, GIT_CONFIG_VALUE_<n>, GIT_CONFIG_GLOBAL, ...) set in a
#      command that runs git overrides any key, core.hooksPath and aliases
#      included, where neither -c nor git config shows it.
# Redirects, with no security weight, each naming the sanctioned form:
#   7. A literal /Users/<user>/ path: use ~/.
#   8. An install-like npm command with --prefix on a workspace path: install from
#      inside the package folder on the real path.
#   9. && chaining outside quotes: one command per Bash call.
#
# Pushes belong to guard-git-push.sh and file edits to guard-edits.sh.
#
# stdin: the PreToolUse JSON. A deny prints hookSpecificOutput JSON. Exit 0 always.

set -uf

INPUT=$(cat)
CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty')
CWD=$(printf '%s' "$INPUT" | jq -r '.cwd // empty')
[ -z "$CMD" ] && exit 0
[ -z "$CWD" ] && CWD=$PWD

WORKSPACE="$HOME/trade-imports-arch-workspace"
HEDY_DIR=$(realpath "$WORKSPACE/hedy" 2>/dev/null || true)

deny() {
  jq -n --arg reason "$1" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$reason}}'
  exit 0
}

# --- helpers -----------------------------------------------------------------

# The path as typed, made absolute against CWD and resolved when it exists.
absolute_path() {
  local p=$1
  case "$p" in
    '~/'*)     p="$HOME/${p#\~/}" ;;
    '$HOME/'*) p="$HOME/${p#\$HOME/}" ;;
    /*)        ;;
    *)         p="$CWD/$p" ;;
  esac
  realpath "$p" 2>/dev/null || printf '%s' "$p"
}

unquoted() {
  local s=$1
  s=${s//\"/}
  s=${s//\'/}
  printf '%s' "$s"
}

is_secret_path() {
  case "$1" in
    *.env|*.env.*|*/.npmrc|*/.netrc|*/.aws/*|*/.ssh/*|*/credentials|*/credentials.*|*/secrets|*/secrets.*) return 0 ;;
  esac
  return 1
}

# Readers that print file contents and that the Read deny does not see at the
# Bash layer (cat, head, tail and sed are seen there).
is_reader() {
  case " jq grep egrep fgrep rg awk gawk file cut tr nl tac strings xxd od hexdump base64 less more cmp comm paste join column " in
    *" $1 "*) return 0 ;;
  esac
  return 1
}

# Programs that run the executable named by their first plain argument.
is_launcher() {
  case "$1" in
    bash|sh|zsh|node|python|python3|env|xargs|npx) return 0 ;;
  esac
  return 1
}

inside_hedy() {
  [ -n "$HEDY_DIR" ] || return 1
  case "$1" in
    "$HEDY_DIR"|"$HEDY_DIR"/*) return 0 ;;
  esac
  return 1
}

# Words a command can sit behind for check 10: skipped, with their options and
# numeric arguments, to reach the command they run.
is_wrapper() {
  case "$1" in
    sudo|command|exec|nohup|time|nice|stdbuf|setsid|timeout|env|builtin|xargs|'!'|if|then|elif|else|do|while|until) return 0 ;;
  esac
  return 1
}

lower() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]'
}

# The words of $1 as the shell splits them, one per line: quotes are removed
# with their content kept in the word, and a backslash keeps the character
# after it. Expansions are left as typed.
split_words() {
  printf '%s\n' "$1" | awk -v sq="'" '
    {
      s = $0; w = ""; inw = 0; q = ""; len = length(s)
      for (i = 1; i <= len; i++) {
        c = substr(s, i, 1)
        if (q != "") {
          if (c == q) { q = ""; continue }
          if (q == "\"" && c == "\\" && i < len && index("\"\\$`", substr(s, i + 1, 1)) > 0) { i++; c = substr(s, i, 1) }
          w = w c
          continue
        }
        if (c == sq || c == "\"") { q = c; inw = 1; continue }
        if (c == "\\" && i < len) { i++; w = w substr(s, i, 1); inw = 1; continue }
        if (c == " " || c == "\t") { if (inw) print w; w = ""; inw = 0; continue }
        w = w c; inw = 1
      }
      if (inw) print w
    }'
}

# The guarded class of config key $1 (a key, or key=value): hooks for
# core.hooksPath, alias for a key that renames a subcommand or loads another
# file, dynamic for a key built from $ or a backtick, empty for any other key.
config_key_class() {
  local key
  key=$(lower "${1%%=*}")
  case "$key" in
    *'$'*|*'`'*) echo dynamic ;;
    core.hookspath) echo hooks ;;
    alias.*|include.*|includeif.*) echo alias ;;
  esac
}

# The same for a section that git config removes or renames.
section_class() {
  local name
  name=$(lower "${1%%.*}")
  case "$name" in
    *'$'*|*'`'*) echo dynamic ;;
    core) echo hooks ;;
    alias|include|includeif) echo alias ;;
  esac
}

# --- checks ------------------------------------------------------------------

deny_chmod() {
  deny "chmod is blocked: adding an execute bit is how a fresh file becomes runnable, the write-then-execute route. If the execute bit is genuinely needed, the user runs it: ! chmod ..."
}

deny_no_verify() {
  deny "git commit --no-verify, its abbreviations and its short form -n skip the pre-commit gates. Fix what the hook names and commit again. If a hook is wrong, the user runs the commit: ! git commit ..."
}

deny_hooks_path() {
  deny "Changing core.hooksPath detaches the pre-commit gates. Leave the hooks path as make link set it, and read it with git config --get core.hooksPath. If a hook is wrong, the user runs the command: ! git ..."
}

deny_alias() {
  deny "Blocked: this writes a git alias, include or includeIf key. An alias hides the subcommand from the guards, and an include loads keys from another file, so the push and commit rules cannot see what runs. Type the git subcommand in full, and read config with git config --get <key>. If an alias is genuinely needed, the user adds it: ! git config ..."
}

deny_config_edit() {
  deny "Blocked: git config --edit hands the config file to an editor, which can change any key, core.hooksPath included. Read config with git config --get <key> or git config --list. If a change is needed, the user makes it: ! git config ..."
}

deny_dynamic_key() {
  deny "Blocked: this git config key is built from a variable or a substitution, so the guard cannot check it. Write the key literally."
}

# 10. $1 is a class from config_key_class or section_class.
deny_by_class() {
  case "$1" in
    hooks)   deny_hooks_path ;;
    alias)   deny_alias ;;
    dynamic) deny_dynamic_key ;;
  esac
  return 0
}

# 2. $1 is the executable as typed, with a slash in it.
require_committed_executable() {
  local abs top rel
  abs=$(absolute_path "$1")
  [ -f "$abs" ] || return 0
  case "$abs" in
    */node_modules/*|/usr/*|/bin/*|/sbin/*|/opt/*|/System/*|/Library/*|/Applications/*) return 0 ;;
  esac
  top=$(git -C "$(dirname "$abs")" rev-parse --show-toplevel 2>/dev/null) \
    || deny "Blocked: '$1' is an executable outside any git repository. Commit it in a repository first, or ask the user to run it."
  rel=${abs#"$top"/}
  git -C "$top" cat-file -e "HEAD:$rel" 2>/dev/null \
    || deny "Blocked: '$rel' is not committed in $top. Commit a new executable before running it, so the change is a visible, reviewable step."
  git -C "$top" diff --quiet HEAD -- "$rel" 2>/dev/null \
    || deny "Blocked: '$rel' differs from HEAD in $top. Commit the change, then run the command."
}

# 3. $1 names the hedy entry point for the reason.
require_clean_hedy_tree() {
  local dirty
  dirty=$(git -C "$WORKSPACE" status --porcelain -- hedy/src hedy/package.json hedy/package-lock.json 2>/dev/null \
    | head -n 5 | sed 's/^ *//' | tr '\n' ' ')
  [ -z "$dirty" ] && return 0
  deny "Blocked: '$1' runs the hedy checkout through npm link, and hedy/ has uncommitted changes: ${dirty% }. Commit or revert the hedy change, then run the command. Uncommitted hedy code runs through its tests: npm test from inside hedy/."
}

# 2 and 3 for an executable that a launcher is given: $1 names the launcher,
# $2 the executable as typed.
check_launched() {
  local launcher=$1 target=$2
  if [ "$target" = hedy ]; then
    require_clean_hedy_tree "$launcher hedy"
    return 0
  fi
  case "$target" in
    */*)
      inside_hedy "$(absolute_path "$target")" && require_clean_hedy_tree "$launcher $target"
      [ "$launcher" != npx ] && require_committed_executable "$target"
      ;;
  esac
  return 0
}

# 4. $1 is the reader, the rest are its arguments.
check_reader() {
  local reader=$1 arg
  shift
  for arg in "$@"; do
    arg=$(unquoted "$arg")
    case "$arg" in -*) continue ;; esac
    if is_secret_path "$arg"; then
      deny "Blocked: '$reader' would read the secret path $arg. Secrets are consumed from the environment, never read through Bash. The auth doctor verifies them without printing a value: bash ~/trade-imports-arch-workspace/.claude/tools/workspace/check-auth.sh"
    fi
  done
}

# Checks 1 to 4 on one segment: the command sits at word 1 once leading
# assignments and relay wrappers are stripped.
check_segment() {
  local IFS=' ' seg first cmdname arg
  seg=$(printf '%s' "$1" | tr '\t' ' ' | tr -s ' ' \
    | sed -E 's/^[ `(]*//; s/^([A-Za-z_][A-Za-z0-9_]*=[^ ]* +)*//')
  while :; do
    case "$seg" in
      direnv\ exec\ *)
        seg=${seg#* }
        seg=${seg#* }
        case "$seg" in *\ *) seg=${seg#* } ;; *) seg='' ;; esac ;;
      sudo\ *|command\ *|exec\ *|nohup\ *|time\ *|nice\ *|stdbuf\ *|setsid\ *) seg=${seg#* } ;;
      timeout\ *)
        seg=${seg#* }
        case "$seg" in [0-9]*\ *) seg=${seg#* } ;; esac ;;
      *) break ;;
    esac
  done
  set -- $seg
  [ $# -eq 0 ] && return 0
  first=$(unquoted "$1")
  [ -z "$first" ] && return 0
  cmdname=${first##*/}
  shift

  [ "$cmdname" = chmod ] && deny_chmod
  is_reader "$cmdname" && check_reader "$cmdname" "$@"
  [ "$cmdname" = hedy ] && require_clean_hedy_tree "$first"
  if is_launcher "$cmdname"; then
    for arg in "$@"; do
      arg=$(unquoted "$arg")
      case "$arg" in -*|*=*) continue ;; esac
      check_launched "$cmdname" "$arg"
      break
    done
  fi
  case "$first" in
    */*)
      inside_hedy "$(absolute_path "$first")" && require_clean_hedy_tree "$first"
      require_committed_executable "$first"
      ;;
  esac
  return 0
}

# 10, git commit. $@ are the words after commit. -n is the short form of
# --no-verify, alone or first in a group of flags (-nm, -an). A letter that
# takes a value (-m, -F, -C, -c, -t, -u, -S) ends the group, so -uno and -mnote
# are not -n. git accepts an unambiguous abbreviation of a long option, so
# --no-veri is --no-verify. An option's separate value is skipped, as git
# skips it.
check_commit_options() {
  local w skip=0
  for w in "$@"; do
    if [ "$skip" -eq 1 ]; then skip=0; continue; fi
    case "$w" in
      --) return 0 ;;
      --no-veri*) deny_no_verify ;;
      -m|-F|-C|-c|-t|--message|--file|--author|--date|--template|--reuse-message|--reedit-message|--fixup|--squash|--cleanup|--trailer|--pathspec-from-file) skip=1 ;;
      --*) ;;
      -*) printf '%s' "$w" | grep -qE '^-[apsveioqzh]*n' && deny_no_verify ;;
    esac
  done
  return 0
}

# 10, git config. $@ are the words after config. A write names a write option
# or subcommand, or gives a key and a value. A write to a guarded key, or the
# removal or renaming of a guarded section, is denied, as is --edit.
check_config_command() {
  local w skip=0 write=0 read=0 section=0
  local -a P
  P=()
  for w in "$@"; do
    if [ "$skip" -eq 1 ]; then skip=0; continue; fi
    case "$w" in
      -e|--edit) deny_config_edit ;;
      --unset|--unset-all|--replace-all|--add) write=1 ;;
      --remove-section|--rename-section) write=1; section=1 ;;
      --get|--get-all|--get-regexp|--get-urlmatch|--get-color|--get-colorbool|--list|-l) read=1 ;;
      -f|--file|--blob|--type|--default|--comment|--value) skip=1 ;;
      -*) ;;
      *) P+=("$w") ;;
    esac
  done
  [ "${#P[@]}" -gt 0 ] || return 0
  case "${P[0]}" in
    edit) deny_config_edit ;;
    get|list) return 0 ;;
    set|unset) write=1; P=("${P[@]:1}") ;;
    remove-section|rename-section) write=1; section=1; P=("${P[@]:1}") ;;
    *) [ "$read" -eq 0 ] && [ "${#P[@]}" -ge 2 ] && write=1 ;;
  esac
  [ "$write" -eq 1 ] || return 0
  [ "${#P[@]}" -gt 0 ] || return 0
  if [ "$section" -eq 1 ]; then
    for w in "${P[@]}"; do
      deny_by_class "$(section_class "$w")"
    done
  else
    deny_by_class "$(config_key_class "${P[0]}")"
  fi
  return 0
}

# 10 on one segment. $1 is the segment as typed. Parentheses and braces become
# spaces, so a subshell or a group is read like a plain command.
check_git_segment() {
  local w i=0 n
  local -a W
  W=()
  while IFS= read -r w; do
    [ -n "$w" ] && W+=("$w")
  done < <(split_words "$(printf '%s' "$1" | tr '(){}' '    ')")
  n=${#W[@]}

  # Leading assignments (a GIT_CONFIG* one is check 11) and wrappers. A shell
  # given -c, and eval, run their argument as a command line, so that text is
  # checked in turn.
  while [ "$i" -lt "$n" ]; do
    w=${W[$i]}
    case "$w" in
      [A-Za-z_]*=*) i=$((i+1)) ;;
      direnv) i=$((i+3)) ;;
      eval)
        check_git_segment "$(printf '%s ' "${W[@]:$((i+1))}")"
        return 0 ;;
      bash|sh|zsh|dash|ksh|*/bash|*/sh|*/zsh)
        i=$((i+1))
        while [ "$i" -lt "$n" ]; do
          case "${W[$i]}" in
            --*) i=$((i+1)) ;;
            -*c*)
              [ $((i+1)) -lt "$n" ] && check_git_segment "${W[$((i+1))]}"
              return 0 ;;
            -*) i=$((i+1)) ;;
            *) return 0 ;;
          esac
        done
        return 0 ;;
      *)
        is_wrapper "$w" || break
        i=$((i+1))
        while [ "$i" -lt "$n" ]; do
          case "${W[$i]}" in -*|[0-9]*|[A-Za-z_]*=*) i=$((i+1)) ;; *) break ;; esac
        done ;;
    esac
  done
  [ "$i" -lt "$n" ] || return 0
  case "${W[$i]}" in git|*/git) i=$((i+1)) ;; *) return 0 ;; esac

  # Git's global options. -c and --config-env set a key for this run.
  while [ "$i" -lt "$n" ]; do
    w=${W[$i]}
    case "$w" in
      -c|--config-env)
        [ $((i+1)) -lt "$n" ] && deny_by_class "$(config_key_class "${W[$((i+1))]}")"
        i=$((i+2)) ;;
      --config-env=*)
        deny_by_class "$(config_key_class "${w#--config-env=}")"
        i=$((i+1)) ;;
      -C|--git-dir|--work-tree|--namespace|--attr-source) i=$((i+2)) ;;
      -*) i=$((i+1)) ;;
      *) break ;;
    esac
  done
  [ "$i" -lt "$n" ] || return 0
  case "${W[$i]}" in
    commit) check_commit_options "${W[@]:$((i+1))}" ;;
    config) check_config_command "${W[@]:$((i+1))}" ;;
  esac
  return 0
}

# --- run checks 1 to 4 and 10 over every segment and substitution body -------

SUBSTITUTIONS=$(printf '%s' "$CMD" \
  | grep -oE '\$\([^()]*\)|`[^`]*`' \
  | sed -E 's/^\$\(//; s/\)$//; s/^`//; s/`$//')

IFS=$'\n'
for line in $CMD $SUBSTITUTIONS; do
  for seg in $(printf '%s' "$line" | tr '|;&' '\n'); do
    [ -n "$seg" ] || continue
    check_segment "$seg"
    check_git_segment "$seg"
  done
done
unset IFS

# --- 1. chmod through a launcher ---------------------------------------------

if printf '%s' "$CMD" | grep -Eq -- '-(exec|execdir|ok|okdir)[[:space:]]+[^[:space:]]*chmod|xargs([[:space:]]+-[^[:space:]]+)*[[:space:]]+[^[:space:]]*chmod'; then
  deny_chmod
fi

# --- 5, 6 and 11. commits that bypass review ---------------------------------

if printf '%s' "$CMD" | grep -Eq 'git[[:space:]]+commit[^|;&]*--no-verify'; then
  deny "git commit --no-verify skips the pre-commit gates. Fix what the hook names and commit again. If a hook is wrong, the user runs the commit: ! git commit ..."
fi

# 11. A GIT_CONFIG* variable on a command that runs git.
if printf '%s' "$CMD" | grep -Eq '(^|[^A-Za-z0-9_])GIT_CONFIG[A-Za-z0-9_]*=' \
  && printf '%s' "$CMD" | grep -Eq '(^|[^A-Za-z0-9_.-])git([^A-Za-z0-9_.-]|$)'; then
  deny "Blocked: a GIT_CONFIG* variable on a command that runs git overrides config for that run, core.hooksPath and aliases included, where the guards cannot see the change. Read config with git config --get <key>. The owner changes config directly: ! git config ..."
fi

# Setting, unsetting or overriding core.hooksPath detaches the same gates, and
# git config names are case-insensitive. Reading it (git config --get
# core.hooksPath) stays allowed. Check 10 is the word-level form of this rule.
if printf '%s' "$CMD" | grep -qiE 'core\.hookspath=|config[^|;&]*(--|[[:space:]])unset(-all)?[^|;&]*core\.hookspath|config[^|;&]*core\.hookspath[[:space:]]+[^-[:space:]]|config[^|;&]*(remove|rename)-section[[:space:]]+.?core([^a-z0-9_-]|$)'; then
  deny_hooks_path
fi

if printf '%s' "$CMD" | grep -Eq 'git[[:space:]]+commit[^|;&]*--amend'; then
  if git -C "$CWD" branch -r --contains HEAD 2>/dev/null | grep -q .; then
    deny "git commit --amend would rewrite HEAD, which is already on a remote branch. Make a new commit instead."
  fi
fi

# --- 7 to 9. redirects -------------------------------------------------------

if printf '%s' "$CMD" | grep -Eq '/Users/[A-Za-z0-9._-]+/'; then
  deny "Use ~/ in place of a literal /Users/<user>/ path. The permission matcher treats the two as different prefixes, so a literal path prompts where ~/ is already allowed."
fi

if printf '%s' "$CMD" | grep -Eq 'npm[[:space:]].*--prefix[[:space:]]+[^[:space:]]*trade-imports-arch-workspace[^[:space:]]*[[:space:]]+(install|i|ci|add|update|dedupe|prune|uninstall)([[:space:]]|$)'; then
  deny "An install-like npm command does not take --prefix on a workspace path: across the symlink the lockfile can be corrupted. Run it from inside the package folder on the real path, as hedy/CLAUDE.md shows: (cd <real checkout path>/hedy; npm ci)"
fi

# A quoted && is data (awk 'a && b', jq 'select(.a && .b)'), so quoted spans
# are removed first, in one pass so that whichever quote opens first consumes
# through to its own closer.
UNQUOTED_CMD=$(printf '%s' "$CMD" | sed -E "s/'[^']*'|\"[^\"]*\"//g")
if printf '%s' "$UNQUOTED_CMD" | grep -q '&&'; then
  deny "One command per Bash call: this chains commands with &&. Split them into separate calls; each tool result carries that command's exit code."
fi

exit 0
