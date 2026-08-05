#!/usr/bin/env bash
# Auth doctor - verifies credentials for every service domain that ships one.
# Discovers tools/*/auth.sh and runs each, so a new domain joins the sweep by
# adding its own auth.sh; nothing to register here.
# Invoke with bash (no execute bit required):
#   bash ~/trade-imports-arch-workspace/.claude/tools/workspace/check-auth.sh
# Exit 1 when any service check fails (or none are found).

set -u

TOOLS="$HOME/trade-imports-arch-workspace/.claude/tools"

failed=0
found=0
for check in "$TOOLS"/*/auth.sh; do
    [ -f "$check" ] || continue
    found=1
    bash "$check" || failed=1
done

if [ "$found" -eq 0 ]; then
    echo "auth-check: FAIL no */auth.sh found under $TOOLS"
    exit 1
fi

if [ "$failed" -eq 0 ]; then
    echo "auth-check: ok all services authenticated"
else
    echo "auth-check: FAIL one or more services failed"
    exit 1
fi