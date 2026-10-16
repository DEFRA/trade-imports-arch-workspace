#!/usr/bin/env bash
# predict.sh - predicted page visits and minimum context per role, from the
# process model's formulas and the run's own parameters, set against what
# summarise.sh measured.
#
# Usage:
#   bash predict.sh <extract dir> --workarea <triage workarea> --model <process-model.json>
#
# Parameters come from the workarea: N and the pages from manifest.json, page
# size from the page files (characters / the calibrated characters per
# token in rates.json), clusters per page (C_p) from
# index.json, verification candidates (K_p) from findings.json, changed pages
# from closing/applied.json. U is the number of drill agents the run spawned;
# base_tokens is the median first-turn context of the run's agents (harness system prompt,
# tool definitions and spawn prompt). Reference tokens per role come from the model's
# .references[] (a "(section)" entry counts at its section_share).
# Writes predictions.json and predictions.csv (visits) and
# context-predictions.csv into the extract directory.
# Exit: 0 ok, 1 usage or missing input.

set -uo pipefail
export LC_ALL=C

ROOT="$HOME/trade-imports-arch-workspace"
TOOL="$ROOT/.claude/tools/editorial-metrics"

die() { printf 'predict: %s\n' "$1" >&2; exit "${2:-1}"; }

DIR=""; WA=""; MODEL=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --workarea) WA="$2"; shift 2 ;;
    --model) MODEL="$2"; shift 2 ;;
    -h|--help) sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    -*) die "unknown argument: $1 (see --help)" ;;
    *) DIR="$1"; shift ;;
  esac
done
[[ -f "$DIR/tables.json" ]] || die "no tables.json in '$DIR' (run summarise.sh first)"
[[ -f "$WA/manifest.json" && -f "$WA/index.json" && -f "$WA/findings.json" ]] || die "workarea '$WA' lacks manifest.json, index.json or findings.json"
[[ -f "$MODEL" ]] || die "process model not found: $MODEL"

CPT=$(jq -r '.context_chars_per_token // 4' "$TOOL/rates.json")
SIZES=$(jq -r '.pages[] | [.page, .path] | @tsv' "$WA/manifest.json" | while IFS=$'\t' read -r p f; do
          c=0; [[ -f "$f" ]] && c=$(wc -c < "$f" | tr -d ' ')
          printf '%s\t%s\n' "$p" "$(awk -v c="$c" -v r="$CPT" 'BEGIN { printf "%d", c / r }')"
        done | jq -R -s 'split("\n") | map(select(length > 0) | split("\t") | {(.[0]): (.[1] | tonumber)}) | add // {}')

REFS=$(bash "$TOOL/refs-inventory.sh" "$MODEL" | tail -n +2 | jq -R -s --slurpfile m "$MODEL" '
  ($m[0].references | map({key: .path, value: (.section_share // 1)}) | from_entries) as $share
  | split("\n") | map(select(length > 0) | capture("^\"(?<path>[^\"]*)\",[0-9]*,[0-9]*,[0-9]*,(?<tok>[0-9]*),\"(?<by>[^\"]*)\"$"))
  | map(. as $r | ($r.by | split("; "))[] | {role: (sub(" \\(section\\)$"; "")), tok: (($r.tok | tonumber? // 0) * (if test("\\(section\\)") then $share[$r.path] else 1 end))})
  | group_by(.role) | map({key: .[0].role, value: (map(.tok) | add | round)}) | from_entries')

APPLIED='[]'
[[ -f "$WA/closing/applied.json" ]] && APPLIED=$(jq -c '[.pages[] | select(.changed) | .page]' "$WA/closing/applied.json")

PARAMS=$(jq -n --slurpfile man "$WA/manifest.json" --slurpfile idx "$WA/index.json" --slurpfile fnd "$WA/findings.json" \
  --slurpfile tab "$DIR/tables.json" --argjson sizes "$SIZES" --argjson refs "$REFS" --argjson applied "$APPLIED" '
  ($man[0].pages | length) as $n
  | ($idx[0].pages | map({key: .page, value: (.clusters | length)}) | from_entries) as $c
  | ($fnd[0].records | map(select(.claimDiff.nominated == true)) | group_by(.page) | map({key: .[0].page, value: length}) | from_entries) as $k
  | {N: $n, S: (if $n == 1 then 1 else 0 end),
     U: ([$tab[0].agents[] | select(.role == "drill")] | length),
     base_tokens: ([$tab[0].agents[] | select(.agent != "main" and .first_context > 0) | .first_context] | sort | if length > 0 then .[length / 2 | floor] else 30000 end),
     refs: $refs,
     pages: [$man[0].pages[] | {page, tokens: ($sizes[.page] // 0), C: ($c[.page] // 0), K: ($k[.page] // 0), changed: (.page as $pg | $applied | index([$pg]) != null)}]}')

jq -n -L "$TOOL/lib" --argjson params "$PARAMS" --slurpfile tab "$DIR/tables.json" '{params: $params, tables: $tab[0]}' \
  | jq -f "$TOOL/lib/predict.jq" > "$DIR/predictions.json" || die "prediction failed"

jq -r '.visits | (.[0] | keys_unsorted) as $k | ($k | @csv), (.[] | [.[$k[]]] | @csv)' "$DIR/predictions.json" > "$DIR/predictions.csv"
jq -r '.context | (.[0] | keys_unsorted) as $k | ($k | @csv), (.[] | [.[$k[]]] | @csv)' "$DIR/predictions.json" > "$DIR/context-predictions.csv"
jq -r '"predict: \(.visits | length) page x role rows, \(.context | length) context rows (N=\(.params.N), U=\(.params.U), set \(.params.set_tokens) tokens)"' "$DIR/predictions.json"
