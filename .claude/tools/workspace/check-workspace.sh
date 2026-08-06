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

# Child list comes from the Makefile's CHILDREN line - the single
# source of truth (a second hardcoded list here is how the previous
# two-vs-three drift happened). Fallback with a WARN if the parse
# comes back empty.
CHILDREN=$(awk -F':=' '/^CHILDREN[[:space:]]*:?=/{print $2}' "$ROOT/Makefile" 2>/dev/null)
if [[ -z "${CHILDREN// /}" ]]; then
    say "WARN could not parse CHILDREN from $ROOT/Makefile - using fallback list"
    CHILDREN="trade-imports-documentation delivery-info-arch-tooling trade-imports-schemas"
    WARN=1
fi

COUNT=0
for CHILD in $CHILDREN; do
    COUNT=$((COUNT+1))
    if [[ ! -d "$ROOT/$CHILD" ]]; then
        say "WARN child missing: $ROOT/$CHILD (the harness assumes it as a child of the root)"
        WARN=1
    fi
done

# Workspace baseline tools - skills assume these and never declare
# them (agent-skills.md -> "Dependencies frontmatter"); per-skill
# extras are check-deps.sh's job.
for TOOL in bash curl jq git; do
    if ! command -v "$TOOL" >/dev/null 2>&1; then
        say "WARN baseline tool missing: $TOOL (install it - every tool script assumes the baseline)"
        WARN=1
    fi
done

KIND="directory"
[[ -L "$ROOT" ]] && KIND="symlink -> $(readlink "$ROOT")"
say "ok root=$ROOT ($KIND)"
[[ "$WARN" -eq 0 ]] && say "ok all child repos present ($COUNT) and baseline tools available"
exit 0
