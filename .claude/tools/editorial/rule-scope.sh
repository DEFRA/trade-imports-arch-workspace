#!/usr/bin/env bash
# rule-scope.sh - read a rule's path globs and decide whether the write-time
# gate covers a file. One library for the scope: the hook sources it, the
# skills lint calls its CLI, so the gate and Claude Code read one list.
#
# Usage:
#   bash rule-scope.sh --rule <rule.md> --list paths|gate-paths|gate-exclude|all
#   bash rule-scope.sh --rule <rule.md> --path <file>
#   bash rule-scope.sh --ere <glob>
#   bash rule-scope.sh --help
#   . rule-scope.sh   # from another script: the functions below, no CLI
#
# The rule's frontmatter carries lists of the shape `  - "glob"` under the
# keys paths (read by Claude Code to load the rule), gate-paths (read only
# here, for a rule without paths that loads in every session) and
# gate-exclude (read only here). Globs are relative to the workspace root:
# ** as a whole segment matches any depth, * and ? stay inside one segment,
# and a glob without / names one root-relative path. A file is gated when it
# lies inside the workspace (symlinks resolved), matches paths (or
# gate-paths when paths is absent), matches no gate-exclude glob, and is not
# ignored by git in its own repository.
#
# --list all prints one line per glob: the key, a tab, the glob.
# --path prints "rule-scope: gate <relative path>" or "rule-scope: skip
# <file>: <reason>". --ere prints the extended regular expression a glob
# becomes.
#
# Exit: 0 listed, converted or gated; 1 not gated; 2 a usage error, a
# missing rule or a rule with no paths.

ROOT_LINK="$HOME/trade-imports-arch-workspace"

# The globs listed under one frontmatter key, one per line.
rule_globs() {  # $1 rule file, $2 key
  awk -v key="$2" '
    NR == 1 { if ($0 != "---") exit; next }
    /^---[[:space:]]*$/ { exit }
    /^[^ ]/ { k = $0; sub(/:.*/, "", k); inkey = (k == key && $0 ~ /^[A-Za-z-]+:[[:space:]]*$/); next }
    inkey && /^  - "[^"]*"[[:space:]]*$/ { g = $0; sub(/^  - "/, "", g); sub(/"[[:space:]]*$/, "", g); print g }
  ' "$1"
}

# The globs that decide the scope: paths, or gate-paths for a rule that has
# no paths and so loads in every session.
scope_globs() {  # $1 rule file
  local g
  g=$(rule_globs "$1" paths)
  [ -n "$g" ] || g=$(rule_globs "$1" gate-paths)
  printf '%s' "$g"
}

# A glob as an anchored extended regular expression.
glob_to_ere() {  # $1 glob
  printf '%s\n' "$1" | awk '{
    s = $0; out = ""; i = 1; n = length(s)
    while (i <= n) {
      c = substr(s, i, 1)
      if (c == "*" && substr(s, i, 2) == "**") {
        if (substr(s, i + 2, 1) == "/") { out = out "(.*/)?"; i += 3 } else { out = out ".*"; i += 2 }
        continue
      }
      if (c == "*") out = out "[^/]*"
      else if (c == "?") out = out "[^/]"
      else if (index(".+()|^$[]{}\\", c)) out = out "\\" c
      else out = out c
      i++
    }
    print "^" out "$"
  }'
}

globs_match() {  # $1 relative path, $2 globs, one per line
  local g
  while IFS= read -r g; do
    [ -n "$g" ] || continue
    printf '%s\n' "$1" | grep -qE "$(glob_to_ere "$g")" && return 0
  done <<< "$2"
  return 1
}

# The file's path relative to the workspace root, with both sides resolved
# through symlinks; returns 1 for a file outside the workspace. Folders
# that do not exist yet are carried over unresolved from the nearest
# folder that does.
workspace_rel() {  # $1 file path
  local p=$1 dir base root rel
  case "$p" in /*) ;; *) p="$PWD/$p" ;; esac
  dir=$(dirname "$p")
  base=$(basename "$p")
  while [ ! -d "$dir" ]; do
    base="$(basename "$dir")/$base"
    dir=$(dirname "$dir")
  done
  dir=$(cd "$dir" 2>/dev/null && pwd -P) || return 1
  root=$(cd "$ROOT_LINK" 2>/dev/null && pwd -P) || return 1
  case "$dir/" in
    "$root/"*) ;;
    *) return 1 ;;
  esac
  rel=${dir#"$root"}
  rel=${rel#/}
  printf '%s\n' "${rel:+$rel/}$base"
}

# 0 when the gate covers the file; 1 otherwise, with REASON set.
rule_gates() {  # $1 rule file, $2 file path
  local rel dir tail
  REASON=""
  rel=$(workspace_rel "$2") || { REASON="outside the workspace"; return 1; }
  globs_match "$rel" "$(scope_globs "$1")" || { REASON="not in paths"; return 1; }
  if globs_match "$rel" "$(rule_globs "$1" gate-exclude)"; then REASON="in gate-exclude"; return 1; fi
  # git answers from the file's own repository, asked from the nearest
  # folder that exists.
  dir=$(dirname "$2")
  tail=$(basename "$2")
  while [ ! -d "$dir" ]; do
    tail="$(basename "$dir")/$tail"
    dir=$(dirname "$dir")
  done
  if git -C "$dir" check-ignore -q -- "$tail" 2>/dev/null; then
    REASON="ignored by git"; return 1
  fi
  return 0
}

rule_scope_main() {
  set -uo pipefail
  local rule="" list="" path="" ere="" key rel
  usage() { awk 'NR == 1 { next } /^#/ { sub(/^# ?/, ""); print; next } { exit }' "$0"; }
  die() { printf 'rule-scope: %s\n' "$1" >&2; exit 2; }
  [ $# -gt 0 ] || die "no arguments (see --help)"
  while [ $# -gt 0 ]; do
    case "$1" in
      --rule|--list|--path|--ere)
        [ $# -ge 2 ] || die "$1 needs a value (see --help)"
        case "$1" in
          --rule) rule=$2 ;; --list) list=$2 ;; --path) path=$2 ;; --ere) ere=$2 ;;
        esac
        shift 2 ;;
      --help|-h) usage; exit 0 ;;
      *) die "unknown argument '$1' (see --help)" ;;
    esac
  done
  if [ -n "$ere" ]; then glob_to_ere "$ere"; exit 0; fi
  [ -n "$rule" ] || die "--rule is required with --list or --path (see --help)"
  [ -f "$rule" ] || die "scope rule missing: $rule"
  [ -n "$(scope_globs "$rule")" ] || die "scope rule has no paths: $rule"
  if [ -n "$list" ]; then
    case "$list" in
      paths|gate-paths|gate-exclude) rule_globs "$rule" "$list" ;;
      all)
        for key in paths gate-paths gate-exclude; do
          rule_globs "$rule" "$key" | awk -v k="$key" '{ print k "\t" $0 }'
        done ;;
      *) die "--list takes paths, gate-paths, gate-exclude or all, not '$list'" ;;
    esac
    exit 0
  fi
  [ -n "$path" ] || die "--list or --path is required with --rule (see --help)"
  if rule_gates "$rule" "$path"; then
    rel=$(workspace_rel "$path")
    printf 'rule-scope: gate %s\n' "$rel"
    exit 0
  fi
  printf 'rule-scope: skip %s: %s\n' "$path" "$REASON"
  exit 1
}

if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  rule_scope_main "$@"
fi
