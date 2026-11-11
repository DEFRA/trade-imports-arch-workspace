#!/usr/bin/env bash
# Auth doctor - verifies credentials for every service.
# Runs `hedy auth` (Jira and Confluence) first. The tools/*/auth.sh loop is a
# compatibility path for a service hedy does not cover; a new Atlassian check
# belongs in hedy, not in a new auth.sh.
# Invoke with bash from the workspace root (no execute bit required):
#   bash .claude/tools/workspace/check-auth.sh
# Exit 1 when hedy is missing or any service check fails.

set -u

TOOLS="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
ROOT="$(cd "$TOOLS/../.." && pwd -P)"

if ! command -v hedy >/dev/null 2>&1; then
    echo "auth-check: FAIL hedy CLI not on PATH (run: make -C $ROOT install)"
    echo "auth-check: FAIL one or more services failed"
    exit 1
fi

failed=0
hedy auth || failed=1

for check in "$TOOLS"/*/auth.sh; do
    [ -f "$check" ] || continue
    bash "$check" || failed=1
done

if [ "$failed" -eq 0 ]; then
    echo "auth-check: ok all services authenticated"
else
    echo "auth-check: FAIL one or more services failed"
    exit 1
fi
