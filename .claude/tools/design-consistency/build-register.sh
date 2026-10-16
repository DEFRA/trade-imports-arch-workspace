#!/bin/bash
# build-register.sh - merge every page's facts into one register the
# CONSISTENCY_CHECKER reads: register.json, and register.tsv with one fact
# per line, sorted by actor then object, so statements about the same
# responsibility sit together.
# Boundary: refuses until every manifest page has facts written against its
# current hash; start-design-consistency.sh says which pages to extract.
#
# Usage:
#   build-register.sh --run-id <id>
#
# Atomic mutations: write to .tmp then mv.

set -e
export LC_ALL=C

RUN_ID=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        --run-id) RUN_ID="$2"; shift 2 ;;
        -h|--help) sed -n '2,12p' "$0" >&2; exit 0 ;;
        *) echo "build-register: unknown argument $1 (see --help)" >&2; exit 1 ;;
    esac
done
[[ -z "$RUN_ID" ]] && { echo "build-register: give --run-id <id>" >&2; exit 1; }

DIR="$HOME/trade-imports-arch-workspace/.claude/workareas/design-consistency/$RUN_ID"
[[ -f "$DIR/manifest.json" ]] || { echo "build-register: no run $RUN_ID; start it with start-design-consistency.sh" >&2; exit 1; }

FILES=()
STALE=()
while IFS=$'\t' read -r page hash; do
    f="$DIR/facts/${page%.md}.json"
    ok=$(jq -r --arg h "$hash" 'if type == "object" and .sourceHash == $h and (.facts | type) == "array" then "yes" else "no" end' "$f" 2>/dev/null || echo no)
    if [[ "$ok" == "yes" ]]; then FILES+=("$f"); else STALE+=("$page"); fi
done < <(jq -r '.pages[] | "\(.page)\t\(.hash)"' "$DIR/manifest.json")
[[ ${#STALE[@]} -eq 0 ]] || { echo "build-register: facts missing or older than the page for: ${STALE[*]}; re-run start-design-consistency.sh and extract those pages" >&2; exit 1; }

BAD=$(jq -s -r '[.[] | .page as $p | .facts[] | select((.id // "") == "" or (.line | type) != "number" or (.quote // "") == "" or (.actor // "") == "" or (.action // "") == "" or ((.force // "") | IN("always", "never", "only", "may", "must") | not)) | "\($p) \(.id // "?")"] | .[0:10] | join(", ")' "${FILES[@]}")
[[ -z "$BAD" ]] || { echo "build-register: facts missing a required field or with a force outside always|never|only|may|must: $BAD; re-extract those pages" >&2; exit 1; }

jq -s -c '[.[] | .page as $p | .facts[] | . + {page: $p}]
          | sort_by([(.actor | ascii_downcase), (.object // "" | ascii_downcase), .page, .line])' "${FILES[@]}" > "$DIR/register.json.tmp"
mv "$DIR/register.json.tmp" "$DIR/register.json"
jq -r '.[] | "\(.id)\t\(.page):\(.line)\t\(.actor) | \(.action) | \(.object // "-") | \(.condition // "-") | \(.force) | \(.value // "-") | \(.quote)"' "$DIR/register.json" > "$DIR/register.tsv.tmp"
mv "$DIR/register.tsv.tmp" "$DIR/register.tsv"

jq -r --arg d "${DIR/#$HOME/~}" '"build-register: \(length) facts from \(map(.page) | unique | length) pages (\(group_by(.page) | map("\(.[0].page) \(length)") | join(", "))); \(map(.actor) | unique | length) actors; wrote \($d)/register.tsv"' "$DIR/register.json"
