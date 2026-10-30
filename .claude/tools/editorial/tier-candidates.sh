#!/usr/bin/env bash
# tier-candidates.sh - count each candidate word-table row over the tracked
# markdown pages of one or more repositories and propose the row's gate tier.
#
# Usage:
#   bash tier-candidates.sh <candidates.md> [--threshold N] [--skip <substring>]... <root>...
#   bash tier-candidates.sh --help
#
# The candidates file holds a table in the prose gate's format under a
# "## Words to avoid or examine" heading: Term (backticked forms, plus
# optional note text outside the backticks), Repair, Gate. The Gate cell
# may be blank or hold a proposal; the tool ignores it. A note holding the
# word "literal" records that a technical or literal use exists.
#
# Each root's pages are its tracked markdown files (git ls-files under the
# root, so a subfolder root lists only its subtree), minus any file whose
# path relative to the root, with a leading slash, holds a --skip
# substring. Each row is counted the way check-prose.sh matches it: the
# same form rule and form-to-pattern conversion, the same masking of
# fenced blocks, blockquotes, backtick spans and URLs, case ignored, every
# match counted.
#
# Output (stdout): a table of Term, Repair, Count and Tier in input order.
# Tier is FAIL for no hits and no literal note, WARN for no hits with a
# literal note or for 1 to N hits, and Guidance for more than N hits (the
# threshold, 40 by default). A row holding a form the gate would refuse
# (a dot, a slash, brackets) is not counted: its Tier reads "Script or
# guidance" and a closing section names the refused form. A summary line
# ends the output.
#
# Exit: 0 success, 1 a usage error, a missing candidates file, a root that
# is not inside a git repository, or a table with no rows.

set -uo pipefail
export LC_ALL=C

usage() { awk 'NR == 1 { next } /^#/ { sub(/^# ?/, ""); print; next } { exit }' "$0"; }

fail() {
  printf 'tier-candidates: %s\n' "$1" >&2
  exit 1
}

# Mirrors strip_masked in check-prose.sh: blank fenced blocks, blockquote
# lines, double and single backtick spans and URLs, preserving line count.
strip_masked() {
  awk '/^[[:space:]]*(```|~~~)/{f=!f; print ""; next} f{print ""; next} /^[[:space:]]*>/{print ""; next} {print}' "$1" \
    | sed -E 's/``([^`]|`[^`])*``//g' \
    | sed 's/`[^`]*`//g' \
    | sed -E 's|https?://[^[:space:]<>")]+||g'
}

# Mirrors read_terms_table in check-prose.sh for the form rule and the
# form-to-pattern conversion, so a drift there is a one-line fix here. The
# differences: the Gate cell is ignored, a refused form refuses its row
# instead of the whole table, and the literal note is read. One line per
# row, fields separated by the unit separator (octal 037):
#   ROW, term cell, repair, grep pattern, literal flag (1 or 0)
#   REFUSED, term cell, repair, the first refused form
read_candidates() {  # $1 file
  awk -F'|' -v US="$(printf '\037')" '
    /^## / { insec = ($0 ~ /^## Words to avoid or examine/); next }
    !insec || !/^\|/ { next }
    {
      term = $2; gsub(/^[ \t]+|[ \t]+$/, "", term)
      repair = $3; gsub(/^[ \t]+|[ \t]+$/, "", repair)
      cell = $2; note = cell; alt = ""; bad = ""
      gsub(/`[^`]+`/, " ", note)
      while (match(cell, /`[^`]+`/)) {
        t = substr(cell, RSTART + 1, RLENGTH - 2); cell = substr(cell, RSTART + RLENGTH)
        if (t !~ /^[A-Za-z0-9][A-Za-z0-9 '\''-]*\*?$/) { if (bad == "") bad = t; continue }
        if (t ~ /\*$/) { sub(/\*$/, "", t); t = t "[[:alnum:]-]*" }
        gsub(/ /, "[[:space:]]+", t)
        alt = alt (alt == "" ? "" : "|") t
      }
      if (bad != "") { print "REFUSED" US term US repair US bad; next }
      if (alt == "") next
      lit = (tolower(note) ~ /(^|[^a-z])literal([^a-z]|$)/) ? 1 : 0
      print "ROW" US term US repair US "\\b(" alt ")\\b" US lit
    }' "$1"
}

