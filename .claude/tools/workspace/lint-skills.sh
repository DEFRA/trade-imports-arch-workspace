#!/usr/bin/env bash
# Repo-only lint for the skills estate. Machine-agnostic counterpart to
# check-deps.sh: nothing here needs child repos or PATH tools present.
# Invoke with bash (no execute bit required):
#   bash ~/trade-imports-arch-workspace/.claude/tools/workspace/lint-skills.sh
#
# Checks (FAIL -> exit 1):
#   1. workspace-deps declarations: structurally parseable, non-empty,
#      tokens either Makefile CHILDREN projects or plausible tool names.
#   2. Relative markdown links in skills/*/SKILL.md, skills/*/references/
#      and best-practices/skills/ resolve to existing files.
# Sweep (WARN only — soft probes legitimately trip it):
#   3. Fenced code blocks invoking child projects or beyond-baseline
#      tools (node, npm, npx, mmdc) in a skill that declares no matching
#      token. Judgment stays human; the warn surfaces candidates.
#
# Triggers: make check, the scaffold tail, and the pre-commit hook.

set -u

ROOT="$HOME/trade-imports-arch-workspace"

say() { echo "skills-lint: $1"; }

FAIL=0
WARNS=0
# Parse + fallback pinned to check-workspace.sh and check-deps.sh -
# change all three together.
CHILDREN=$(awk -F':=' '/^CHILDREN[[:space:]]*:?=/{print $2}' "$ROOT/Makefile" 2>/dev/null)
if [[ -z "${CHILDREN// /}" ]]; then
    say "WARN could not parse CHILDREN from $ROOT/Makefile - using fallback list"
    CHILDREN="trade-imports-documentation delivery-info-arch-tooling trade-imports-schemas"
fi
SWEEP_TOOLS="node npm npx mmdc"

is_child() {
    case " $CHILDREN " in
        *" $1 "*) return 0 ;;
        *) return 1 ;;
    esac
}

extract_deps() {
    awk '
        /^---$/{n++; next}
        n==1 && /^metadata:[[:space:]]*$/{inmeta=1; next}
        n==1 && inmeta && /^[^[:space:]]/{inmeta=0}
        n==1 && inmeta && /^[[:space:]]+workspace-deps:/{sub(/^[[:space:]]+workspace-deps:[[:space:]]*/,""); print; exit}
        n>=2{exit}
    ' "$1"
}

check_links() {
    # Relative markdown links only; skip absolute URLs, anchors, ~ paths
    # and anything inside fenced code blocks (templates carry
    # placeholder links by design).
    local file="$1" dir target link
    dir=$(dirname "$file")
    while IFS= read -r link; do
        [[ -z "$link" ]] && continue
        case "$link" in
            http://*|https://*|\#*|\~*|mailto:*) continue ;;
        esac
        target="${link%%#*}"
        [[ -z "$target" ]] && continue
        if [[ ! -e "$dir/$target" ]]; then
            say "FAIL ${file#"$ROOT"/} — dangling link: ($link)"
            FAIL=1
        fi
    done < <(awk '/^```/{f=!f; next} !f' "$file" 2>/dev/null \
             | grep -o '](\([^)]*\))' 2>/dev/null | sed 's/^](//; s/)$//')
}

for skill_md in "$ROOT"/.claude/skills/*/SKILL.md; do
    [[ -e "$skill_md" ]] || continue
    skill=$(basename "$(dirname "$skill_md")")
    deps=$(extract_deps "$skill_md")

    # 1. Declaration lint (format only; resolution is check-deps.sh's job).
    has_line=$(awk '
        /^---$/{n++; next}
        n==1 && /^metadata:[[:space:]]*$/{inmeta=1; next}
        n==1 && inmeta && /^[^[:space:]]/{inmeta=0}
        n==1 && inmeta && /^[[:space:]]+workspace-deps:/{print "yes"; exit}
        n>=2{exit}
    ' "$skill_md")
    if [[ -n "$has_line" && -z "${deps// /}" ]]; then
        say "FAIL $skill — workspace-deps declared but empty"
        FAIL=1
    fi
    for token in $deps; do
        token="${token#\"}"; token="${token%\"}"
        token="${token#\'}"; token="${token%\'}"
        [[ -z "$token" ]] && continue
        if ! is_child "$token" && ! [[ "$token" =~ ^[A-Za-z0-9._-]+$ ]]; then
            say "FAIL $skill — malformed token '$token' (format: agent-skills.md -> \"Dependencies frontmatter\")"
            FAIL=1
        fi
    done

    # 2. Link lint across the skill's markdown.
    check_links "$skill_md"
    for ref in "$ROOT/.claude/skills/$skill"/references/*.md; do
        [[ -e "$ref" ]] || continue
        check_links "$ref"
    done

    # 3. Undeclared-invocation sweep (fenced code blocks only; WARN).
    # Acknowledged soft probes (metadata.workspace-soft-deps) go quiet:
    # permanent warnings train warn-blindness, and the sweep exists to
    # surface NEW candidates.
    softdeps=$(awk '
        /^---$/{n++; next}
        n==1 && /^metadata:[[:space:]]*$/{inmeta=1; next}
        n==1 && inmeta && /^[^[:space:]]/{inmeta=0}
        n==1 && inmeta && /^[[:space:]]+workspace-soft-deps:/{sub(/^[[:space:]]+workspace-soft-deps:[[:space:]]*/,""); print; exit}
        n>=2{exit}
    ' "$skill_md")
    fenced=$(awk '/^```/{f=!f; next} f' "$skill_md")
    for candidate in $CHILDREN $SWEEP_TOOLS; do
        if printf '%s\n' "$fenced" | grep -qw "$candidate" 2>/dev/null; then
            case " $deps $softdeps " in
                *" $candidate "*) ;;
                *)
                    say "WARN $skill — code block invokes '$candidate' but workspace-deps does not declare it (soft probe? acknowledge it in workspace-soft-deps — pattern 9)"
                    WARNS=$((WARNS+1))
                    ;;
            esac
        fi
    done
done

# Best-practices links too — the canonical docs must not dangle.
for doc in "$ROOT"/.claude/best-practices/skills/*.md; do
    [[ -e "$doc" ]] || continue
    check_links "$doc"
done

if [[ "$FAIL" -eq 1 ]]; then
    exit 1
fi
say "ok — estate lint clean ($WARNS warn(s))"
exit 0
