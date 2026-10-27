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
# On the whole command:
#   5. git commit --no-verify, and any change to core.hooksPath, skip the
#      pre-commit gates.
#   6. git commit --amend when HEAD is already on a remote branch rewrites
#      published history.
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

# --- checks ------------------------------------------------------------------

deny_chmod() {
  deny "chmod is blocked: adding an execute bit is how a fresh file becomes runnable, the write-then-execute route. If the execute bit is genuinely needed, the user runs it: ! chmod ..."
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

# --- run checks 1 to 4 over every segment and substitution body --------------

SUBSTITUTIONS=$(printf '%s' "$CMD" \
  | grep -oE '\$\([^()]*\)|`[^`]*`' \
  | sed -E 's/^\$\(//; s/\)$//; s/^`//; s/`$//')

IFS=$'\n'
for line in $CMD $SUBSTITUTIONS; do
  for seg in $(printf '%s' "$line" | tr '|;&' '\n'); do
    [ -n "$seg" ] && check_segment "$seg"
  done
done
unset IFS

# --- 1. chmod through a launcher ---------------------------------------------

if printf '%s' "$CMD" | grep -Eq -- '-(exec|execdir|ok|okdir)[[:space:]]+[^[:space:]]*chmod|xargs([[:space:]]+-[^[:space:]]+)*[[:space:]]+[^[:space:]]*chmod'; then
  deny_chmod
fi

# --- 5 and 6. commits that bypass review -------------------------------------

if printf '%s' "$CMD" | grep -Eq 'git[[:space:]]+commit[^|;&]*--no-verify'; then
  deny "git commit --no-verify skips the pre-commit gates. Fix what the hook names and commit again. If a hook is wrong, the user runs the commit: ! git commit ..."
fi

# Setting, unsetting or overriding core.hooksPath detaches the same gates.
# Reading it (git config --get core.hooksPath) stays allowed.
if printf '%s' "$CMD" | grep -Eq 'core\.hooksPath=|config[^|;&]*--unset(-all)?[^|;&]*core\.hooksPath|config[^|;&]*core\.hooksPath[[:space:]]+[^-[:space:]]'; then
  deny "Changing core.hooksPath detaches the pre-commit gates. Leave the hooks path as make link set it. If a hook is wrong, the user runs the command: ! git ..."
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
