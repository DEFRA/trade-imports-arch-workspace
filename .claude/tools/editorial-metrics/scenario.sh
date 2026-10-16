#!/usr/bin/env bash
# scenario.sh - reprice a measured run under "what if" changes: another
# model for a role, less for a role to read, a smaller starting context, fewer
# agents. First-order estimates from the run's own tokens; see
# lib/scenario.jq for the operations and their assumptions.
#
# Usage:
#   bash scenario.sh <extract dir> <scenarios.json>
#
# scenarios.json is {scenarios: [{name, note, ops: [...]}]}. Prices come from
# rates.json beside this script. Writes scenarios-result.json and
# scenarios.csv into the extract directory and prints one line per scenario.
# Exit: 0 ok, 1 usage or missing input.

set -uo pipefail
export LC_ALL=C

TOOL="$HOME/trade-imports-arch-workspace/.claude/tools/editorial-metrics"
die() { printf 'scenario: %s\n' "$1" >&2; exit "${2:-1}"; }
[[ "${1:-}" == "-h" || "${1:-}" == "--help" ]] && { sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'; exit 0; }
DIR="${1:-}"; SPEC="${2:-}"
[[ -f "$DIR/tables.json" ]] || die "no tables.json in '$DIR' (run summarise.sh first)"
[[ -f "$SPEC" ]] || die "scenario file not found: '$SPEC'"

jq -n --slurpfile t "$DIR/tables.json" --slurpfile r "$TOOL/rates.json" --slurpfile s "$SPEC" \
   '{tables: $t[0], rates: $r[0], scenarios: $s[0].scenarios}' \
  | jq -f "$TOOL/lib/scenario.jq" > "$DIR/scenarios-result.json" || die "scenario evaluation failed"

jq -r '["name","cost_usd","saving_usd","saving_pct","note"], (.scenarios[] | [.name, .cost_usd, .saving_usd, .saving_pct, .note]) | @csv' \
  "$DIR/scenarios-result.json" > "$DIR/scenarios.csv"
jq -r '"scenario: baseline $\(.baseline.cost_usd)", (.scenarios[] | "scenario: \(.name): $\(.cost_usd) (saves $\(.saving_usd), \(.saving_pct)%)")' "$DIR/scenarios-result.json"
