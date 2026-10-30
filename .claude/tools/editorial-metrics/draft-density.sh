#!/usr/bin/env bash
# draft-density.sh - prose gate hits per 1,000 words for one markdown file,
# by rule, as one JSON object.
#
# Usage:
#   bash draft-density.sh <file>
#   bash draft-density.sh --help
#
# Runs check-prose.sh on the file (its word table, the nearest
# editorial-profile.md and the shape rules, exactly as the gate applies
# them) and prints:
#   { "file", "words", "fail": { "<rule>": n }, "warn": { "<rule>": n },
#     "failPer1000", "warnPer1000" }
#
# A rule is the matched text of a term hit, counted once per distinct term
# on each hit line, or a slug for a shape rule: em-dash, en-dash,
# curly-quotes, portal, na, trailing-pronoun, question-heading, faq-label,
# heading-case, header-preposition, inventory-opener, contact-clause,
# faq-voice, aside-stacking, spaced-hyphen, semicolon. A shape hit counts
# once per hit line. A message the tool does not know counts under "other".
# Rule keys are sorted. The per-1000 figures are rounded to one decimal.
#
# Words are the body's whitespace-separated tokens holding a letter or a
# digit, after removing the front matter, fenced blocks, table rows and
# whole-line HTML comments (the CONFLUENCE_ONLY wrapper around the H1), and
# the heading, list and blockquote markers.
#
# Exit: 0 the JSON printed, whatever the gate's verdict; 1 a usage error, a
# missing file, or a gate that could not run.

set -uo pipefail
export LC_ALL=C

GATE="$HOME/trade-imports-arch-workspace/.claude/tools/editorial/check-prose.sh"

usage() { awk 'NR == 1 { next } /^#/ { sub(/^# ?/, ""); print; next } { exit }' "$0"; }
fail() { printf 'draft-density: %s\n' "$1" >&2; exit 1; }

case "${1:-}" in
  --help|-h) usage; exit 0 ;;
  '') fail "no file (see --help)" ;;
  -*) fail "unknown argument '$1' (see --help)" ;;
esac
[ $# -eq 1 ] || fail "one file at a time (see --help)"
FILE=$1
[ -f "$FILE" ] || fail "file not found: $FILE"
[ -f "$GATE" ] || fail "prose gate missing: $GATE"

WORDS=$(awk '
  NR == 1 && /^---[[:space:]]*$/ { fm = 1; next }
  fm { if (/^---[[:space:]]*$/) fm = 0; next }
  /^[[:space:]]*(```|~~~)/ { f = !f; next }
  f { next }
  /^[[:space:]]*\|/ { next }
  /^[[:space:]]*<!--.*-->[[:space:]]*$/ { next }
  {
    sub(/^[[:space:]]*#+[[:space:]]+/, "")
    sub(/^[[:space:]]*>[[:space:]]*/, "")
    sub(/^[[:space:]]*([-*+]|[0-9]+[.])[[:space:]]+/, "")
    for (i = 1; i <= NF; i++) if ($i ~ /[[:alnum:]]/) n++
  }
  END { print n + 0 }' "$FILE")

OUT=$(bash "$GATE" "$FILE" 2>&1)
RC=$?
[ "$RC" -ne 1 ] || fail "the prose gate could not run: $(printf '%s\n' "$OUT" | head -n 1)"

# One line per count, "FAIL<TAB>rule" or "WARN<TAB>rule". Hit lines are
# buffered until the message line that names their rule.
COUNTS=$(printf '%s\n' "$OUT" | awk -v file="$FILE" \
  -v em="$(printf '\342\200\224')" -v en="$(printf '\342\200\223')" \
  -v q1="$(printf '\342\200\230')" -v q2="$(printf '\342\200\231')" \
  -v q3="$(printf '\342\200\234')" -v q4="$(printf '\342\200\235')" '
  function shape(msg) {
    if (msg ~ /^banned punctuation/) return "punct"
    if (msg ~ /^lowercase generic "portal"/) return "portal"
    if (msg ~ /^"N\/A"/) return "na"
    if (msg ~ /^sentence ends on the pronoun/) return "trailing-pronoun"
    if (msg ~ /^FAQ voice in a heading/) return "question-heading"
    if (msg ~ /^FAQ voice in a label/) return "faq-label"
    if (msg ~ /^WARN hits are headings not in title case/) return "heading-case"
    if (msg ~ /^WARN hits are table headers/) return "header-preposition"
    if (msg ~ /^WARN hits are an inventory opener/) return "inventory-opener"
    if (msg ~ /^WARN hits are the contact-clause/) return "contact-clause"
    if (msg ~ /^WARN hits are FAQ voice/) return "faq-voice"
    if (msg ~ /^WARN hits are aside stacking/) return "aside-stacking"
    if (msg ~ /^WARN hits are a spaced hyphen/) return "spaced-hyphen"
    if (msg ~ /^WARN hits are a semicolon/) return "semicolon"
    return "other"
  }
  function terms(list,   n, t) {   # "a", "b" - ... into T[1..n]
    n = 0
    while (match(list, /^"[^"]*"/)) {
      T[++n] = substr(list, 2, RLENGTH - 2)
      list = substr(list, RLENGTH + 1)
      sub(/^, /, "", list)
    }
    return n
  }
  function flush(msg,   kind, n, i, j, re, slug, line) {
    if (msg ~ /^banned term "/) { kind = "term"; n = terms(substr(msg, 13)) }
    else if (msg ~ /^WARN hits are "/) { kind = "term"; n = terms(substr(msg, 15)) }
    else { kind = "shape"; slug = shape(msg) }
    for (i = 1; i <= nb; i++) {
      line = tolower(B[i])
      if (kind == "term") {
        for (j = 1; j <= n; j++) {
          re = T[j]; gsub(/ /, "[[:space:]]+", re)
          if (line ~ ("(^|[^[:alnum:]_])" re "($|[^[:alnum:]_])")) print K[i] "\t" T[j]
        }
      } else if (slug == "punct") {
        if (index(B[i], em)) print K[i] "\tem-dash"
        if (B[i] ~ ("[[:space:]]" en "[[:space:]]")) print K[i] "\ten-dash"
        if (index(B[i], q1) || index(B[i], q2) || index(B[i], q3) || index(B[i], q4)) print K[i] "\tcurly-quotes"
      } else print K[i] "\t" slug
    }
    nb = 0
  }
  {
    hf = "check-prose: FAIL " file ":"; hw = "check-prose: WARN " file ":"
    if (index($0, hf) == 1 || index($0, hw) == 1) {
      rest = substr($0, length(hf) + 1); sub(/^[0-9]+: /, "", rest)
      B[++nb] = rest; K[nb] = (index($0, hf) == 1 ? "FAIL" : "WARN")
      next
    }
    if (index($0, "check-prose: ") == 1) flush(substr($0, 14))
  }')

printf '%s\n' "$COUNTS" | jq -R -s --arg file "$FILE" --argjson words "$WORDS" '
  [split("\n")[] | select(length > 0) | split("\t") | {tier: .[0], rule: .[1]}] as $c
  | def tally($t): [$c[] | select(.tier == $t) | .rule]
      | group_by(.) | map({key: .[0], value: length}) | from_entries;
    def per1000($n): if $words == 0 then 0 else ($n * 10000 / $words | round) / 10 end;
  { file: $file,
    words: $words,
    fail: tally("FAIL"),
    warn: tally("WARN"),
    failPer1000: per1000([$c[] | select(.tier == "FAIL")] | length),
    warnPer1000: per1000([$c[] | select(.tier == "WARN")] | length) }'
