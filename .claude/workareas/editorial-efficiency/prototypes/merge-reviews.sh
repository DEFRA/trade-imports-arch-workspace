#!/usr/bin/env bash
# merge-reviews.sh - assemble a version 3 review result from the forked
# passes of one or more package runs (drill-*.json, structural-*.json,
# editor.json under runs/<source>/review/), pointed at a target run's pages.
# With several sources, drill units are tagged with their source run, and
# the build clusters findings that two runs share.
#
# Usage: bash merge-reviews.sh <target run> <source run>...
# Writes runs/<target run>/review-result.json and prints its counts.

set -uo pipefail
E="$HOME/trade-imports-arch-workspace/analysis/editorial-efficiency/experiments"
TARGET="${1:?target run}"; shift
[[ $# -ge 1 ]] || { echo "merge-reviews: give at least one source run" >&2; exit 1; }
P="~/trade-imports-arch-workspace/analysis/editorial-efficiency/experiments/runs/$TARGET/pages/"
TAGGED=$#
{
  for s in "$@"; do
    tag=""
    if [[ $TAGGED -gt 1 ]]; then tag=" ($s)"; fi
    for f in "$E/runs/$s"/review/*.json; do
      kind=$(basename "$f" .json | sed 's/-.*//')
      jq -c --arg k "$kind" --arg t "$tag" '{kind: $k, d: (. + {tag: $t})}' "$f"
    done
  done
} | jq -s --arg p "$P" '{version: 3, mode: "revise", intent: "clarify",
   sourceHashes: {"02a-ins-auth-session-service-design.md": "caf1ba9598e84ce52886ae34b7efb946705d4f8efc8ff99a659918c46a53ffec", "02b-ins-auth-session-record.md": "0dda9ac1bbdb79c686102f480e9e9333fd4cb6ca773c2ad69482930c38d0a91c", "02c-ins-auth-session-api.md": "b3a16a3bfc08645f697dad362cdac4f92fe821dc0733e48f5f1f5119626ac99e"},
   units: [.[] | select(.kind == "drill") | .d | {unit: (.unit + .tag), path: ($p + .unit), findings, retains: (.retains // [])}],
   structural: {findings: ([.[] | select(.kind == "structural") | .d.findings] | add), redundancies: ([.[] | select(.kind == "structural") | .d.redundancies // []] | add), pages: 3},
   editorPass: ([.[] | select(.kind == "editor") | .d] | {pages: (map(.pages) | add), order: (map(.order // []) | add), patterns: (map(.patterns // []) | add)})}' \
  > "$E/runs/$TARGET/review-result.json"
jq -c --arg t "$TARGET" '{run: $t, units: (.units | length), drill: ([.units[].findings[]] | length), structural: (.structural.findings | length), editor_pages: (.editorPass.pages | length)}' "$E/runs/$TARGET/review-result.json"
