#!/bin/bash
# Atomically write one interview answer into decisions.json.
#
# Usage:
#   interview-add-answer.sh --run-id <name> --field <dotted-path> --value '<json>'
#
# Examples:
#   --field purpose --value '"Scaffold workspace skills end-to-end."'
#   --field state_shape --value '"json"'
#   --field dispatcher --value 'true'
#   --field fanout.enabled --value 'true'
#   --field fanout.workers --value '["AUDITOR"]'
#   --field triggers.phrases --value '["scaffold skill","skill-create"]'
#
# Value is parsed as JSON — quote strings, leave booleans/arrays bare.
# Mutation is atomic (jq -> tmp -> mv).

set -e

RUN_ID=""
FIELD=""
VALUE=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --run-id) RUN_ID="$2"; shift 2 ;;
        --field) FIELD="$2"; shift 2 ;;
        --value) VALUE="$2"; shift 2 ;;
        -h|--help)
            sed -n '2,16p' "$0" >&2
            exit 0 ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done

for v in RUN_ID FIELD VALUE; do
    [[ -z "${!v}" ]] && { echo "Missing $v" >&2; exit 1; }
done

case "$RUN_ID" in
    *[!a-z0-9-]*|-*|"")
        echo "Invalid run-id (must match ^[a-z0-9-]+$): $RUN_ID" >&2
        exit 1 ;;
esac

target="$HOME/trade-imports-arch-workspace/.claude/workareas/skill-creator/$RUN_ID/decisions.json"
[[ -f "$target" ]] || { echo "No decisions.json at $target — run start-skill-creator.sh first" >&2; exit 1; }

# Canonicalise the value first (also fails fast on invalid JSON) so
# whitespace-padded forms like ' true' can't slip past the guards.
CANON=$(jq -nc --argjson v "$VALUE" '$v' 2>/dev/null) || {
    echo "Invalid JSON value: $VALUE" >&2
    exit 1
}
VALUE="$CANON"

# Cross-field guard, BOTH directions: walker=true on prose state is
# anti-pattern A1 (walker on a single-artifact flow) — the one
# cross-field rule interview-schema.md documents this helper enforcing.
# Order-independent: the recap-edit flow can re-answer either field.
if [[ "$FIELD" == "walker" && "$VALUE" == "true" ]]; then
    state_shape=$(jq -r '.answers.state_shape // ""' "$target")
    if [[ "$state_shape" == "prose" ]]; then
        echo "Refused: walker=true with state_shape=prose is anti-pattern A1. Re-answer the state-shape question first if the shape is wrong." >&2
        exit 1
    fi
fi
if [[ "$FIELD" == "state_shape" && "$VALUE" == '"prose"' ]]; then
    walker=$(jq -r '.answers.walker // false' "$target")
    if [[ "$walker" == "true" ]]; then
        echo "Refused: state_shape=prose while walker=true is anti-pattern A1. Re-answer the walker question first." >&2
        exit 1
    fi
fi

# Field paths are built into a jq program by concatenation — keep the
# segments to a safe charset so a stray quote can't mangle it.
IFS='.' read -r -a segcheck <<<"$FIELD"
for seg in "${segcheck[@]}"; do
    if ! [[ "$seg" =~ ^[a-zA-Z_][a-zA-Z0-9_-]*$ ]]; then
        echo "Invalid field segment: $seg (allowed: ^[a-zA-Z_][a-zA-Z0-9_-]*$)" >&2
        exit 1
    fi
done

# Build the jq path expression from a dotted field (e.g. fanout.enabled
# -> .answers.fanout.enabled). Each segment becomes a quoted key.
IFS='.' read -r -a parts <<<"$FIELD"
path=".answers"
for p in "${parts[@]}"; do
    path="$path[\"$p\"]"
done

if ! jq -e --argjson v "$VALUE" "$path = \$v" "$target" > "$target.tmp"; then
    rm -f "$target.tmp"
    echo "jq failed — invalid JSON value? VALUE=$VALUE" >&2
    exit 1
fi
mv "$target.tmp" "$target"
