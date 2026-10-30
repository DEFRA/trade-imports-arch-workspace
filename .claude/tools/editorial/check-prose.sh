#!/usr/bin/env bash
# check-prose.sh - deterministic editorial style gate for prose artefacts.
#
# Usage:
#   bash check-prose.sh <file> [<file>...]
#   printf '%s' "<text>" | bash check-prose.sh --stdin --label "<name>"
#   bash check-prose.sh --print-fail-lines <file>   # raw FAIL line contents only
#   bash check-prose.sh --terms <table.md> <file>   # add a document set's own terms table
#
# Word lists: the "Words to avoid or examine" table in language.md is
# read on every run. Its FAIL rows fail and its WARN rows warn, each hit
# with the row's repair; the run stops if the table yields no terms. A
# page's nearest editorial-profile.md (beside it or in a folder above, up
# to the repository root) adds its own table's rows for that page; with
# --stdin, a --label that names a file finds the profile the same way.
# A row whose Gate cell reads "FAIL docs" or "WARN docs" applies to
# human-facing documents only: it is skipped for an agent-instruction
# file, a path (the file argument, or the --label value) that holds a
# /.claude/ segment or begins .claude/, or whose name is CLAUDE.md or
# AGENTS.md.
#
# Hard failures (exit 2): em-dash; spaced en-dash (sentence-break usage);
# curly quotes; the table's FAIL rows;
# lowercase generic "portal" (proper nouns like
# "CDP Portal" pass); N/A in any case (state the fact: "not applicable",
# "no data", "not used"); a sentence or line ending on the pronoun
# "it" - name the noun instead, and put the hidden subject at the front
# of the sentence; and FAQ voice in a label - a markdown heading that opens
# on a question word (what, how, which, when, where, why, who, whether)
# or ends on "?", a table header cell or a bold lead-in that opens on one
# - name the topic as a noun phrase in title case instead. Warnings
# (exit 0):
# the table's WARN rows (context-sensitive and vague words, "alone",
# metaphor candidates, ledger phrases), and the reader-pays
# compression family (language.md, "Reader-pays compression"): the
# contact-clause pattern ("only the front door reaches"), aside
# stacking (3 or more " - " separators in one sentence), a spaced hyphen
# between two words used as a sentence break (table rows and front
# matter pass), a semicolon in body text (table rows, list items, front
# matter and HTML entities pass), a sentence, list item or cell that
# opens in FAQ voice (What, How, Which, Why, Whether, Who), a table
# header that trails off on a preposition ("Set by"), an inventory
# opener ("This page covers A, B, C and D": a page's parts listed as
# noun phrases; write a sentence per job with a verb) and a heading
# not in title case ("Activity and the idle point"). All
# WARN judgments stay with the editorial skill.
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
TERMS_DOC="$HOME/trade-imports-arch-workspace/.claude/best-practices/writing/language.md"
# Case-sensitive on purpose: "CDP Portal" is a product name, "the portal"
# is the GDS-banned generic. Matched with plain grep, not grep -i.
PORTAL_PATTERN='\bportal\b'
NA_PATTERN='\bn/a\b'
# Case-sensitive on purpose: lowercase "it" is the pronoun, while "IT" is
# the abbreviation for information technology and must not match.
TRAILING_IT_PATTERN='[[:space:]]it[[:space:]]*([.!?]|$)'
# A heading names its topic; a question or a half-question clause
# ("What a journey backend checks") is not a heading.
QUESTION_HEADING_PATTERN='^#{1,6}[[:space:]]+((what|how|which|when|where|why|who|whom|whose|whether)\b|.*\?[[:space:]]*$)'
# Headings are in title case: every word capitalised except articles,
# short conjunctions and short prepositions after the first word. Only
# word starts are checked, so "Re-confirmation" passes. A lowercase
# product name can be a fair exception, so WARN not FAIL.
HEADING_SMALL_WORDS='a|an|the|and|but|or|nor|for|of|in|on|at|to|by|as|via|vs|with|from|into|per'
# The same half-question opening a sentence, list item, bold lead-in or
# table cell is a smell: restructure around the actor and the content.
# Case-sensitive, so only a capitalised opener matches; "When" and
# "Where" are left out because they usually open a condition, which the
# house style puts first on purpose.
QUESTION_OPENER_PATTERN='(^[[:space:]]*(([-*+]|[0-9]+\.)[[:space:]]+)?(\*\*)?|[.!?][[:space:]]+(\*\*)?|\|[[:space:]]*(\*\*)?)(What|How|Which|Why|Whether|Who)\b'
# A label that stands in for a noun (a table header cell, a bold lead-in)
# in FAQ voice fails like a heading. Here "When" and "Where" count too,
# because a label states no condition. Header rows are the lines a
# `| --- |` separator follows; the opener WARN skips them and the bold
# lead-ins, so one line is never reported twice.
LABEL_QUESTION_WORDS='(what|how|which|when|where|why|who|whom|whose|whether)'
BOLD_LEADIN_FAQ_PATTERN='^[[:space:]]*(([-*+]|[0-9]+\.)[[:space:]]+)?\*\*'"$LABEL_QUESTION_WORDS"'\b'
HEADER_CELL_FAQ_PATTERN='\|[[:space:]]*(\*\*)?'"$LABEL_QUESTION_WORDS"'\b'
# A header cell that trails off on a preposition ("Set by", "Used by") is
# a clause fragment, not a noun phrase. The noun ("Source", "Writer") is
# a judgment, so WARN not FAIL.
HEADER_CELL_DANGLING_PATTERN='[[:space:]](by|as|for|to|of|from|with|in|on|at)[[:space:]]*\|'
# An inventory opener lists a page's parts as noun phrases: an opener on
# "This page covers ..." carrying three or more items before the first
# full stop. A sentence per job of the page, each with a verb, is the
# repair; whether the opener is one is a judgment, so WARN not FAIL.
INVENTORY_OPENER_PATTERN='(^|[.!?][[:space:]]+)(This|The) (page|document|section|chapter|guide|note|record|proposal|plan|table) (covers|defines|describes|explains|sets out|lists|answers|gives|details|holds|records|states|presents|summari[sz]es|carries|contains|includes|comprises)\b[^.]*(,[^.]*){2,}'
CONTACT_PATTERN='\bonly (the |that |its )?([a-zA-Z'\''-]+ ){1,3}(reaches|sees|touches)\b'
# A spaced hyphen between two words is a sentence break; a list marker
# has no word before it and a "---" rule no word beside it, so neither
# matches. Table rows and front matter are skipped where the rule runs.
HYPHEN_BREAK_PATTERN="[[:alnum:]\"')] - [[:alnum:]\"'(]"
# Body-text lines only: a table row or a list item may hold a semicolon,
# and an HTML entity ("&amp;") is removed before the test.
LIST_ITEM_PATTERN='^[[:space:]]*([-*+]|[0-9]+[.])[[:space:]]'

