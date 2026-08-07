#!/bin/bash
# Sweep paths for Mermaid diagrams, render each, report pass/fail.
# Boundary — this finds and extracts diagrams. To render one source
# you already have on disk, call render-mermaid.sh directly.
#
# Usage:
#   start-mermaid-check.sh <path> [<path>...]
#
# <path> may be a file (.md or .mmd) or a directory (walked
# recursively, skipping node_modules, build, generated and dotdirs).
#
# Emits "MODE: VERIFY" then one line per diagram, then a summary.
# Exit 0 = every diagram rendered. Exit 1 = at least one failed.
# Exit 2 = renderer environment broken (sweep aborted; not a verdict).
#
# Markdown diagrams are extracted to temp files; source files are
# never modified.

set -e

[[ $# -eq 0 ]] && { sed -n '2,17p' "$0" >&2; exit 1; }

WS="$HOME/trade-imports-arch-workspace"
RENDER="$WS/.claude/tools/mermaid-check/render-mermaid.sh"

[[ -x "$RENDER" ]] || { echo "Missing helper: $RENDER" >&2; exit 1; }

workdir=$(mktemp -d -t mermaid-check-XXXXXX)
trap 'rm -rf "$workdir"' EXIT

collect_files() {
    local p="$1"
    if [[ -f "$p" ]]; then
        echo "$p"
    elif [[ -d "$p" ]]; then
        find "$p" \
            \( -name node_modules -o -name build -o -name generated -o -name '.*' \) -prune -o \
            \( -name '*.md' -o -name '*.mmd' \) -print
    else
        echo "No such path: $p" >&2
    fi
}

targets=()
for arg in "$@"; do
    while IFS= read -r f; do
        [[ -n "$f" ]] && targets+=("$f")
    done < <(collect_files "$arg")
done

echo "MODE: VERIFY"

total=0
failed=0
scanned=0

for f in "${targets[@]}"; do
    scanned=$((scanned + 1))
    case "$f" in
        *.mmd)
            total=$((total + 1))
            set +e
            "$RENDER" --file "$f" --label "$f"
            rc=$?
            set -e
            if [[ $rc -eq 2 ]]; then
                # Environment failure, not a diagram failure - every
                # later render would fail identically. Abort the sweep.
                echo "Sweep aborted: renderer environment failure (see ERROR above)." >&2
                exit 2
            fi
            [[ $rc -ne 0 ]] && failed=$((failed + 1))
            ;;
        *.md)
            # Extract each ```mermaid fenced block to its own temp file,
            # remembering the 1-indexed line the fence opened on so a
            # failure can be pointed at the source.
            starts=()
            while IFS= read -r n; do
                [[ -n "$n" ]] && starts+=("$n")
            done < <(awk '/^[[:space:]]*```[[:space:]]*mermaid[[:space:]]*$/ { print NR }' "$f")
            [[ ${#starts[@]} -eq 0 ]] && continue
            idx=0
            for start in "${starts[@]}"; do
                idx=$((idx + 1))
                # tr alone collides (a/b.md vs a_b.md) - suffix with a
                # checksum of the untranslated path.
                safe="$(echo "$f" | tr '/.' '__')_$(printf '%s' "$f" | cksum | cut -d' ' -f1)"
                block="$workdir/${safe}_$idx.mmd"
                awk -v s="$start" '
                    NR > s {
                        if ($0 ~ /^[[:space:]]*```[[:space:]]*$/) exit
                        print
                    }
                ' "$f" > "$block"
                [[ -s "$block" ]] || continue
                total=$((total + 1))
                set +e
                "$RENDER" --file "$block" --label "$f:$start"
                rc=$?
                set -e
                if [[ $rc -eq 2 ]]; then
                    echo "Sweep aborted: renderer environment failure (see ERROR above)." >&2
                    exit 2
                fi
                [[ $rc -ne 0 ]] && failed=$((failed + 1))
            done
            ;;
    esac
done

rm -rf "$workdir"

echo
if [[ $total -eq 0 ]]; then
    echo "No Mermaid diagrams found in $scanned file(s)."
    exit 0
fi

echo "$total diagram(s) in $scanned file(s): $((total - failed)) passed, $failed failed."
[[ $failed -gt 0 ]] && exit 1
exit 0
