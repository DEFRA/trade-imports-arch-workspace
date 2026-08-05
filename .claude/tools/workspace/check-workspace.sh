#!/usr/bin/env bash
# Workspace doctor - verifies the canonical-root contract on this machine.
# Invoke with bash (no execute bit required):
#   bash ~/trade-imports-arch-workspace/.claude/tools/workspace/check-workspace.sh
# Exit 1 only when the root itself is unusable; child gaps are warnings.

set -u

ROOT="$HOME/trade-imports-arch-workspace"

say() { echo "workspace-check: $1"; }

if [[ ! -e "$ROOT" ]]; then
    say "FAIL canonical root missing - set it up once: ln -s <your-checkout> ~/trade-imports-arch-workspace"
    exit 1
fi
if [[ ! -d "$ROOT/.claude" ]]; then
    say "FAIL $ROOT exists but has no .claude/ - is the symlink pointing at the right checkout?"
    exit 1
fi

WARN=0
for CHILD in trade-imports-documentation delivery-info-arch-tooling; do
    if [[ ! -d "$ROOT/$CHILD" ]]; then
        say "WARN child missing: $ROOT/$CHILD (the harness assumes it as a child of the root)"
        WARN=1
    fi
done

KIND="directory"
[[ -L "$ROOT" ]] && KIND="symlink -> $(readlink "$ROOT")"
say "ok root=$ROOT ($KIND)"
[[ "$WARN" -eq 0 ]] && say "ok both child repos present"
exit 0
