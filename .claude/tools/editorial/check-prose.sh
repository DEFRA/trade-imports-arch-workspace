#!/usr/bin/env bash
# check-prose.sh - deterministic editorial style gate for prose artefacts.
#
# Usage:
#   bash check-prose.sh <file> [<file>...]
#   printf '%s' "<text>" | bash check-prose.sh --stdin --label "<name>"
#   bash check-prose.sh --print-fail-lines <file>   # raw FAIL line contents only
#
# Hard failures (exit 2): em-dash; spaced en-dash (sentence-break usage);
# curly quotes; banned words from the language.md table (utilise, leverage,
# facilitate, empower, seamless, user-friendly, streamline, load-bearing);
# lowercase generic "portal" (proper nouns like
# "CDP Portal" pass); N/A in any case (state the fact: "not applicable",
# "no data", "not used"); and a sentence or line ending on the pronoun
# "it" - name the noun instead, and put the hidden subject at the front
# of the sentence. Warnings (exit 0):
# context-sensitive words (deliver, shape, bounds) and vague words
# (robust, appropriate, overarching, foster) - state the
# behaviour or criterion instead - the metaphor hard-avoid list -
# literal uses stay, figurative uses are replaced - and the reader-pays
# compression family (language.md, "Reader-pays compression"):
# ledger phrases ("held open under", "argued under", ...), the
# contact-clause pattern ("only the front door reaches") and aside
# stacking (3 or more " - " separators in one sentence). All WARN
# judgments stay with the editorial skill.
# The gate polices what the author writes, not the wider world: fenced
# code blocks, inline backtick spans, blockquoted (verbatim) text and
# URLs are blanked (line numbers preserved) so exemplar text, quotes and
# real-world names never false-positive.
# --print-fail-lines prints the offending raw lines (FAIL tiers only, no
# messages) so callers can diff violations between two versions of a text.
# Exit: 0 pass (WARNs allowed), 1 usage/environment error, 2 violation.

set -uo pipefail
export LC_ALL=C

LANGUAGE_DOC='~/trade-imports-arch-workspace/.claude/best-practices/writing/language.md'

# Banned bytes built from octal escapes so this file never contains them.
EMDASH=$(printf '\342\200\224')   # U+2014
ENDASH=$(printf '\342\200\223')   # U+2013
LSQ=$(printf '\342\200\230')      # U+2018
RSQ=$(printf '\342\200\231')      # U+2019
LDQ=$(printf '\342\200\234')      # U+201C
RDQ=$(printf '\342\200\235')      # U+201D

PUNCT_PATTERN="$EMDASH|[[:space:]]$ENDASH[[:space:]]|$LSQ|$RSQ|$LDQ|$RDQ"
JARGON_PATTERN='\b(utili[sz]e[sd]?|utili[sz]ing|leverage[sd]?|leveraging|facilitate[sd]?|facilitating|empower(s|ed|ing)?|seamless(ly)?|user-friendly|streamlin(es?|ed|ing)|load-bearing)\b'
# Case-sensitive on purpose: "CDP Portal" is a product name, "the portal"
# is the GDS-banned generic. Matched with plain grep, not grep -i.
PORTAL_PATTERN='\bportal\b'
NA_PATTERN='\bn/a\b'
# Case-sensitive on purpose: lowercase "it" is the pronoun, while "IT" is
# the abbreviation for information technology and must not match.
TRAILING_IT_PATTERN='[[:space:]]it[[:space:]]*([.!?]|$)'
VAGUE_PATTERN='\b(robust(ly)?|appropriate(ly)?|overarching|foster(s|ed|ing)?)\b'
CONTEXT_PATTERN='\b(deliver(s|ed|ing)?|shapes?|bounds)\b'
METAPHOR_PATTERN='\b(prices?|priced|rides?|bites?|spends?|spent|buys?|kills?|collapses?|leaks?|lands?|forecloses?|soften(s|ed|ing)?|bootstrap(s|ped|ping)?|ax[ei]s|postures?)\b|hangs? on'
LEDGER_PATTERN='held open under|argued under|its case is made|stated below the table|collected under|points? back to'
CONTACT_PATTERN='\bonly (the |that |its )?([a-zA-Z'\''-]+ ){1,3}(reaches|sees|touches)\b'

usage() { sed -n '2,31p' "$0" | sed 's/^# \{0,1\}//'; }

fail() {
  printf 'check-prose: %s\n' "$1" >&2
  exit "${2:-1}"
}

