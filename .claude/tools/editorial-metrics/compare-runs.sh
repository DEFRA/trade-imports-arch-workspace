#!/usr/bin/env bash
# compare-runs.sh - compare experiment arms with a baseline, metric by metric,
# against the noise band two baseline runs give, plus agreement on fixes.
#
# Usage:
#   bash compare-runs.sh --base <label>=<extract dir>:<workarea> [--base ...]
#                        --arm <label>=<extract dir>:<workarea> [--arm ...]
#                        [--out <compare.json>]
#
# Each run needs metrics.json (run-metrics.sh) in its extract dir. With two
# or more base runs, the noise band of a metric is the spread between them,
# and an arm's difference counts as a result only beyond that band.
# Recall: the share of a base run's fixes (clusters graded R, C or W) that
# the arm also fixes on the same page and span (anchor line within 2, or a
# 30-character run of the normalised quote in common); the base runs against
# each other give recall's own noise floor. Extra: the arm's fixes with no
# base match. Prints a table; --out writes the comparison as JSON.
# Exit: 0 ok, 1 usage or missing input.

set -uo pipefail
export LC_ALL=C

die() { printf 'compare-runs: %s\n' "$1" >&2; exit "${2:-1}"; }
BASES=(); ARMS=(); OUT=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --base) BASES+=("$2"); shift 2 ;;
    --arm) ARMS+=("$2"); shift 2 ;;
    --out) OUT="$2"; shift 2 ;;
    -h|--help) sed -n '2,19p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) die "unknown argument: $1 (see --help)" ;;
  esac
done
[[ ${#BASES[@]} -ge 1 && ${#ARMS[@]} -ge 1 ]] || die "give at least one --base and one --arm"

run_json() {  # $1 label=dir:workarea, $2 kind -> one JSON object with metrics and fixes
  local label="${1%%=*}" rest="${1#*=}"
  local dir="${rest%%:*}" wa="${rest#*:}"
  [[ -f "$dir/metrics.json" ]] || die "no metrics.json in $dir (run run-metrics.sh)"
  [[ -f "$wa/findings.json" ]] || die "no findings.json in $wa"
  local grades='[]'
  compgen -G "$wa/calibration/grades/*.json" > /dev/null && grades=$(jq -s -c '[.[] | .items[]?]' "$wa"/calibration/grades/*.json)
  jq -n -c --arg label "$label" --arg kind "$2" --slurpfile m "$dir/metrics.json" --slurpfile f "$wa/findings.json" \
     --slurpfile t "$wa/triage.json" --argjson g "$grades" '
    def norm: ascii_downcase | gsub("[^a-z0-9 ]"; "") | gsub(" +"; " ");
    ($f[0].records | map({key: .id, value: .}) | from_entries) as $R
    | ($g | map({key: .cluster, value: .move}) | from_entries) as $M
    | {label: $label, kind: $kind, metrics: $m[0],
       fixes: [$t[0].clusters[] | select($M[.id] | IN("R", "C", "W")) | $R[(.chosen // .members[0])] as $r
               | {page: $r.page, line: (($r.anchorLine // $r.line // 0) | tonumber? // 0), q: (($r.quote // "") | norm), move: $M[.id]}]}'
}

ALL=$( { for b in "${BASES[@]}"; do run_json "$b" base; done; for a in "${ARMS[@]}"; do run_json "$a" arm; done; } | jq -s -c . )

RESULT=$(jq -c '
  def leaves: [paths(numbers) | map(tostring) | join(".")];
  def get($p): getpath($p | split("."));
  def match($a; $b): $a.page == $b.page and (((($a.line - $b.line) | fabs) <= 2 and $a.line > 0)
      or ($a.q | length >= 30 and ($b.q | contains($a.q[0:30])))
      or ($b.q | length >= 30 and ($a.q | contains($b.q[0:30]))));
  def recall($base; $arm): if ($base.fixes | length) == 0 then null
      else ([$base.fixes[] | . as $x | select(any($arm.fixes[]; match($x; .)))] | length) / ($base.fixes | length) | . * 100 | round / 100 end;
  def extra($base; $arm): [$arm.fixes[] | . as $x | select(any($base.fixes[]; match(.; $x)) | not)] | length;
  map(select(.kind == "base")) as $B | map(select(.kind == "arm")) as $A
  | ($B[0].metrics | leaves) as $keys
  | {bases: ($B | map(.label)), arms: ($A | map(.label)),
     recall_noise: (if ($B | length) > 1 then recall($B[0]; $B[1]) else null end),
     metrics: [$keys[] as $k
       | ($B | map(.metrics | get($k) // 0)) as $bv
       | ($bv | add / length) as $mean
       | (if ($bv | length) > 1 then (($bv | max) - ($bv | min)) else null end) as $band
       | {metric: $k, base_mean: ($mean * 100 | round / 100), noise: (if $band == null then null else ($band * 100 | round / 100) end),
          arms: [$A[] | (.metrics | get($k) // 0) as $v
                 | {label, value: $v, delta_pct: (if $mean != 0 then (($v - $mean) / $mean * 100 | round) else null end),
                    beyond_noise: (if $band == null then null else ((($v - $mean) | fabs) > $band) end)}]}],
     agreement: [$A[] as $a | {label: $a.label,
        recall: ([$B[] | recall(.; $a)] | map(select(. != null)) | if length > 0 then add / length | . * 100 | round / 100 else null end),
        extra_fixes: ([$B[] | extra(.; $a)] | if length > 0 then add / length | round else null end),
        fixes: ($a.fixes | length)}],
     base_fixes: ($B | map({label, fixes: (.fixes | length)}))}' <<< "$ALL") || die "comparison failed"

[[ -n "$OUT" ]] && jq . <<< "$RESULT" > "$OUT"
jq -r '
  "metric\tbase\tnoise\t" + (.arms | join("\t")),
  (.metrics[] | "\(.metric)\t\(.base_mean)\t\(.noise // "-")\t" + (.arms | map("\(.value) (\(if .delta_pct == null then "-" else "\(.delta_pct)%" end)\(if .beyond_noise == true then " *" else "" end))") | join("\t"))),
  "",
  "base fixes: " + (.base_fixes | map("\(.label)=\(.fixes)") | join(" ")) + "; recall between base runs (noise floor): \(.recall_noise // "-")",
  (.agreement[] | "\(.label): fixes \(.fixes), recall of base fixes \(.recall // "-"), extra fixes \(.extra_fixes // "-")")' <<< "$RESULT"