usage() { awk 'NR == 1 { next } /^#/ { sub(/^# ?/, ""); print; next } { exit }' "$0"; }

fail() {
  printf 'check-prose: %s\n' "$1" >&2
  exit "${2:-1}"
}

# Blank fenced blocks, blockquote lines, inline backtick spans and URLs,
# preserving line count, so matches inside exemplar text, verbatim quotes
# of external documents, and real-world names in links are treated as
# data. Same rationale as the quoted-span stripping in hooks/guard-bash.sh.
# Double-backtick spans (the Markdown form for a span that itself contains
# a backtick) go first: the single-backtick pass would read the opening
# pair as an empty span and expose the text up to the inner backtick.
strip_masked() {
  awk '/^[[:space:]]*(```|~~~)/{f=!f; print ""; next} f{print ""; next} /^[[:space:]]*>/{print ""; next} {print}' "$1" \
    | sed -E 's/``([^`]|`[^`])*``//g' \
    | sed 's/`[^`]*`//g' \
    | sed -E 's|https?://[^[:space:]<>")]+||g'
}

# Read the "Words to avoid or examine" table into one line per FAIL or
# WARN row: gate, grep pattern, first term, repair, source, scope,
# tab-separated. Each
# backticked form in the Term cell is one alternative; a trailing * matches
# any ending and a space matches any run of spaces. A form with any other
# character is refused, so the table never carries regex. The Gate cell is
# the tier, FAIL or WARN, optionally followed by the scope token docs,
# which limits the row to human-facing documents; any other second word
# is refused.
load_terms() {
  local doc
  BASE_TERMS=""
  for doc in "$TERMS_DOC" ${EXTRA_TERMS[@]+"${EXTRA_TERMS[@]}"}; do
    BASE_TERMS="${BASE_TERMS:+$BASE_TERMS
}$(terms_from "$doc" required)" || exit 1
  done
}

