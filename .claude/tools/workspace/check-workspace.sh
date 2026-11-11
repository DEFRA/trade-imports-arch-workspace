#!/usr/bin/env bash
# Workspace doctor - verifies that this checkout is ready to use.
# The root is the checkout this script sits in, wherever it was cloned.
# Invoke with bash from the workspace root (no execute bit required):
#   bash .claude/tools/workspace/check-workspace.sh
# Exit 1 only when the root itself is unusable; child gaps are warnings.

set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd -P)"

say() { echo "workspace-check: $1"; }

if [[ ! -f "$ROOT/Makefile" ]]; then
    say "FAIL $ROOT has no Makefile - this script must run from inside a workspace checkout"
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
        say "WARN child missing: $ROOT/$CHILD (run: make -C $ROOT clone)"
        WARN=1
    fi
done

# Pre-commit enforcement only exists once core.hooksPath points at
# .githooks - a bare clone that never ran `make install` has none.
HOOKSPATH=$(git -C "$ROOT" config core.hooksPath 2>/dev/null)
if [[ "$HOOKSPATH" != ".githooks" ]]; then
    say "WARN core.hooksPath not set to .githooks - the pre-commit skills lint is not active (run: make -C $ROOT install)"
    WARN=1
fi

# Workspace baseline tools - skills assume these and never declare
# them (agent-skills.md -> "Dependencies frontmatter"); per-skill
# extras are check-deps.sh's job.
for TOOL in bash curl jq git; do
    if ! command -v "$TOOL" >/dev/null 2>&1; then
        say "WARN baseline tool missing: $TOOL (install it - every tool script assumes the baseline)"
        WARN=1
    fi
done

# The hedy CLI reaches PATH through make install (npm link in hedy/).
if ! command -v hedy >/dev/null 2>&1; then
    say "WARN hedy CLI not on PATH (run: make -C $ROOT install)"
    WARN=1
fi

say "ok root=$ROOT"
[[ "$WARN" -eq 0 ]] && say "ok all child repos present ($COUNT) and baseline tools available"
exit 0
