#!/usr/bin/env bash
# extract-run.sh - turn Claude Code transcripts of an editorial review or
# triage run into per-response and per-tool-call records, so token spend and
# file visits can be counted by role, model and phase.
#
# Usage:
#   bash extract-run.sh --session <id> --out <dir> [--workflow <wf_id>]...
#        [--since <iso>] [--until <iso>] [--agents <regex>] [--no-subagents]
#        [--projects-root <dir>]
#
# --session names the main transcript; it is found as
# <projects-root>/*/<id>.jsonl (default root ~/.claude/projects). Its
# subagents/*.jsonl are included unless --no-subagents; --agents keeps only
# subagents whose label matches the regex. Each --workflow adds that run's
# agents from subagents/workflows/<wf_id>/. --since/--until (ISO timestamps)
# bound the main transcript's lines and keep only subagents that started in
# the window, for sessions that mix the run with other work.
# Writes into --out: responses.jsonl (one row per unique API response),
# calls.jsonl (one row per tool call, with access kind, targets, result size
# and the turns the result is carried for), prompts.jsonl (timestamps of the
# user's own prompts in the main transcript) and source.json (what was read).
# Exit: 0 ok, 1 usage or missing input.

set -uo pipefail
export LC_ALL=C

ROOT="$HOME/trade-imports-arch-workspace"
LIB="$ROOT/.claude/tools/editorial-metrics/lib"

usage() { sed -n '2,24p' "$0" | sed 's/^# \{0,1\}//'; }
die() { printf 'extract-run: %s\n' "$1" >&2; exit "${2:-1}"; }
say() { printf 'extract-run: %s\n' "$1"; }

SESSION=""; OUT=""; SINCE=""; UNTIL=""; AGENTS=""; SUBAGENTS=true
PROJECTS="$HOME/.claude/projects"; WORKFLOWS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --session) SESSION="$2"; shift 2 ;;
    --out) OUT="$2"; shift 2 ;;
    --workflow) WORKFLOWS+=("$2"); shift 2 ;;
    --since) SINCE="$2"; shift 2 ;;
    --until) UNTIL="$2"; shift 2 ;;
    --agents) AGENTS="$2"; shift 2 ;;
    --no-subagents) SUBAGENTS=false; shift ;;
    --projects-root) PROJECTS="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) die "unknown argument: $1 (see --help)" ;;
  esac
done

command -v jq >/dev/null 2>&1 || die "jq is required (baseline tool); install jq and re-run"
[[ -n "$SESSION" && -n "$OUT" ]] || die "--session and --out are required (see --help)"

MAIN=""
for f in "$PROJECTS"/*/"$SESSION".jsonl; do [[ -f "$f" ]] && MAIN="$f"; done
[[ -n "$MAIN" ]] || die "no transcript $SESSION.jsonl under $PROJECTS/*/ (check the session id)"
SDIR="${MAIN%.jsonl}"

mkdir -p "$OUT"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

first_ts() { jq -R -r 'fromjson? | .timestamp // empty' "$1" 2>/dev/null | head -n 1; }

extract() {  # $1 transcript, $2 agent id, $3 label, $4 phase, $5 since, $6 until
  jq -n -R -c -L "$LIB" --arg agent "$2" --arg label "$3" --arg phase "$4" \
     --arg since "$5" --arg until "$6" -f "$LIB/extract.jq" < "$1" > "$TMP/$2.json" \
    || die "jq failed on $1"
}

extract "$MAIN" main main "" "$SINCE" "$UNTIL"
N_SUB=0; N_WF=0

if $SUBAGENTS; then
  for f in "$SDIR"/subagents/agent-*.jsonl; do
    [[ -f "$f" ]] || continue
    meta="${f%.jsonl}.meta.json"
    id=$(basename "$f" .jsonl); id=${id#agent-}
    label=$(jq -r '.name // .description // .agentType // "agent"' "$meta" 2>/dev/null || echo agent)
    [[ -n "$AGENTS" ]] && ! printf '%s' "$label" | grep -Eq -- "$AGENTS" && continue
    start=$(first_ts "$f")
    [[ -n "$SINCE" && "$start" < "$SINCE" ]] && continue
    [[ -n "$UNTIL" && "$start" > "$UNTIL" ]] && continue
    kind=$(jq -r 'if .isFork then "fork" else "triage" end' "$meta" 2>/dev/null || echo triage)
    extract "$f" "$id" "$label" "$kind" "" ""
    N_SUB=$((N_SUB+1))
  done
fi

for wf in "${WORKFLOWS[@]+"${WORKFLOWS[@]}"}"; do
  d="$SDIR/subagents/workflows/$wf"
  [[ -d "$d" ]] || die "no workflow agents under $d (check the run id and session)"
  for f in "$d"/agent-*.jsonl; do
    [[ -f "$f" ]] || continue
    meta="${f%.jsonl}.meta.json"
    id=$(basename "$f" .jsonl); id=${id#agent-}
    label=$(jq -r '.description // "agent"' "$meta" 2>/dev/null || echo agent)
    phase=$(jq -r '.workflowPhase // "Review"' "$meta" 2>/dev/null || echo Review)
    extract "$f" "$id" "$label" "review:$phase" "" ""
    N_WF=$((N_WF+1))
  done
done

# Merge, then give the main transcript's rows a phase from marker calls.
jq -s -c -L "$LIB" -f "$LIB/phases.jq" "$TMP"/*.json > "$TMP/merged.json" || die "phase assignment failed"
jq -c '.responses[]' "$TMP/merged.json" > "$OUT/responses.jsonl"
jq -c '.calls[]' "$TMP/merged.json" > "$OUT/calls.jsonl"
jq -c '.prompts[]' "$TMP/merged.json" > "$OUT/prompts.jsonl"
jq -n --arg session "$SESSION" --arg since "$SINCE" --arg until "$UNTIL" --arg agents "$AGENTS" \
   --argjson subagents "$N_SUB" --argjson workflowAgents "$N_WF" \
   --args '{session: $session, workflows: $ARGS.positional, since: $since, until: $until, agentFilter: $agents, subagents: $subagents, workflowAgents: $workflowAgents}' \
   "${WORKFLOWS[@]+"${WORKFLOWS[@]}"}" > "$OUT/source.json"

say "$(wc -l < "$OUT/responses.jsonl" | tr -d ' ') responses, $(wc -l < "$OUT/calls.jsonl" | tr -d ' ') calls from main + $N_SUB subagents + $N_WF workflow agents -> $OUT"
