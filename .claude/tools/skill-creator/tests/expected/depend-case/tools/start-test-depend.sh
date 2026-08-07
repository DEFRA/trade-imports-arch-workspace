#!/bin/bash
# TODO — one-line purpose of this helper.
# Boundary (only if this helper has a sibling) — TODO: when to use this vs that sibling.
#
# Usage:
#   start-test-depend.sh --run-id <id> [TODO other flags]
#
# Atomic mutations: write to .tmp then mv.
# Solve, don't defer: handle missing prerequisites with a specific
# remedy in the error message, never a raw failure.

# TODO pattern 9 — pre-flight each declared dependency before real work:
#   projects: [[ -d $HOME/trade-imports-arch-workspace/<project> ]]
#   tools:    command -v <tool>
# On failure print MODE: BLOCKED plus REASON: <remedy> (model:
# tools/confluence-publish/start-confluence-publish.sh).

set -e

RUN_ID=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --run-id) RUN_ID="$2"; shift 2 ;;
        -h|--help)
            sed -n '2,10p' "$0" >&2
            exit 0 ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done

[[ -z "$RUN_ID" ]] && { echo "Missing --run-id" >&2; exit 1; }

# TODO — implement.
echo "TODO: start-test-depend.sh not yet implemented" >&2
exit 1
