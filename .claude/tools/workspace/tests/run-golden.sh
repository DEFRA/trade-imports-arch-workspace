#!/usr/bin/env bash
# Golden-file tests for check-deps.sh.
# Invoke with bash (no execute bit required):
#   bash ~/trade-imports-arch-workspace/.claude/tools/workspace/tests/run-golden.sh [--bless]
#
# Each fixtures/<case>/ directory IS a fake workspace fragment
# (.claude/skills/*/SKILL.md, Makefile, child dirs holding a .keep).
# The runner copies it to a temp HOME as trade-imports-arch-workspace —
# HOME redirection is the test seam, since the doctor hardcodes
# $HOME/trade-imports-arch-workspace by the path contract — runs the
# REAL check-deps.sh against it, and diffs normalized stdout + exit
# code against expected/<case>.txt. --bless rewrites expected files.

set -u

REAL_WS="$HOME/trade-imports-arch-workspace"
TESTS_DIR="$REAL_WS/.claude/tools/workspace/tests"
DOCTOR="$REAL_WS/.claude/tools/workspace/check-deps.sh"
BLESS=false
[[ "${1:-}" == "--bless" ]] && BLESS=true

say() { echo "golden-deps: $1"; }

FAIL=0
COUNT=0
for fixture in "$TESTS_DIR"/fixtures/*/; do
    [[ -d "$fixture" ]] || continue
    case=$(basename "$fixture")
    COUNT=$((COUNT+1))

    TMP=$(mktemp -d)
    FAKE="$TMP/trade-imports-arch-workspace"
    mkdir -p "$FAKE"
    cp -R "$fixture/." "$FAKE/"

    out=$(HOME="$TMP" bash "$DOCTOR" 2>&1)
    rc=$?

    actual="$TMP/actual.txt"
    {
        printf '%s\n' "$out" | sed "s|$TMP|HOME|g"
        printf 'exit-code: %s\n' "$rc"
    } > "$actual"

    expected="$TESTS_DIR/expected/$case.txt"
    if $BLESS; then
        mkdir -p "$TESTS_DIR/expected"
        cp "$actual" "$expected"
        say "blessed $case"
    elif [[ ! -f "$expected" ]]; then
        say "FAIL $case — no expected file (run --bless once, review, commit)"
        FAIL=1
    elif ! diff "$expected" "$actual" > "$TMP/diff.out" 2>&1; then
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
