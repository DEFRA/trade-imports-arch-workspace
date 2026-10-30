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
# Rule checks (FAIL -> exit 1; silent when clean or when the input is absent):
#   4. Every .claude/rules/*.md with frontmatter has the one shape Claude
#      Code and rule-scope.sh both read: keys paths, gate-paths or
#      gate-exclude, each followed by one or more `  - "glob"` lines;
#      globs of letters, digits, space, _ . / * ? and -, ** only as a whole
#      segment, and no wildcard without a / (it may match at any depth).
#      A frontmatter Claude Code cannot read loads the rule everywhere.
#   4b. The lint's own reading of each rule's globs equals
#      rule-scope.sh --list all, and every glob's ERE compiles.
#   5. Every double-quoted string in the body of rules/authoring-voice.md
#      is a heading in language.md, document-types.md or voice-examples.md.
#   5b. A PostToolUse command in settings.json that runs
#      hook-check-written.sh carries --scope naming an existing rule.
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

    # 1b. Frontmatter must never carry backslash-escaped quotes — the
    # signature of the broken-YAML-escaping regression class (YAML
    # doubles quotes; it never backslashes them).
    if awk '/^---$/{n++; next} n==1' "$skill_md" | grep -q "\\\\'"; then
        say "FAIL $skill — backslash-quote in frontmatter (invalid YAML escaping; expected doubled '')"
        FAIL=1
    fi

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