terms_from() {  # $1 table file, $2 "required" when the file must yield rows
  local shown out bad
  shown="${1/#$HOME/~}"
  [ -f "$1" ] || fail "terms table not found: $shown"
  out=$(read_terms_table "$1" "$shown")
  bad=$(printf '%s\n' "$out" | awk -F'\t' '$1 == "BADSCOPE" { print $2; exit }')
  [ -z "$bad" ] || fail "terms table: gate \"$bad\" may read only FAIL, WARN, FAIL docs or WARN docs ($shown, \"Words to avoid or examine\")"
  bad=$(printf '%s\n' "$out" | awk -F'\t' '$1 == "BAD" { print $2; exit }')
  [ -z "$bad" ] || fail "terms table: form \"$bad\" may hold only letters, digits, spaces, hyphens, apostrophes and a trailing * ($shown, \"Words to avoid or examine\")"
  [ -n "$out" ] || [ "${2:-}" != required ] || fail "terms table: no FAIL or WARN rows read from $shown, \"Words to avoid or examine\""
  printf '%s' "$out"
}

# A page's document set may keep an editorial-profile.md beside its pages
# or in a folder above them, up to the repository root. Its own "Words to
# avoid or examine" rows apply to that page on top of language.md's.
profile_for() {  # $1 page path; prints the nearest profile, or nothing
  local d
  [ -e "$1" ] || return 0
  d=$(cd "$(dirname "$1")" 2>/dev/null && pwd) || return 0
  while :; do
    [ -f "$d/editorial-profile.md" ] && { printf '%s\n' "$d/editorial-profile.md"; return 0; }
    { [ -e "$d/.git" ] || [ "$d" = / ]; } && return 0
    d=$(dirname "$d")
  done
}

terms_for() {  # $1 page path; sets TERMS for that page
  local prof extra
  TERMS=$BASE_TERMS
  prof=$(profile_for "$1")
  if [ -n "$prof" ]; then
    extra=$(terms_from "$prof") || exit 1
    [ -z "$extra" ] || TERMS="$TERMS
$extra"
  fi
  # A docs-scoped row applies to human-facing documents only.
  if is_agent_file "$1"; then
    TERMS=$(printf '%s\n' "$TERMS" | awk -F'\t' '$6 != "docs"')
  fi
}

# An agent-instruction file: a path holding a /.claude/ segment or
# beginning .claude/, or a file named CLAUDE.md or AGENTS.md. The path is
# matched as given, relative or absolute.
is_agent_file() {  # $1 page path
  case "$1" in
    .claude/*|*/.claude/*) return 0 ;;
  esac
  case "${1##*/}" in
    CLAUDE.md|AGENTS.md) return 0 ;;
  esac
  return 1
}

