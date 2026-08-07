#!/bin/bash
# TODO — one-line purpose of this helper.
# Boundary (only if this helper has a sibling) — TODO: when to use this vs that sibling.
#
# Usage:
#   render-test-plain.sh --run-id <id> [TODO other flags]
#
# Atomic mutations: write to .tmp then mv.
# Solve, don't defer: handle missing prerequisites with a specific
# remedy in the error message, never a raw failure.

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
echo "TODO: render-test-plain.sh not yet implemented" >&2
exit 1
