#!/usr/bin/env bash
# claim-diff.sh - the claim nominator on one edit, outside a triage run.
#
# Usage:
#   bash ~/trade-imports-arch-workspace/.claude/tools/editorial/claim-diff.sh --before <file> --after <file>
#
# Reads each file's bytes whole and passes them to the nominator unchanged,
# so a trailing newline is part of the text: two files differing only in
# their trailing newline are a layout difference, which the library reports
# as layoutOnly true. Write both files the same way to compare only the
# words. An empty after file is a deletion. Prints one JSON object,
# {added, removed, missingSentence, nominated, layoutOnly}, as
# lib/claim-elements.jq computes it for a record's before and after. A
# signal for the reword loop, not a verdict on meaning: the nominator
# compares words, and a claim can change without a listed element changing.
# Exit: 0 on any nomination result, nominated true included; 1 with a
# diagnostic for a missing or unknown argument, an unreadable file or a
# missing library; 2 when jq fails.
set -uo pipefail
export LC_ALL=C

LIB="$HOME/trade-imports-arch-workspace/.claude/tools/editorial-triage/lib"

usage() { sed -n '2,18p' "$0" | sed 's/^# \{0,1\}//'; }
die() { printf 'claim-diff: %s\n' "$1" >&2; exit "${2:-1}"; }

BEFORE=""; AFTER=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --before) [[ $# -ge 2 ]] || die "--before needs a file"; BEFORE=$2; shift 2 ;;
    --after) [[ $# -ge 2 ]] || die "--after needs a file"; AFTER=$2; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) die "unknown argument: $1 (usage: --before <file> --after <file>)" ;;
  esac
done
[[ -n "$BEFORE" && -n "$AFTER" ]] || die "both --before <file> and --after <file> are required"
BEFORE="${BEFORE/#\~/$HOME}"; AFTER="${AFTER/#\~/$HOME}"
for f in "$BEFORE" "$AFTER"; do
  [[ -f "$f" && -r "$f" ]] || die "not a readable file: $f"
done
command -v jq >/dev/null 2>&1 || die "jq is required (baseline tool); install jq and re-run"
[[ -f "$LIB/claim-elements.jq" ]] || die "nominator library not found at $LIB/claim-elements.jq; the editorial-triage tools must be present"

jq -n -c -L "$LIB" --rawfile b "$BEFORE" --rawfile a "$AFTER" '
  include "claim-elements";
  claim_diff($b; $a) + {layoutOnly: layout_only($b; $a)}'
rc=$?
[[ $rc -eq 0 ]] || die "jq failed (exit $rc)" 2
exit 0
