#!/usr/bin/env bash
# finish-run.sh - measure one experiment run: extract its transcripts from
# the run's start time, keep the workflow agents of its review and the
# subagents whose names end in the run id, summarise, and write metrics.json.
#
# Usage: bash finish-run.sh <run id> <session id> [--workflow <wf id>]...
#
# Subagents of a run are named <role>-<page key>-<run id> (for example
# verify-02b-B0a), so the run's agents are selected by that suffix. Set
# AGENTS_RE to select agents another way (forks are named by description).

set -uo pipefail
E="$HOME/trade-imports-arch-workspace/analysis/editorial-efficiency/experiments"
T="$HOME/trade-imports-arch-workspace/.claude/tools/editorial-metrics"
RUN="${1:?run id}"; SESSION="${2:?session id}"; shift 2
D="$E/runs/$RUN"
[[ -f "$D/run.json" ]] || { echo "finish-run: no run.json in $D" >&2; exit 1; }
SINCE=$(jq -r .started "$D/run.json")
WA="$HOME/trade-imports-arch-workspace/.claude/workareas/editorial-triage/exp-$RUN"
WF=()
while [[ $# -gt 0 ]]; do case "$1" in --workflow) WF+=(--workflow "$2"); shift 2 ;; *) echo "finish-run: unknown argument $1" >&2; exit 1 ;; esac; done
bash "$T/extract-run.sh" --session "$SESSION" --since "$SINCE" --agents "${AGENTS_RE:--$RUN\$}" --out "$D/extract" "${WF[@]+"${WF[@]}"}" || exit 1
bash "$T/summarise.sh" "$D/extract" --manifest "$WA/manifest.json" --doc-pattern '^0[0-9][a-d]?-ins-auth.*\.md$' || exit 1
bash "$T/run-metrics.sh" "$D/extract" "$WA" > /dev/null || exit 1
jq -c '{cost: .cost.total, review: .cost.review, triage: .cost.triage, agents: .effort.agents, turns: .effort.turns, records: .output.records, clusters: .output.clusters, fixes: (.closing.remove + .closing.correct + .closing.reword), ignore_rate: .closing.ignore_rate, h29: .closing.h29_ignores, applied: .closing.applied}' "$D/extract/metrics.json"
