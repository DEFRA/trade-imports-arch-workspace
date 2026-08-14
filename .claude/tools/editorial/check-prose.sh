#!/usr/bin/env bash
# check-prose.sh - deterministic editorial style gate for prose artefacts.
#
# Usage:
#   bash check-prose.sh <file> [<file>...]
#   printf '%s' "<text>" | bash check-prose.sh --stdin --label "<name>"
#
# Hard failures (exit 2): em-dash; spaced en-dash (sentence-break usage);
# curly quotes; GDS banned words (utilise, leverage, facilitate, empower,
# deliver, portal). Warnings (exit 0): the metaphor hard-avoid list -
# literal uses stay, figurative uses are replaced, and that judgment
# stays with the editorial skill.
# Governing rules: .claude/skills/editorial/SKILL.md ("Style guide") and
# .claude/best-practices/gds/language.md.
# Fenced code blocks and inline backtick spans are blanked (line numbers
# preserved) so exemplar and code text never false-positives.
# Exit: 0 pass (WARNs allowed), 1 usage/environment error, 2 violation.

set -uo pipefail
export LC_ALL=C

STYLE_DOC='~/trade-imports-arch-workspace/.claude/skills/editorial/SKILL.md (Style guide)'
GDS_DOC='~/trade-imports-arch-workspace/.claude/best-practices/gds/language.md'

# Banned bytes built from octal escapes so this file never contains them.
EMDASH=$(printf '\342\200\224')   # U+2014
ENDASH=$(printf '\342\200\223')   # U+2013
LSQ=$(printf '\342\200\230')      # U+2018
RSQ=$(printf '\342\200\231')      # U+2019
LDQ=$(printf '\342\200\234')      # U+201C
RDQ=$(printf '\342\200\235')      # U+201D

PUNCT_PATTERN="$EMDASH|[[:space:]]$ENDASH[[:space:]]|$LSQ|$RSQ|$LDQ|$RDQ"
JARGON_PATTERN='\b(utili[sz]e[sd]?|utili[sz]ing|leverage[sd]?|leveraging|facilitate[sd]?|facilitating|empower(s|ed|ing)?|deliver(s|ed|ing)?|portal)\b'
METAPHOR_PATTERN='\b(prices?|priced|rides?|bites?|spends?|spent|buys?|kills?|collapses?|leaks?|lands?|forecloses?)\b|hangs? on'

usage() { sed -n '2,18p' "$0" | sed 's/^# \{0,1\}//'; }

fail() {
  printf 'check-prose: %s\n' "$1" >&2
  exit "${2:-1}"
}

# Blank fenced blocks and inline backtick spans, preserving line count,
# so matches inside exemplar or code text are treated as data. Same
# rationale as the quoted-span stripping in hooks/guard-bash.sh.
strip_masked() {
  awk '/^[[:space:]]*(```|~~~)/{f=!f; print ""; next} f{print ""; next} {print}' "$1" \
    | sed 's/`[^`]*`//g'
}

report_hits() {  # $1 file on disk, $2 display label, $3 kind, $4 hits
  local kind=$3
  while IFS=: read -r ln _; do
    [ -n "$ln" ] || continue
    printf 'check-prose: %s %s:%s: %s\n' "$kind" "$2" "$ln" "$(sed -n "${ln}p" "$1")" >&2
  done <<< "$4"
}

check_file() {  # $1 file on disk, $2 display label; returns 2 on violation
  local masked hits rc=0
  masked=$(strip_masked "$1")

  hits=$(printf '%s\n' "$masked" | grep -nE "$PUNCT_PATTERN" || true)
  if [ -n "$hits" ]; then
    report_hits "$1" "$2" FAIL "$hits"
    printf 'check-prose: banned punctuation (em-dash / spaced en-dash / curly quote) - rule: %s. Replace with a plain hyphen " - " or straight quotes and re-run.\n' "$STYLE_DOC" >&2
    rc=2
  fi

  hits=$(printf '%s\n' "$masked" | grep -inE "$JARGON_PATTERN" || true)
  if [ -n "$hits" ]; then
    report_hits "$1" "$2" FAIL "$hits"
    printf 'check-prose: GDS banned word - rule: %s ("Words to Avoid"). Swap for the plain alternative the table names and re-run.\n' "$GDS_DOC" >&2
    rc=2
  fi

  hits=$(printf '%s\n' "$masked" | grep -inE "$METAPHOR_PATTERN" || true)
  if [ -n "$hits" ]; then
    report_hits "$1" "$2" WARN "$hits"
    printf 'check-prose: WARN hits are the metaphor hard-avoid list - judge each: literal technical uses stay, figurative uses are unpacked (%s, "Metaphor: hard avoids").\n' "$STYLE_DOC" >&2
  fi

  return $rc
}

STDIN=0 LABEL="stdin"
FILES=()
while [ $# -gt 0 ]; do
  case "$1" in
    --stdin)   STDIN=1; shift ;;
    --label)   LABEL=${2:?--label needs a value}; shift 2 ;;
    --help|-h) usage; exit 0 ;;
    -*)        fail "unknown argument '$1' (see --help)" ;;
    *)         FILES+=("$1"); shift ;;
  esac
done

RC=0
if [ "$STDIN" -eq 1 ]; then
  TMP=$(mktemp "${TMPDIR:-/tmp}/check-prose.XXXXXX") || fail "mktemp failed"
  trap 'rm -f "$TMP"' EXIT
  cat > "$TMP"
  check_file "$TMP" "$LABEL" || RC=2
else
  [ "${#FILES[@]}" -gt 0 ] || fail "no input: pass file paths or --stdin (see --help)"
  for f in "${FILES[@]}"; do
    [ -f "$f" ] || fail "file not found: $f"
    check_file "$f" "$f" || RC=2
  done
fi

exit "$RC"
