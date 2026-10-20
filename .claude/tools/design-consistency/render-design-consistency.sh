#!/bin/bash
# render-design-consistency.sh - turn the checker's contradictions.json into
# questions.md: one entry per contradiction, most severe first, with the
# conflicting quotes and their page lines and the question that settles it.
# Boundary: reads the checker's file and the register only; it never edits a
# page and records no ruling (the author's answers belong to the work's own
# records).
#
# Usage:
#   render-design-consistency.sh --run-id <id>
#
# Atomic mutations: write to .tmp then mv.

set -e
export LC_ALL=C

RUN_ID=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        --run-id) RUN_ID="$2"; shift 2 ;;
        -h|--help) sed -n '2,12p' "$0" >&2; exit 0 ;;
        *) echo "render-design-consistency: unknown argument $1 (see --help)" >&2; exit 1 ;;
    esac
done
[[ -z "$RUN_ID" ]] && { echo "render-design-consistency: give --run-id <id>" >&2; exit 1; }

DIR="$HOME/trade-imports-arch-workspace/.claude/workareas/design-consistency/$RUN_ID"
C="$DIR/contradictions.json"
[[ -f "$C" ]] || { echo "render-design-consistency: no contradictions.json in ${DIR/#$HOME/~}; run the CONSISTENCY_CHECKER first" >&2; exit 1; }
jq -e 'type == "array"' "$C" > /dev/null || { echo "render-design-consistency: contradictions.json is not a JSON array; re-run the checker" >&2; exit 1; }

UNCITED=$(jq -r --slurpfile r "$DIR/register.json" '($r[0] | map(.id)) as $ids | [.[] | select(([.facts[]?.id] | map(select(. as $i | $ids | index($i))) | length) < 2) | .id] | join(" ")' "$C")

jq -r --arg run "$RUN_ID" --arg uncited "$UNCITED" '
  def rank: {"S1": 1, "S2": 2, "S3": 3}[.severity] // 9;
  sort_by(rank, .id) as $all
  | ["# Design Consistency: \($run)", "",
     "\($all | length) contradictions: S1 \([$all[] | select(.severity == "S1")] | length), S2 \([$all[] | select(.severity == "S2")] | length), S3 \([$all[] | select(.severity == "S3")] | length). S1: a builder following one page builds what another forbids. S2: a builder or tester cannot tell which statement holds. S3: a minor or local inconsistency."]
    + (if $uncited == "" then [] else ["", "Cites fewer than two register facts, so check before acting: \($uncited)."] end)
    + ($all | map(
        ["", "## \(.id) \(.severity)", "", .summary, ""]
        + ([.facts[]? | "- \(.page):\(.line) \"\(.quote)\""] | unique)
        + ["", "Question: \(.question)"]) | add // [])
  | join("\n")' "$C" > "$DIR/questions.md.tmp"
mv "$DIR/questions.md.tmp" "$DIR/questions.md"

jq -r --arg d "${DIR/#$HOME/~}" '"render-design-consistency: \(length) contradictions (S1 \(map(select(.severity == "S1")) | length), S2 \(map(select(.severity == "S2")) | length), S3 \(map(select(.severity == "S3")) | length)); wrote \($d)/questions.md"' "$C"
[[ -z "$UNCITED" ]] || echo "render-design-consistency: cites fewer than two register facts: $UNCITED"