# Blank fenced blocks, blockquote lines, inline backtick spans and URLs,
# preserving line count, so matches inside exemplar text, verbatim quotes
# of external documents, and real-world names in links are treated as
# data. Same rationale as the quoted-span stripping in hooks/guard-bash.sh.
strip_masked() {
  awk '/^[[:space:]]*(```|~~~)/{f=!f; print ""; next} f{print ""; next} /^[[:space:]]*>/{print ""; next} {print}' "$1" \
    | sed 's/`[^`]*`//g' \
    | sed -E 's|https?://[^[:space:]<>")]+||g'
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

  # --print-fail-lines: emit the raw offending lines (FAIL tiers only,
  # deduplicated, document order) on stdout and stop. Callers diff these
  # between two versions of a text to find introduced violations.
  if [ "$PRINT_FAIL" -eq 1 ]; then
    local lns
    lns=$( { printf '%s\n' "$masked" | grep -nE "$PUNCT_PATTERN" || true
             printf '%s\n' "$masked" | grep -inE "$JARGON_PATTERN" || true
             printf '%s\n' "$masked" | grep -nE "$PORTAL_PATTERN" || true
             printf '%s\n' "$masked" | grep -inE "$NA_PATTERN" || true
             printf '%s\n' "$masked" | grep -nE "$TRAILING_IT_PATTERN" || true
           } | cut -d: -f1 | sort -un )
    [ -n "$lns" ] || return 0
    while IFS= read -r ln; do
      [ -n "$ln" ] && sed -n "${ln}p" "$1"
    done <<< "$lns"
    return 2
  fi

  hits=$(printf '%s\n' "$masked" | grep -nE "$PUNCT_PATTERN" || true)
  if [ -n "$hits" ]; then
    report_hits "$1" "$2" FAIL "$hits"
    printf 'check-prose: banned punctuation (em-dash / spaced en-dash / curly quote) - rule: %s. Replace with a plain hyphen " - " or straight quotes and re-run.\n' "$LANGUAGE_DOC" >&2
    rc=2
  fi

  hits=$(printf '%s\n' "$masked" | grep -inE "$JARGON_PATTERN" || true)
  if [ -n "$hits" ]; then
    report_hits "$1" "$2" FAIL "$hits"
    printf 'check-prose: banned word - rule: %s ("Words to avoid or examine"). Swap for the plain alternative the table names and re-run.\n' "$LANGUAGE_DOC" >&2
    rc=2
  fi

  hits=$(printf '%s\n' "$masked" | grep -nE "$PORTAL_PATTERN" || true)
  if [ -n "$hits" ]; then
    report_hits "$1" "$2" FAIL "$hits"
    printf 'check-prose: lowercase generic "portal" - rule: %s ("Words to avoid or examine"). Use "website" or "service"; proper nouns ("CDP Portal") and URLs pass unchanged.\n' "$LANGUAGE_DOC" >&2
    rc=2
  fi

  hits=$(printf '%s\n' "$masked" | grep -inE "$NA_PATTERN" || true)
  if [ -n "$hits" ]; then
    report_hits "$1" "$2" FAIL "$hits"
    printf 'check-prose: "N/A" - rule: %s ("Punctuation and formatting"). State the fact instead: "not applicable", "no data" or "not used".\n' "$LANGUAGE_DOC" >&2
    rc=2
  fi

  hits=$(printf '%s\n' "$masked" | grep -nE "$TRAILING_IT_PATTERN" || true)
  if [ -n "$hits" ]; then
    report_hits "$1" "$2" FAIL "$hits"
    printf 'check-prose: sentence ends on the pronoun "it" - rule: %s ("Reader-pays compression"). Name the noun the pronoun stands for; the subject the pronoun hides usually belongs at the front of the sentence.\n' "$LANGUAGE_DOC" >&2
    rc=2
  fi

  hits=$(printf '%s\n' "$masked" | grep -inE "$VAGUE_PATTERN" || true)
  if [ -n "$hits" ]; then
    report_hits "$1" "$2" WARN "$hits"
    printf 'check-prose: WARN hits are vague words - judge each: state the specific behaviour, quantity or criterion instead, or keep the word where it truly is the criterion (%s, "Words to avoid or examine").\n' "$LANGUAGE_DOC" >&2
  fi

  hits=$(printf '%s\n' "$masked" | grep -inE "$CONTEXT_PATTERN" || true)
  if [ -n "$hits" ]; then
    report_hits "$1" "$2" WARN "$hits"
    printf 'check-prose: WARN hits are context-sensitive words - keep literal technical uses; replace vague uses with the specific outcome, limit or structure (%s, "Words to avoid or examine").\n' "$LANGUAGE_DOC" >&2
  fi

  hits=$(printf '%s\n' "$masked" | grep -inE "$METAPHOR_PATTERN" || true)
  if [ -n "$hits" ]; then
    report_hits "$1" "$2" WARN "$hits"
    printf 'check-prose: WARN hits are metaphor candidates - judge each: literal technical uses stay, figurative uses are unpacked (%s, "Reader-pays compression").\n' "$LANGUAGE_DOC" >&2
  fi

  hits=$(printf '%s\n' "$masked" | grep -inE "$LEDGER_PATTERN" || true)
  if [ -n "$hits" ]; then
    report_hits "$1" "$2" WARN "$hits"
    printf 'check-prose: WARN hits are ledger voice - document bookkeeping written as prose. State the status in plain words: "that is still an open question (see X)" (%s, "Reader-pays compression").\n' "$LANGUAGE_DOC" >&2
  fi

  hits=$(printf '%s\n' "$masked" | grep -inE "$CONTACT_PATTERN" || true)
  if [ -n "$hits" ]; then
    report_hits "$1" "$2" WARN "$hits"
    printf 'check-prose: WARN hits are the contact-clause pattern - restore the relative pronoun and the capability verb: "a store that only the front door can access" (%s, "Reader-pays compression").\n' "$LANGUAGE_DOC" >&2
  fi

  hits=$(printf '%s\n' "$masked" | awk '{
    n = split($0, s, /[.!?]/); flag = 0
    for (i = 1; i <= n; i++) { t = s[i]; if (gsub(/ - /, " - ", t) >= 3) flag = 1 }
    if (flag) print NR ":" $0
  }')
  if [ -n "$hits" ]; then
    report_hits "$1" "$2" WARN "$hits"
    printf 'check-prose: WARN hits are aside stacking - 3 or more " - " separators in one sentence. At most one dash-aside per sentence; split the rest into their own sentences (%s, "Reader-pays compression").\n' "$LANGUAGE_DOC" >&2
  fi

  return $rc
}

STDIN=0 LABEL="stdin" PRINT_FAIL=0
FILES=()
while [ $# -gt 0 ]; do
  case "$1" in
    --stdin)   STDIN=1; shift ;;
    --label)   LABEL=${2:?--label needs a value}; shift 2 ;;
    --print-fail-lines) PRINT_FAIL=1; shift ;;
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
