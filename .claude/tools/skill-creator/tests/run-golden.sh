#!/usr/bin/env bash
# Golden-file tests for scaffold-skill.sh.
# Invoke with bash (no execute bit required):
#   bash ~/trade-imports-arch-workspace/.claude/tools/skill-creator/tests/run-golden.sh [--bless]
#
# Each fixtures/<case>/ holds a decisions.json (and optionally a
# settings.json; a blanket-entry default is used otherwise). The runner
# builds a throwaway fake workspace under a temp HOME — the scripts
# hardcode $HOME/trade-imports-arch-workspace by the path contract, so
# HOME redirection is the test seam — copies the real scaffold-skill.sh
# and render-interview.sh in, runs the scaffold, and diffs the emitted
# skill tree, tools stubs, settings.json, stdout and exit code against
# expected/<case>/. --bless rewrites expected/ from actual output.

set -u

REAL_WS="$HOME/trade-imports-arch-workspace"
TESTS_DIR="$REAL_WS/.claude/tools/skill-creator/tests"
BLESS=false
[[ "${1:-}" == "--bless" ]] && BLESS=true

say() { echo "golden-scaffold: $1"; }

FAIL=0
COUNT=0
for fixture in "$TESTS_DIR"/fixtures/*/; do
    [[ -d "$fixture" ]] || continue
    case=$(basename "$fixture")
    name=$(jq -r '.name' "$fixture/decisions.json")
    COUNT=$((COUNT+1))

    TMP=$(mktemp -d)
    FAKE="$TMP/trade-imports-arch-workspace"
    mkdir -p "$FAKE/.claude/workareas/skill-creator/$name" \
             "$FAKE/.claude/tools/skill-creator" \
             "$FAKE/.claude/skills"
    cp "$fixture/decisions.json" "$FAKE/.claude/workareas/skill-creator/$name/decisions.json"
    # Optional pre-existing tools domain (exercises the clobber guard).
    if [[ -d "$fixture/pre-tools" ]]; then
        mkdir -p "$FAKE/.claude/tools/$name"
        cp -R "$fixture/pre-tools/." "$FAKE/.claude/tools/$name/"
    fi
    cp "$REAL_WS/.claude/tools/skill-creator/scaffold-skill.sh" "$FAKE/.claude/tools/skill-creator/"
    cp "$REAL_WS/.claude/tools/skill-creator/render-interview.sh" "$FAKE/.claude/tools/skill-creator/"
    if [[ -f "$fixture/settings.json" ]]; then
        cp "$fixture/settings.json" "$FAKE/.claude/settings.json"
    else
        printf '{"permissions":{"allow":["Bash(~/trade-imports-arch-workspace/.claude/tools/:*)"]}}\n' \
            > "$FAKE/.claude/settings.json"
    fi

    out=$(HOME="$TMP" bash "$FAKE/.claude/tools/skill-creator/scaffold-skill.sh" --run-id "$name" 2>&1)
    rc=$?

    actual="$TMP/actual"
    mkdir -p "$actual"
    if [[ -d "$FAKE/.claude/skills/$name" ]]; then
        cp -R "$FAKE/.claude/skills/$name" "$actual/skill"
    fi
    if [[ -d "$FAKE/.claude/tools/$name" ]]; then
        cp -R "$FAKE/.claude/tools/$name" "$actual/tools"
    fi
    cp "$FAKE/.claude/settings.json" "$actual/settings.json"
    printf '%s\n' "$rc" > "$actual/exit-code"
    printf '%s\n' "$out" | sed "s|$TMP|HOME|g" > "$actual/stdout"

    expected="$TESTS_DIR/expected/$case"
    if $BLESS; then
        rm -rf "$expected"
        mkdir -p "$expected"
        cp -R "$actual/." "$expected/"
        say "blessed $case"
    elif [[ ! -d "$expected" ]]; then
        say "FAIL $case — no expected/ (run --bless once, review, commit)"
        FAIL=1
    elif ! diff -r "$expected" "$actual" > "$TMP/diff.out" 2>&1; then
        say "FAIL $case"
        sed 's/^/  /' "$TMP/diff.out"
        FAIL=1
    else
        say "ok $case"
    fi
    rm -rf "$TMP"
done

if [[ "$COUNT" -eq 0 ]]; then
    say "FAIL — no fixtures found under $TESTS_DIR/fixtures/"
    exit 1
fi
[[ "$FAIL" -eq 1 ]] && exit 1
say "ok — $COUNT case(s)"
exit 0