# 4. Rule frontmatter shape, and 4b. agreement with rule-scope.sh.
SCOPE_LIB="$ROOT/.claude/tools/editorial/rule-scope.sh"
PARSE_NOTE="Claude Code loads a rule whose frontmatter it cannot read in every session"
for rule in "$ROOT"/.claude/rules/*.md; do
    [[ -e "$rule" ]] || continue
    [[ "$(head -n 1 "$rule")" == "---" ]] || continue
    rel="${rule#"$ROOT"/}"
    problems=$(awk '
        function endkey() { if (key != "" && items == 0) print keyline "\tkey " key " lists no glob" }
        NR == 1 { next }
        /^---$/ { endkey(); closed = 1; exit }
        /^$/ { print NR "\tblank line inside the frontmatter"; next }
        /^[^ ]/ {
            endkey(); key = ""
            k = $0
            if (k !~ /^[a-z-]+:$/) { print NR "\tnot a bare key line (a key, a colon, and its list on the lines below)"; next }
            sub(/:$/, "", k)
            if (k != "paths" && k != "gate-paths" && k != "gate-exclude") { print NR "\tunknown key " k " (paths, gate-paths or gate-exclude)"; next }
            if (k in seen) print NR "\tkey " k " repeated"
            seen[k] = 1; key = k; keyline = NR; items = 0; next
        }
        {
            if (key == "") { print NR "\tlist entry outside a key"; next }
            if ($0 !~ /^  - "[^"]*"$/) { print NR "\tnot one double-quoted glob on a \"  - \" line"; next }
            g = $0; sub(/^  - "/, "", g); sub(/"$/, "", g); items++
            if (g == "") { print NR "\tempty glob"; next }
            if (g ~ /[^A-Za-z0-9 _.\/*?-]/) { print NR "\tglob \"" g "\" holds a character outside letters, digits, space, _ . / * ? -"; next }
            n = split(g, seg, "/")
            for (i = 1; i <= n; i++) if (seg[i] ~ /\*\*/ && seg[i] != "**") { print NR "\tglob \"" g "\" uses ** inside a segment"; break }
            if (g ~ /[*?]/ && g !~ /\//) print NR "\tglob \"" g "\" has a wildcard but no /, so it may match at any depth"
        }
        END {
            if (!closed) print NR "\tfrontmatter never closed with ---"
            else if (!("paths" in seen) && !("gate-paths" in seen)) print "1\tno paths or gate-paths list"
        }' "$rule")
    if [[ -n "$problems" ]]; then
        while IFS=$'\t' read -r line reason; do
            say "FAIL $rel:$line — $reason ($PARSE_NOTE)"
        done <<< "$problems"
        FAIL=1
        continue
    fi
    [[ -f "$SCOPE_LIB" ]] || continue
    mine=$(awk '
        NR == 1 { next }
        /^---$/ { exit }
        /^[a-z-]+:$/ { k = $0; sub(/:$/, "", k); next }
        { g = $0; sub(/^  - "/, "", g); sub(/"$/, "", g); print k "\t" g }' "$rule" | sort)
    theirs=$(bash "$SCOPE_LIB" --rule "$rule" --list all 2>&1 | sort)
    if [[ "$mine" != "$theirs" ]]; then
        say "FAIL $rel — the lint and rule-scope.sh read different globs (lint: $(printf '%s' "$mine" | tr '\t\n' ': '); rule-scope.sh: $(printf '%s' "$theirs" | tr '\t\n' ': '))"
        FAIL=1
        continue
    fi
    while IFS=$'\t' read -r _ g; do
        [[ -n "$g" ]] || continue
        ere=$(bash "$SCOPE_LIB" --ere "$g")
        printf '' | grep -E "$ere" > /dev/null 2>&1
        if [[ $? -eq 2 ]]; then
            say "FAIL $rel — glob \"$g\" becomes an expression grep cannot compile: $ere"
            FAIL=1
        fi
    done <<< "$mine"
done

# 5. The authoring-voice rule cites sections by their headings in double
# quotes; each quoted string must be a heading in one of the three
# documents the rule draws on. Fenced blocks and backtick spans are
# masked first, so examples may hold quotes.
VOICE_RULE="$ROOT/.claude/rules/authoring-voice.md"
if [[ -f "$VOICE_RULE" ]]; then
    headings=$(for doc in "$ROOT/.claude/best-practices/writing/language.md" \
                          "$ROOT/.claude/skills/editorial/references/document-types.md" \
                          "$ROOT/.claude/skills/editorial/references/voice-examples.md"; do
                   [[ -f "$doc" ]] || continue
                   awk '/^[[:space:]]*(```|~~~)/ { f = !f; next } !f && /^(#|##|###) / { sub(/^#+ /, ""); print }' "$doc"
               done)
    while IFS=$'\t' read -r line cited; do
        [[ -n "$cited" ]] || continue
        if ! printf '%s\n' "$headings" | grep -qxF -- "$cited"; then
            say "FAIL ${VOICE_RULE#"$ROOT"/}:$line — \"$cited\" is no heading in language.md, document-types.md or voice-examples.md"
            FAIL=1
        fi
    done < <(awk '
        NR == 1 && /^---$/ { fm = 1; next }
        fm { if (/^---$/) fm = 0; next }
        /^[[:space:]]*(```|~~~)/ { f = !f; next }
        f { next }
        {
            s = $0
            gsub(/``([^`]|`[^`])*``/, "", s); gsub(/`[^`]*`/, "", s)
            while (match(s, /"[^"]+"/)) { print NR "\t" substr(s, RSTART + 1, RLENGTH - 2); s = substr(s, RSTART + RLENGTH) }
        }' "$VOICE_RULE")
fi

# 5b. The write-time hook wired in settings.json names its scope rule.
SETTINGS="$ROOT/.claude/settings.json"
if [[ -f "$SETTINGS" ]] && command -v jq > /dev/null 2>&1; then
    while IFS= read -r cmd; do
        [[ -n "$cmd" ]] || continue
        scope=$(printf '%s\n' "$cmd" | sed -nE 's/.*--scope[[:space:]]+"?([^"[:space:]]+)"?.*/\1/p')
        if [[ -z "$scope" ]]; then
            say "FAIL .claude/settings.json — a PostToolUse command runs hook-check-written.sh without --scope: $cmd"
            FAIL=1
            continue
        fi
        resolved=${scope//\$\{CLAUDE_PROJECT_DIR\}/$ROOT}
        resolved=${resolved//\$CLAUDE_PROJECT_DIR/$ROOT}
        resolved=${resolved/#\~/$HOME}
        if [[ ! -f "$resolved" ]]; then
            say "FAIL .claude/settings.json — hook-check-written.sh --scope names a missing rule: $scope"
            FAIL=1
        fi
    done < <(jq -r '.hooks.PostToolUse[]?.hooks[]?.command? // empty' "$SETTINGS" 2>/dev/null | grep 'hook-check-written\.sh')
fi

if [[ "$FAIL" -eq 1 ]]; then
    exit 1
fi
say "ok — estate lint clean ($WARNS warn(s))"
exit 0
