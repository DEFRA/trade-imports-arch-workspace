#!/usr/bin/env bash
# run-metrics.sh - one experiment run's metrics: cost, effort, speed, waste,
# output volume and closing quality, from the run's summarised extract and
# its triage workarea. Every value is a number, so runs compare field by
# field with compare-runs.sh.
#
# Usage:
#   bash run-metrics.sh <extract dir> <triage workarea> [--exclude <role regex>]
#
# --exclude leaves roles out of the totals and reports their cost apart
# (default '^main$': the orchestrating session, which may carry other work).
# Writes metrics.json into the extract directory and prints it.
# Exit: 0 ok, 1 usage or missing input.

set -uo pipefail
export LC_ALL=C

TOOL="$HOME/trade-imports-arch-workspace/.claude/tools/editorial-metrics"
die() { printf 'run-metrics: %s\n' "$1" >&2; exit "${2:-1}"; }

DIR=""; WA=""; EXCLUDE='^main$'
while [[ $# -gt 0 ]]; do
  case "$1" in
    --exclude) EXCLUDE="$2"; shift 2 ;;
    -h|--help) sed -n '2,14p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    -*) die "unknown argument: $1 (see --help)" ;;
    *) if [[ -z "$DIR" ]]; then DIR="$1"; else WA="$1"; fi; shift ;;
  esac
done
[[ -f "$DIR/tables.json" && -f "$DIR/calls.jsonl" ]] || die "no tables.json and calls.jsonl in '$DIR' (run extract-run.sh and summarise.sh first)"
[[ -f "$WA/manifest.json" && -f "$WA/findings.json" && -f "$WA/triage.json" ]] || die "workarea '$WA' lacks manifest.json, findings.json or triage.json"

GRADES='[]'
if compgen -G "$WA/calibration/grades/*.json" > /dev/null; then
  GRADES=$(jq -s -c '[.[] | .items[]?]' "$WA"/calibration/grades/*.json)
fi
PLAN='{}'; [[ -f "$WA/closing/plan.json" ]] && PLAN=$(cat "$WA/closing/plan.json")
APPLIED='{}'; [[ -f "$WA/closing/applied.json" ]] && APPLIED=$(cat "$WA/closing/applied.json")

jq -n --slurpfile t "$DIR/tables.json" --slurpfile c "$DIR/calls.jsonl" --slurpfile m "$WA/manifest.json" \
   --slurpfile f "$WA/findings.json" --slurpfile tr "$WA/triage.json" --argjson g "$GRADES" \
   --argjson p "$PLAN" --argjson a "$APPLIED" --arg ex "$EXCLUDE" \
   '{tables: $t[0], calls: $c, manifest: $m[0], findings: $f[0], triage: $tr[0], grades: $g, plan: $p, applied: $a, exclude: $ex}' \
  | jq -f "$TOOL/lib/run-metrics.jq" > "$DIR/metrics.json" || die "metrics failed"
cat "$DIR/metrics.json"