CANDIDATES="" THRESHOLD=40
ROOTS=() SKIPS=()
while [ $# -gt 0 ]; do
  case "$1" in
    --threshold) THRESHOLD=${2:-}; [ $# -ge 2 ] || fail "--threshold needs a number (see --help)"; shift 2 ;;
    --skip)      [ $# -ge 2 ] || fail "--skip needs a substring (see --help)"; SKIPS+=("$2"); shift 2 ;;
    --help|-h)   usage; exit 0 ;;
    -*)          fail "unknown argument '$1' (see --help)" ;;
    *)           if [ -z "$CANDIDATES" ]; then CANDIDATES=$1; else ROOTS+=("$1"); fi; shift ;;
  esac
done

[ -n "$CANDIDATES" ] || fail "no candidates file (see --help)"
[ -f "$CANDIDATES" ] || fail "candidates file not found: $CANDIDATES"
[ "${#ROOTS[@]}" -gt 0 ] || fail "no root to count over (see --help)"
case "$THRESHOLD" in
  ''|*[!0-9]*) fail "--threshold must be a whole number, not '$THRESHOLD'" ;;
esac
for root in "${ROOTS[@]}"; do
  git -C "$root" rev-parse --is-inside-work-tree > /dev/null 2>&1 \
    || fail "root is not inside a git repository: $root"
done

TABLE=$(read_candidates "$CANDIDATES")
[ -n "$TABLE" ] || fail "no candidate rows read from $CANDIDATES, \"Words to avoid or examine\""

WORKDIR=$(mktemp -d "${TMPDIR:-/tmp}/tier-candidates.XXXXXX") || fail "mktemp failed"
trap 'rm -rf "$WORKDIR"' EXIT
CORPUS="$WORKDIR/corpus.txt"
: > "$CORPUS"

FILES=0
for root in "${ROOTS[@]}"; do
  git -C "$root" ls-files -z -- '*.md' | tr '\0' '\n' > "$WORKDIR/list.txt"
  while IFS= read -r rel; do
    [ -n "$rel" ] || continue
    skip=0
    for s in ${SKIPS[@]+"${SKIPS[@]}"}; do
      case "/$rel" in *"$s"*) skip=1; break ;; esac
    done
    [ "$skip" -eq 0 ] || continue
    [ -f "$root/$rel" ] || continue
    strip_masked "$root/$rel" >> "$CORPUS"
    FILES=$((FILES + 1))
  done < "$WORKDIR/list.txt"
done

US=$(printf '\037')
ROWS=0 REFUSED=""
printf '## Tiered Candidates\n\n| Term | Repair | Count | Tier |\n| --- | --- | --- | --- |\n'
while IFS="$US" read -r kind term repair pat lit; do
  [ -n "$kind" ] || continue
  ROWS=$((ROWS + 1))
  if [ "$kind" = REFUSED ]; then
    printf '| %s | %s | - | Script or guidance |\n' "$term" "$repair"
    REFUSED="${REFUSED}| $term | \`$pat\` |
"
    continue
  fi
  count=$(grep -o -i -E "$pat" "$CORPUS" | wc -l)
  count=$((count + 0))
  if [ "$count" -eq 0 ]; then
    if [ "$lit" = 1 ]; then tier=WARN; else tier=FAIL; fi
  elif [ "$count" -le "$THRESHOLD" ]; then
    tier=WARN
  else
    tier=Guidance
  fi
  printf '| %s | %s | %s | %s |\n' "$term" "$repair" "$count" "$tier"
done <<< "$TABLE"

printf '\n## Script or Guidance\n\n'
if [ -n "$REFUSED" ]; then
  printf '| Term | Refused form |\n| --- | --- |\n%s' "$REFUSED"
else
  printf 'Every row holds forms the gate accepts.\n'
fi
printf '\ntier-candidates: %s rows, %s files, threshold %s\n' "$ROWS" "$FILES" "$THRESHOLD"
exit 0
