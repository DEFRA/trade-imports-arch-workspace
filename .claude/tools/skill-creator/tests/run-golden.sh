#!/usr/bin/env bash
# Golden-file tests for scaffold-skill.sh.
# Invoke with bash from the workspace root (no execute bit required):
#   bash .claude/tools/skill-creator/tests/run-golden.sh [--bless]
#
# Each fixtures/<case>/ holds a decisions.json (and optionally a
# settings.json; a blanket-entry default is used otherwise). The runner
# builds a throwaway fake workspace in a temp folder, copies the real
# scaffold-skill.sh and render-interview.sh in, and runs the scaffold
# there. The scripts take their root from their own location, so they
# write into the fake workspace. The emitted skill tree, tools stubs,
# settings.json, stdout (with the fake workspace's path written as
# ROOT) and exit code are diffed against expected/<case>/. --bless
# rewrites expected/ from actual output.

set -u

TESTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
REAL_WS="$(cd "$TESTS_DIR/../../../.." && pwd -P)"
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

    TMP=$(cd "$(mktemp -d)" && pwd -P)
    FAKE="$TMP/workspace"
    mkdir -p "$FAKE/.claude/workareas/skill-creator/$name" \
             "$FAKE/.claude/tools/skill-creator" \
             "$FAKE/.claude/skills"
    cp "$fixture/decisions.json" "$FAKE/.claude/workareas/skill-creator/$name/decisions.json"
    # Optional pre-existing tools domain (exercises the clobber guard).
    if [[ -d "$fixture/pre-tools" ]]; then
        mkdir -p "$FAKE/.claude/tools/$name"
        cp -R "$fixture/pre-tools/." "$FAKE/.claude/tools/$name/"
    fi
    # Optional pre-existing skill dir (exercises the re-scaffold refusal).
    if [[ -d "$fixture/pre-skill" ]]; then
        mkdir -p "$FAKE/.claude/skills/$name"
        cp -R "$fixture/pre-skill/." "$FAKE/.claude/skills/$name/"
    fi
    cp "$REAL_WS/.claude/tools/skill-creator/scaffold-skill.sh" "$FAKE/.claude/tools/skill-creator/"
    cp "$REAL_WS/.claude/tools/skill-creator/render-interview.sh" "$FAKE/.claude/tools/skill-creator/"
    # The scaffold's lint tail runs inside the fake workspace too — so
    # the trigger is exercised under test instead of blessing a
    # locale-dependent "not found" error.
    mkdir -p "$FAKE/.claude/tools/workspace"
    cp "$REAL_WS/.claude/tools/workspace/lint-skills.sh" "$FAKE/.claude/tools/workspace/"
    printf 'CHILDREN := demo-project\n' > "$FAKE/Makefile"
    if [[ -f "$fixture/settings.json" ]]; then
        cp "$fixture/settings.json" "$FAKE/.claude/settings.json"
    else
        printf '{"permissions":{"allow":["Bash(.claude/tools/*)"]}}\n' \
            > "$FAKE/.claude/settings.json"
    fi

    # Optional extra args (e.g. --dry-run) from a fixture args file.
    EXTRA_ARGS=()
    if [[ -f "$fixture/args" ]]; then
        read -r -a EXTRA_ARGS < "$fixture/args"
    fi
    out=$(bash "$FAKE/.claude/tools/skill-creator/scaffold-skill.sh" --run-id "$name" ${EXTRA_ARGS[@]+"${EXTRA_ARGS[@]}"} 2>&1)
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
    # Git cannot represent empty directories, so blessed trees must not
    # contain them — otherwise the staged-index hook sees a phantom diff.
    find "$actual" -type d -empty -delete
    printf '%s\n' "$rc" > "$actual/exit-code"
    printf '%s\n' "$out" | sed "s|$FAKE|ROOT|g" > "$actual/stdout"

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
