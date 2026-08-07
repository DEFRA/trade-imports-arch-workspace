#!/usr/bin/env bash
# Dependency doctor - verifies every skill's declared dependencies
# resolve on this machine.
# Invoke with bash (no execute bit required):
#   bash ~/trade-imports-arch-workspace/.claude/tools/workspace/check-deps.sh
#
# Skills declare unbundled needs in SKILL.md frontmatter as
#   metadata:
#     workspace-deps: <token> <token>
# (format contract: .claude/best-practices/skills/agent-skills.md ->
# "Dependencies frontmatter"). Per token: a Makefile CHILDREN project
# must exist as a directory (remedy: clone); anything else must be a
# command on PATH (remedy: install). A directory that is not a declared
# child fails - it can never resolve on a colleague's make-bootstrapped
# machine. The ok output doubles as the estate report of which skills
# are not self-contained. Exit 1 on any failure or a malformed empty
# declaration; skills that declare nothing are counted and fine.

set -u

ROOT="$HOME/trade-imports-arch-workspace"

say() { echo "deps-check: $1"; }

# Child projects come from the Makefile's CHILDREN line - the single
# source of truth (a second hardcoded list is how earlier drift
# happened).
CHILDREN=$(awk -F':=' '/^CHILDREN[[:space:]]*:?=/{print $2}' "$ROOT/Makefile" 2>/dev/null)

is_child() {
    case " $CHILDREN " in
        *" $1 "*) return 0 ;;
        *) return 1 ;;
    esac
}

FAIL=0
DECLARING=0
SILENT=0

for skill_md in "$ROOT"/.claude/skills/*/SKILL.md; do
    [[ -e "$skill_md" ]] || continue
    skill=$(basename "$(dirname "$skill_md")")

    # Structural parse: only inside the first frontmatter block, only
    # under the metadata: map, any indentation. The format contract
    # keeps the value a flat string.
    has_line=$(awk '
        /^---$/{n++; next}
        n==1 && /^metadata:[[:space:]]*$/{inmeta=1; next}
        n==1 && inmeta && /^[^[:space:]]/{inmeta=0}
        n==1 && inmeta && /^[[:space:]]+workspace-deps:/{print "yes"; exit}
        n>=2{exit}
    ' "$skill_md")
    deps=$(awk '
        /^---$/{n++; next}
        n==1 && /^metadata:[[:space:]]*$/{inmeta=1; next}
        n==1 && inmeta && /^[^[:space:]]/{inmeta=0}
        n==1 && inmeta && /^[[:space:]]+workspace-deps:/{sub(/^[[:space:]]+workspace-deps:[[:space:]]*/,""); print; exit}
        n>=2{exit}
    ' "$skill_md")

    if [[ -z "$has_line" ]]; then
        SILENT=$((SILENT+1))
        continue
    fi
    if [[ -z "${deps// /}" ]]; then
        say "FAIL $skill — workspace-deps declared but empty (fill it in or remove the line; format: agent-skills.md -> \"Dependencies frontmatter\")"
        FAIL=1
        continue
    fi

    DECLARING=$((DECLARING+1))
    say "$skill -> $deps"

    for token in $deps; do
        # Tolerate quoted tokens; the contract says none, but a quoted
        # declaration should not produce a confusing miss.
        token="${token#\"}"; token="${token%\"}"
        token="${token#\'}"; token="${token%\'}"
        [[ -z "$token" ]] && continue

        if is_child "$token"; then
            if [[ ! -d "$ROOT/$token" ]]; then
                say "FAIL $skill — project missing: $ROOT/$token (clone it: make -C ~/trade-imports-arch-workspace clone)"
                FAIL=1
            fi
            continue
        fi
        if command -v "$token" >/dev/null 2>&1; then
            continue
        fi
        if [[ -d "$ROOT/$token" ]]; then
            say "FAIL $skill — '$token' is a directory under the root but not a Makefile child; it cannot resolve on a make-bootstrapped machine (add it to CHILDREN, or declare a real tool)"
            FAIL=1
            continue
        fi
        say "FAIL $skill — '$token' is neither a workspace child project nor a command on PATH (install $token, or clone the project if it is one)"
        FAIL=1
    done
done

if [[ "$FAIL" -eq 1 ]]; then
    exit 1
fi
say "ok — $DECLARING skill(s) declare dependencies, all resolve ($SILENT declare none)"
exit 0
