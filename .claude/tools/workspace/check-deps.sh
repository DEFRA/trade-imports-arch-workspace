#!/usr/bin/env bash
# Dependency doctor - verifies every skill's declared dependencies
# resolve on this machine.
# Invoke with bash (no execute bit required):
#   bash ~/trade-imports-arch-workspace/.claude/tools/workspace/check-deps.sh
#
# Skills declare unbundled needs in SKILL.md frontmatter as
#   metadata:
#     dependencies: <token> <token>
# (format contract: .claude/best-practices/skills/agent-skills.md ->
# "Dependencies frontmatter"). Per token: a directory name under the
# workspace root is a child project (remedy: clone); anything else is
# a command checked with `command -v` (remedy: install). The ok output
# doubles as the estate report of which skills are not self-contained.
# Exit 1 on any failure or a malformed empty declaration; skills that
# declare nothing are counted and fine.

set -u

ROOT="$HOME/trade-imports-arch-workspace"

say() { echo "deps-check: $1"; }

FAIL=0
DECLARING=0
SILENT=0

for skill_md in "$ROOT"/.claude/skills/*/SKILL.md; do
    [[ -e "$skill_md" ]] || continue
    skill=$(basename "$(dirname "$skill_md")")

    # Look only inside the frontmatter block (between the first two
    # --- lines); the format contract keeps the value a flat string.
    has_line=$(awk '/^---$/{n++; next} n==1 && /^  dependencies:/{print "yes"; exit} n>=2{exit}' "$skill_md")
    deps=$(awk '/^---$/{n++; next} n==1 && /^  dependencies: /{sub(/^  dependencies: /,""); print; exit} n>=2{exit}' "$skill_md")

    if [[ -z "$has_line" ]]; then
        SILENT=$((SILENT+1))
        continue
    fi
    if [[ -z "${deps// /}" ]]; then
        say "FAIL $skill — dependencies declared but empty (fill it in or remove the line; format: agent-skills.md -> \"Dependencies frontmatter\")"
        FAIL=1
        continue
    fi

    DECLARING=$((DECLARING+1))
    say "$skill -> $deps"

    for token in $deps; do
        if [[ -d "$ROOT/$token" ]]; then
            continue
        fi
        if command -v "$token" >/dev/null 2>&1; then
            continue
        fi
        # Pick the remedy: a token the Makefile lists as a child repo
        # gets the clone remedy; anything else reads as a tool.
        if grep -q "^CHILDREN.*$token" "$ROOT/Makefile" 2>/dev/null; then
            say "FAIL $skill — project missing: $ROOT/$token (clone it: make -C ~/trade-imports-arch-workspace clone)"
        else
            say "FAIL $skill — '$token' is neither a workspace child directory nor a command on PATH (install $token, or clone the project if it is one)"
        fi
        FAIL=1
    done
done

if [[ "$FAIL" -eq 1 ]]; then
    exit 1
fi
say "ok — $DECLARING skill(s) declare dependencies, all resolve ($SILENT declare none)"
exit 0
