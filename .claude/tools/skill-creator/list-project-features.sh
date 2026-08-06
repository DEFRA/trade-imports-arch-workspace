#!/bin/bash
# List the feature surface of a workspace child project as FACT lines.
#
# Usage:
#   list-project-features.sh --project <name>
#
# Output (stdout):
#   STATUS: present | ABSENT
#   BIN: <name>      one per package.json .bin entry (the CLI contract)
#   NPM: <name>      one per package.json .scripts entry
#   LIB: <path>      per-project extras a bin/scripts listing cannot see
#
# Used by the CREATE interview (Q2 — dependencies) to compare a new
# skill's purpose against functionality that already exists. Reads
# package.json only — never README prose, which drifts. An absent
# project reports STATUS: ABSENT and exits 0 so the interview relays
# the absence instead of crashing.

set -e

PROJECT=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --project) PROJECT="$2"; shift 2 ;;
        -h|--help)
            sed -n '2,16p' "$0" >&2
            exit 0 ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done

[[ -z "$PROJECT" ]] && { echo "Missing --project" >&2; exit 1; }

# Kebab-case only, so the argument cannot escape the workspace root.
case "$PROJECT" in
    *[!a-z0-9-]*|-*|"")
        echo "Invalid project name (must match ^[a-z0-9-]+$): $PROJECT" >&2
        exit 1 ;;
esac

PROJECT_DIR="$HOME/trade-imports-arch-workspace/$PROJECT"

if [[ ! -d "$PROJECT_DIR" ]]; then
    echo "STATUS: ABSENT"
    echo "REASON: project not found at ~/trade-imports-arch-workspace/$PROJECT — clone it (make -C ~/trade-imports-arch-workspace clone) or assess overlap from knowledge"
    exit 0
fi

echo "STATUS: present"
echo "PROJECT: $PROJECT"

PKG="$PROJECT_DIR/package.json"
if [[ -f "$PKG" ]]; then
    jq -r '.bin // {} | keys[] | "BIN: " + .' "$PKG"
    jq -r '.scripts // {} | keys[] | "NPM: " + .' "$PKG"
else
    echo "NOTE: no package.json — no bin/npm surface to list"
fi

# Per-project extras: surface that generic package.json enumeration
# cannot see.
case "$PROJECT" in
    delivery-info-arch-tooling)
        # lib modules with no bin entry — consumers reach these only by
        # deep `node <path>` invocation. Globbed so new modules appear.
        for f in "$PROJECT_DIR"/lib/*/*.js; do
            [[ -e "$f" ]] || continue
            [[ "$(basename "$f")" == "index.js" ]] && continue
            echo "LIB: ${f#"$PROJECT_DIR"/}"
        done
        ;;
esac