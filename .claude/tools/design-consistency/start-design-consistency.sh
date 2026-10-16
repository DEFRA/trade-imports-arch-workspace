#!/bin/bash
# start-design-consistency.sh - open or resume a design-consistency run:
# hash every page, write the run manifest, and say which pages need a
# FACT_EXTRACTOR because their facts are missing or older than the page.
# Boundary: this helper only plans; build-register.sh merges the facts the
# extractors wrote, render-design-consistency.sh reports the checker's result.
#
# Usage:
#   start-design-consistency.sh --run-id <id> <page.md>...
#
# First stdout line: MODE: EXTRACT (one or more pages to extract) or
# MODE: CHECK (every page's facts match its current hash). Then one line per
# page: "extract: <page> <path> <hash> <facts file>" or "cached: <page>".
# Re-running with the same run id after editing pages re-extracts only the
# pages that changed. Atomic mutations: write to .tmp then mv.

set -e
export LC_ALL=C

RUN_ID=""
PAGES=()
while [[ $# -gt 0 ]]; do
    case "$1" in
        --run-id) RUN_ID="$2"; shift 2 ;;
        -h|--help) sed -n '2,15p' "$0" >&2; exit 0 ;;
        -*) echo "start-design-consistency: unknown flag $1 (see --help)" >&2; exit 1 ;;
        *) PAGES+=("$1"); shift ;;
    esac
done

[[ -z "$RUN_ID" ]] && { echo "start-design-consistency: give --run-id <id>, a short name for the page set, such as ins-auth-session" >&2; exit 1; }
[[ "$RUN_ID" =~ ^[a-z0-9][a-z0-9._-]*$ ]] || { echo "start-design-consistency: run id '$RUN_ID' must be lowercase letters, digits, dots, dashes or underscores" >&2; exit 1; }
[[ ${#PAGES[@]} -ge 2 ]] || { echo "start-design-consistency: give at least two pages; a contradiction needs two statements, and one page can still be checked against another" >&2; exit 1; }
command -v shasum > /dev/null || { echo "start-design-consistency: shasum not found; it ships with macOS and Perl on Linux" >&2; exit 1; }

DIR="$HOME/trade-imports-arch-workspace/.claude/workareas/design-consistency/$RUN_ID"
mkdir -p "$DIR/facts"

ENTRIES='[]'
TODO=0
LINES=()
for p in "${PAGES[@]}"; do
    abs="${p/#\~/$HOME}"
    [[ -f "$abs" ]] || { echo "start-design-consistency: no page at $p; check the path" >&2; exit 1; }
    name=$(basename "$abs")
    stem="${name%.md}"
    hash=$(shasum -a 256 "$abs" | awk '{print $1}')
    facts="$DIR/facts/$stem.json"
    tilde="${abs/#$HOME/~}"
    cached=$(jq -r --arg h "$hash" 'if type == "object" and .sourceHash == $h and (.facts | type) == "array" then "yes" else "no" end' "$facts" 2>/dev/null || echo no)
    if [[ "$cached" == "yes" ]]; then
        LINES+=("cached: $name")
    else
        LINES+=("extract: $name $tilde $hash ${facts/#$HOME/~}")
        TODO=$((TODO + 1))
    fi
    ENTRIES=$(jq -c --arg page "$name" --arg path "$tilde" --arg hash "$hash" --arg facts "${facts/#$HOME/~}" \
        '. + [{page: $page, path: $path, hash: $hash, facts: $facts}]' <<< "$ENTRIES")
done

DUP=$(jq -r 'group_by(.page) | map(select(length > 1) | .[0].page) | join(" ")' <<< "$ENTRIES")
[[ -z "$DUP" ]] || { echo "start-design-consistency: two pages share the filename $DUP; facts are keyed by filename, so rename one or run them separately" >&2; exit 1; }

jq -n --arg run "$RUN_ID" --arg at "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --argjson pages "$ENTRIES" \
    '{run: $run, updated: $at, pages: $pages}' > "$DIR/manifest.json.tmp"
mv "$DIR/manifest.json.tmp" "$DIR/manifest.json"

if [[ $TODO -gt 0 ]]; then echo "MODE: EXTRACT"; else echo "MODE: CHECK"; fi
printf '%s\n' "${LINES[@]}"
echo "start-design-consistency: run $RUN_ID, ${#PAGES[@]} pages, $TODO to extract; workarea ${DIR/#$HOME/~}"
