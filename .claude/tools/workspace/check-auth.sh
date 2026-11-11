#!/usr/bin/env bash
# Auth doctor - verifies credentials for every service.
# Runs `hedy auth` (Jira and Confluence) first. The tools/*/auth.sh loop is a
# compatibility path for a service hedy does not cover; a new Atlassian check
# belongs in hedy, not in a new auth.sh.
# Invoke with bash (no execute bit required):
#   bash ~/trade-imports-arch-workspace/.claude/tools/workspace/check-auth.sh
# Exit 1 when hedy is missing or any service check fails.

set -u

TOOLS="$HOME/trade-imports-arch-workspace/.claude/tools"

if ! command -v hedy >/dev/null 2>&1; then
    echo "auth-check: FAIL hedy CLI not on PATH (run: make -C ~/trade-imports-arch-workspace link)"
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