read_terms_table() {  # $1 file, $2 its display path
  awk -F'|' -v src="$2" '
    /^## / { insec = ($0 ~ /^## Words to avoid or examine/); next }
    !insec || !/^\|/ { next }
    {
      gate = $4; gsub(/^[ \t]+|[ \t]+$/, "", gate)
      ng = split(gate, g, /[ \t]+/)
      if (g[1] != "FAIL" && g[1] != "WARN") next
      if (ng > 2 || (ng == 2 && g[2] != "docs")) { print "BADSCOPE\t" gate; next }
      scope = (ng == 2 ? "docs" : "all"); gate = g[1]
      repair = $3; gsub(/^[ \t]+|[ \t]+$/, "", repair)
      cell = $2; alt = ""; first = ""
      while (match(cell, /`[^`]+`/)) {
        t = substr(cell, RSTART + 1, RLENGTH - 2); cell = substr(cell, RSTART + RLENGTH)
        if (t !~ /^[A-Za-z0-9][A-Za-z0-9 '\''-]*\*?$/) { print "BAD\t" t; next }
        if (first == "") first = t
        if (t ~ /\*$/) { sub(/\*$/, "", t); t = t "[[:alnum:]-]*" }
        gsub(/ /, "[[:space:]]+", t)
        alt = alt (alt == "" ? "" : "|") t
      }
      if (alt != "") print gate "\t\\b(" alt ")\\b\t" first "\t" repair "\t" src "\t" scope
    }' "$1"
}

report_terms() {  # $1 file on disk, $2 display label, $3 masked text, $4 gate; returns 2 on a FAIL hit
  local gate pat first repair src _scope hits matched rc=0
  while IFS=$'\t' read -r gate pat first repair src _scope; do
    [ "$gate" = "$4" ] || continue
    hits=$(printf '%s\n' "$3" | grep -inE "$pat" || true)
    [ -n "$hits" ] || continue
    report_hits "$1" "$2" "$gate" "$hits"
    # A row can group many forms, so name the text that matched: every
    # distinct match, lowercased, its runs of whitespace collapsed to one
    # space, in order of appearance.
    matched=$(printf '%s\n' "$hits" | cut -d: -f2- | grep -oiE "$pat" | tr '[:upper:]' '[:lower:]' \
      | sed -E 's/[[:space:]]+/ /g' | awk '!seen[$0]++ { printf "%s\"%s\"", (n++ ? ", " : ""), $0 }')
    [ -n "$matched" ] || matched="\"$first\""
    if [ "$gate" = FAIL ]; then
      printf 'check-prose: banned term %s - %s - rule: %s ("Words to avoid or examine").\n' "$matched" "$repair" "$src" >&2
      rc=2
    else
      printf 'check-prose: WARN hits are %s - %s (%s, "Words to avoid or examine").\n' "$matched" "$repair" "$src" >&2
    fi
  done <<< "$TERMS"
  return $rc
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
             while IFS=$'\t' read -r gate pat _; do
               [ "$gate" = FAIL ] && { printf '%s\n' "$masked" | grep -inE "$pat" || true; }
             done <<< "$TERMS"
             printf '%s\n' "$masked" | grep -nE "$PORTAL_PATTERN" || true
             printf '%s\n' "$masked" | grep -inE "$NA_PATTERN" || true
             printf '%s\n' "$masked" | grep -nE "$TRAILING_IT_PATTERN" || true
             printf '%s\n' "$masked" | grep -inE "$QUESTION_HEADING_PATTERN" || true
             printf '%s\n' "$masked" | awk '{l[NR]=$0} END{for(i=1;i<=NR;i++){ if(i<NR && l[i+1] ~ /^[[:space:]]*\|[[:space:]]*:?-{3,}/) print l[i]; else print "" }}' | grep -inE "$HEADER_CELL_FAQ_PATTERN" || true
             printf '%s\n' "$masked" | grep -inE "$BOLD_LEADIN_FAQ_PATTERN" || true
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
    printf 'check-prose: banned punctuation (em-dash / spaced en-dash / curly quote) - rule: %s. Replace with a full stop, comma or colon, or recast as two sentences. Use straight quotes, and re-run.\n' "$LANGUAGE_DOC" >&2
    rc=2
  fi

  report_terms "$1" "$2" "$masked" FAIL || rc=2

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

  hits=$(printf '%s\n' "$masked" | grep -inE "$QUESTION_HEADING_PATTERN" || true)
  if [ -n "$hits" ]; then
    report_hits "$1" "$2" FAIL "$hits"
    printf 'check-prose: FAQ voice in a heading - rule: %s ("Headings, lists and tables"). Name the topic as a noun phrase in title case: "Session Assertion Checks", not "What a journey backend checks".\n' "$LANGUAGE_DOC" >&2
    rc=2
  fi

  hits=$(printf '%s\n' "$masked" | awk -v small="$HEADING_SMALL_WORDS" '
    BEGIN { n = split(small, a, "|"); for (i = 1; i <= n; i++) s[a[i]] = 1 }
    /^#+[ \t]/ {
      h = $0; sub(/^#+[ \t]+/, "", h); m = split(h, w, /[ \t]+/); first = 1
      for (i = 1; i <= m; i++) {
        t = w[i]; sub(/^[^A-Za-z0-9]+/, "", t)
        if (t == "") continue
        if (substr(t, 1, 1) ~ /[a-z]/) {
          lw = t; sub(/[^a-z].*$/, "", lw)
          if (first || !(lw in s)) { print NR ":" $0; break }
        }
        first = 0
      }
    }')
  if [ -n "$hits" ]; then
    report_hits "$1" "$2" WARN "$hits"
    printf 'check-prose: WARN hits are headings not in title case - capitalise every word except articles, short conjunctions and short prepositions after the first word: "Activity and the Idle Point", not "Activity and the idle point" (%s, "Capitalisation, numbers, dates and inclusion").\n' "$LANGUAGE_DOC" >&2
  fi

  # Table header rows: the line a `| --- |` separator follows. Labels in
  # FAQ voice fail; the opener WARN below skips these lines.
  local masked_headers masked_body
  masked_headers=$(printf '%s\n' "$masked" | awk '{l[NR]=$0} END{for(i=1;i<=NR;i++){ if(i<NR && l[i+1] ~ /^[[:space:]]*\|[[:space:]]*:?-{3,}/) print l[i]; else print "" }}')
  masked_body=$(printf '%s\n' "$masked" | awk '{l[NR]=$0} END{for(i=1;i<=NR;i++){ if(i<NR && l[i+1] ~ /^[[:space:]]*\|[[:space:]]*:?-{3,}/) print ""; else print l[i] }}')
  hits=$( { printf '%s\n' "$masked_headers" | grep -inE "$HEADER_CELL_FAQ_PATTERN"; printf '%s\n' "$masked" | grep -inE "$BOLD_LEADIN_FAQ_PATTERN"; } | sort -t: -k1,1n -u || true)
  if [ -n "$hits" ]; then
    report_hits "$1" "$2" FAIL "$hits"
    printf 'check-prose: FAQ voice in a label - rule: %s ("Headings, lists and tables"). A table header or a bold lead-in names its topic as a noun phrase in title case: "Condition", not "When the session is in it"; "End State", not "What John sees".\n' "$LANGUAGE_DOC" >&2
    rc=2
  fi

  hits=$(printf '%s\n' "$masked_headers" | grep -inE "$HEADER_CELL_DANGLING_PATTERN" || true)
  if [ -n "$hits" ]; then
    report_hits "$1" "$2" WARN "$hits"
    printf 'check-prose: WARN hits are table headers that trail off on a preposition ("Set by", "Used by") - a clause fragment, not a noun phrase: name the role, "Source", "Writer" (%s, "Headings, lists and tables").\n' "$LANGUAGE_DOC" >&2
  fi

  hits=$(printf '%s\n' "$masked" | grep -nE "$INVENTORY_OPENER_PATTERN" || true)
  if [ -n "$hits" ]; then
    report_hits "$1" "$2" WARN "$hits"
    printf 'check-prose: WARN hits are an inventory opener - an opener that lists the page'"'"'s parts as noun phrases: write one sentence per job of the page, each with an actor and a verb (%s, "Headings, lists and tables").\n' "$LANGUAGE_DOC" >&2
  fi

  report_terms "$1" "$2" "$masked" WARN

  hits=$(printf '%s\n' "$masked" | grep -inE "$CONTACT_PATTERN" || true)
  if [ -n "$hits" ]; then
    report_hits "$1" "$2" WARN "$hits"
    printf 'check-prose: WARN hits are the contact-clause pattern - restore the relative pronoun and the capability verb: "a store that only the front door can access" (%s, "Reader-pays compression").\n' "$LANGUAGE_DOC" >&2
  fi

  hits=$(printf '%s\n' "$masked_body" | grep -nE "$QUESTION_OPENER_PATTERN" | grep -vE '^[0-9]+:#' | grep -vE '^[0-9]+:[[:space:]]*(([-*+]|[0-9]+\.)[[:space:]]+)?\*\*' || true)
  if [ -n "$hits" ]; then
    report_hits "$1" "$2" WARN "$hits"
    printf 'check-prose: WARN hits are FAQ voice - a sentence, list item or cell opens on a half-question (What, How, Which, Why, Whether, Who), a smell: restructure so the actor and the content lead, for example "The backend checks the signature", not "What the backend checks is the signature" (%s, "Headings, lists and tables").\n' "$LANGUAGE_DOC" >&2
  fi

  hits=$(printf '%s\n' "$masked" | awk '{
    n = split($0, s, /[.!?]/); flag = 0
    for (i = 1; i <= n; i++) { t = s[i]; if (gsub(/ - /, " - ", t) >= 3) flag = 1 }
    if (flag) print NR ":" $0
  }')
  if [ -n "$hits" ]; then
    report_hits "$1" "$2" WARN "$hits"
    printf 'check-prose: WARN hits are aside stacking - 3 or more " - " separators in one sentence. Recast the asides as sentences or a list (%s, "Reader-pays compression").\n' "$LANGUAGE_DOC" >&2
  fi

  # The punctuation shape rules read body text only: front matter blanked,
  # line numbers kept, on top of the masking above.
  local masked_prose
  masked_prose=$(printf '%s\n' "$masked" | awk '
    NR == 1 && /^---[[:space:]]*$/ { fm = 1; print ""; next }
    fm { if (/^---[[:space:]]*$/) fm = 0; print ""; next }
    { print }')

  hits=$(printf '%s\n' "$masked_prose" | awk -v pat="$HYPHEN_BREAK_PATTERN" '
    /^[[:space:]]*\|/ { next }
    $0 ~ pat { print NR ":" $0 }')
  if [ -n "$hits" ]; then
    report_hits "$1" "$2" WARN "$hits"
    printf 'check-prose: WARN hits are a spaced hyphen as a sentence break: use a full stop, comma or colon, or recast the two parts as two sentences (%s, "Punctuation and formatting").\n' "$LANGUAGE_DOC" >&2
  fi

  hits=$(printf '%s\n' "$masked_prose" | awk -v list="$LIST_ITEM_PATTERN" '
    /^[[:space:]]*\|/ || $0 ~ list { next }
    { l = $0; gsub(/&[a-zA-Z#0-9]+;/, "", l); if (l ~ /;/) print NR ":" $0 }')
  if [ -n "$hits" ]; then
    report_hits "$1" "$2" WARN "$hits"
    printf 'check-prose: WARN hits are a semicolon in body text: split the sentence, or use a colon before a list (%s, "Punctuation and formatting").\n' "$LANGUAGE_DOC" >&2
  fi

  return $rc
}

STDIN=0 LABEL="stdin" PRINT_FAIL=0
FILES=() EXTRA_TERMS=()
while [ $# -gt 0 ]; do
  case "$1" in
    --stdin)   STDIN=1; shift ;;
    --terms)   EXTRA_TERMS+=("${2:?--terms needs a file}"); shift 2 ;;
    --label)   LABEL=${2:?--label needs a value}; shift 2 ;;
    --print-fail-lines) PRINT_FAIL=1; shift ;;
    --help|-h) usage; exit 0 ;;
    -*)        fail "unknown argument '$1' (see --help)" ;;
    *)         FILES+=("$1"); shift ;;
  esac
done

load_terms

RC=0
if [ "$STDIN" -eq 1 ]; then
  TMP=$(mktemp "${TMPDIR:-/tmp}/check-prose.XXXXXX") || fail "mktemp failed"
  trap 'rm -f "$TMP"' EXIT
  cat > "$TMP"
  terms_for "$LABEL"
  check_file "$TMP" "$LABEL" || RC=2
else
  [ "${#FILES[@]}" -gt 0 ] || fail "no input: pass file paths or --stdin (see --help)"
  for f in "${FILES[@]}"; do
    [ -f "$f" ] || fail "file not found: $f"
    terms_for "$f"
    check_file "$f" "$f" || RC=2
  done
fi

exit "$RC"
