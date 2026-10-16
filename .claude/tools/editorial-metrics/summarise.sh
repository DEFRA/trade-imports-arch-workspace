#!/usr/bin/env bash
# summarise.sh - tables from an extract-run.sh output directory: cost and
# activity per agent and per role x model, file visits by access kind,
# page visits by role, and a phase timeline.
#
# Usage:
#   bash summarise.sh <extract dir> [--manifest <triage manifest.json>]... [--doc-pattern <regex>]
#
# --manifest supplies the page basenames under review (from .pages[].page);
# repeat it for runs with several workareas. --doc-pattern classes other
# files matching the regex as context pages (documentation read beside the
# set). Costs use rates.json beside this script (USD per million tokens,
# first-party API rates as a proxy for allowance weighting).
# Writes tables.json (all tables), agents.csv, roles.csv, file-visits.csv,
# context-composition.csv, cache-misses.csv, turns.csv, page-visits.csv and
# timeline.csv into the extract directory. Token figures in file,
# composition and page tables are estimates: result characters / the
# calibrated characters per token in rates.json, split evenly across the
# files a call names; carry = that estimate x the agent's later turns.
# Exit: 0 ok, 1 usage or missing input.

set -uo pipefail
export LC_ALL=C

ROOT="$HOME/trade-imports-arch-workspace"
TOOL="$ROOT/.claude/tools/editorial-metrics"
LIB="$TOOL/lib"

usage() { sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'; }
die() { printf 'summarise: %s\n' "$1" >&2; exit "${2:-1}"; }

DIR=""; MANIFESTS=(); DOCRE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --manifest) MANIFESTS+=("$2"); shift 2 ;;
    --doc-pattern) DOCRE="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    -*) die "unknown argument: $1 (see --help)" ;;
    *) DIR="$1"; shift ;;
  esac
done
[[ -n "$DIR" && -f "$DIR/responses.jsonl" && -f "$DIR/calls.jsonl" ]] \
  || die "give an extract directory holding responses.jsonl and calls.jsonl (run extract-run.sh first)"

PAGES='[]'
for m in "${MANIFESTS[@]+"${MANIFESTS[@]}"}"; do
  [[ -f "$m" ]] || die "manifest not found: $m"
  PAGES=$(jq -c --argjson acc "$PAGES" '$acc + [.pages[].page] | unique' "$m")
done

TABLES=$(jq -n -c --slurpfile r "$DIR/responses.jsonl" --slurpfile c "$DIR/calls.jsonl" --slurpfile p "$DIR/prompts.jsonl" \
            '{responses: $r, calls: $c, prompts: $p}' \
  | jq -c -L "$LIB" --argjson prices "$(cat "$TOOL/rates.json")" --argjson pages "$PAGES" --arg docre "$DOCRE" \
       -f "$LIB/summarise.jq" 2>&1) \
  || die "summary failed: $TABLES"

csv() {  # $1 table key, $2 output file; an empty table writes an empty file
  jq -r --arg t "$1" '.[$t] | if length == 0 then empty else (.[0] | keys_unsorted) as $k | ($k | @csv), (.[] | [.[$k[]]] | @csv) end' <<< "$TABLES" > "$DIR/$2"
}
jq . <<< "$TABLES" > "$DIR/tables.json"
csv agents agents.csv
csv roles roles.csv
csv files file-visits.csv
csv pages page-visits.csv
csv composition context-composition.csv
csv misses cache-misses.csv
csv turns turns.csv
csv timeline timeline.csv

jq -r '"summarise: \(.agents | length) agents, \(.roles | length) role x model rows, \(.files | length) file rows, \(.pages | length) page rows; total cost $\(.roles | map(.cost_usd) | add * 100 | round / 100)"' <<< "$TABLES"
