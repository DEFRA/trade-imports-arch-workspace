#!/bin/bash
# Fetch JIRA issues via JQL - single query or a batch of issue keys.
# Batch keys become one `key in (...)` search; requested keys the search
# does not return are reported as missing.
#
# Usage: ./fetch.sh [options] "JQL query"
#        ./fetch.sh [options] KEY [KEY...]
#
# When every positional argument looks like an issue key (ABC-123), the keys
# are fetched in one call as `key in (...)`. Otherwise a single positional
# argument is treated as raw JQL.
#
# Options:
#   -f, --fields LIST   Comma-separated JIRA fields to request
#                       (default: summary,status,issuetype,priority,assignee,labels,parent,created,updated)
#   -m, --max N         Cap on total issues fetched across pages (default: 200)
#   -r, --raw           Emit full raw issue JSON (requests *all fields)
#   -n, --dry-run       Print the JQL and endpoint without calling the API
#   -h, --help          Show this help message
#
# Output: a JSON array of issues on stdout; progress and found/missing
# diagnostics on stderr. Default output is a flat per-issue projection
# (key, url, summary, status, type, priority, assignee, labels, parent,
# created, updated); --raw emits JIRA's issue objects untouched.
#
# Notes:
#   - Uses /rest/api/2/search/jql (nextPageToken pagination). The legacy
#     /rest/api/2/search endpoint has been removed from JIRA Cloud.
#   - A syntactically valid but nonexistent key in a batch makes JIRA reject
#     the whole query; the error names the offending keys - remove and retry.
#
# Examples:
#   ./fetch.sh IMTA-13810
#   ./fetch.sh IMTA-13810 IMTA-13811 IMTA-13900
#   ./fetch.sh 'project = IMTA AND status = "In Progress" ORDER BY updated DESC'
#   ./fetch.sh -m 50 -f summary,status 'labels = technicalImprovement'
#   ./fetch.sh --raw IMTA-13810

set -eu

DEFAULT_FIELDS="summary,status,issuetype,priority,assignee,labels,parent,created,updated"
FIELDS="$DEFAULT_FIELDS"
MAX=200
RAW=false
DRY_RUN=false
ARGS=()

show_help() {
    awk 'NR > 1 && !/^#/ { exit } NR > 1 { sub(/^# ?/, ""); print }' "$0"
    exit 0
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        -f|--fields)
            FIELDS="$2"
            shift 2
            ;;
        -m|--max)
            MAX="$2"
            shift 2
            ;;
        -r|--raw)
            RAW=true
            shift
            ;;
        -n|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            show_help
            ;;
        -*)
            echo "Unknown option: $1" >&2
            echo "Use --help for usage information" >&2
            exit 1
            ;;
        *)
            ARGS+=("$1")
            shift
            ;;
    esac
done

if [[ ${#ARGS[@]} -eq 0 ]]; then
    echo "Error: provide a JQL query or one or more issue keys" >&2
    echo "Use --help for usage information" >&2
    exit 1
fi

# Keys mode when every positional arg matches an issue-key shape.
KEYS_MODE=true
for arg in "${ARGS[@]}"; do
    [[ "$arg" =~ ^[A-Za-z][A-Za-z0-9]*-[0-9]+$ ]] || KEYS_MODE=false
done

if [[ "$KEYS_MODE" == "true" ]]; then
    JQL="key in ($(IFS=,; echo "${ARGS[*]}"))"
elif [[ ${#ARGS[@]} -eq 1 ]]; then
    JQL="${ARGS[0]}"
else
    echo "Error: multiple arguments must all be issue keys (ABC-123); pass raw JQL as one quoted argument" >&2
    exit 1
fi

[[ "$RAW" == "true" ]] && FIELDS="*all"

# Validate before the dry-run preview so the preview is honest.
if ! [[ "$MAX" =~ ^[0-9]+$ ]] || [[ "$MAX" -lt 1 ]]; then
    echo "Error: -m must be a positive integer (got: $MAX)" >&2
    exit 1
fi

if [[ "$DRY_RUN" == "true" ]]; then
    echo "DRY RUN" >&2
    echo "endpoint: \${JIRA_BASE_URL}/rest/api/2/search/jql" >&2
    echo "fields:   $FIELDS" >&2
    echo "max:      $MAX" >&2
    echo "jql:      $JQL" >&2
    exit 0
fi

USER="${JIRA_USER:?JIRA_USER is not set - set it in the workspace .env}"
TOKEN="${JIRA_TOKEN:?JIRA_TOKEN is not set - set it in the workspace .env}"
BASE_URL="${JIRA_BASE_URL:?JIRA_BASE_URL is not set - set it in the workspace .env}"
AUTH="$USER:$TOKEN"

PAGES=$(mktemp -d -t jira-fetch-XXXXXX)
trap 'rm -rf "$PAGES"' EXIT

fetched=0
page=0
token=""
while :; do
    remaining=$((MAX - fetched))
    [[ $remaining -le 0 ]] && break
    page_size=$(( remaining < 100 ? remaining : 100 ))

    body="$PAGES/body.$page.json"
    curl_args=(-sS -G -u "$AUTH" -H "Accept: application/json"
        -o "$body" -w '%{http_code}'
        --data-urlencode "jql=$JQL"
        --data-urlencode "fields=$FIELDS"
        --data-urlencode "maxResults=$page_size")
    [[ -n "$token" ]] && curl_args+=(--data-urlencode "nextPageToken=$token")

    status=$(curl "${curl_args[@]}" "$BASE_URL/rest/api/2/search/jql")
    if [[ "$status" != "200" ]]; then
        echo "Error: JIRA search failed (HTTP $status)" >&2
        jq -r '.errorMessages[]? // empty' "$body" >&2 || cat "$body" >&2
        exit 1
    fi

    page_count=$(jq '.issues | length' "$body")
    fetched=$((fetched + page_count))
    jq '.issues' "$body" > "$PAGES/issues.$page.json"

    token=$(jq -r '.nextPageToken // empty' "$body")
    page=$((page + 1))
    [[ -z "$token" || "$page_count" -eq 0 ]] && break
done

# Merge pages into one array, projected unless --raw.
if [[ "$RAW" == "true" ]]; then
    jq -s 'add // []' "$PAGES"/issues.*.json
else
    jq -s --arg base "$BASE_URL" 'add // [] | map({
        key,
        url: ($base + "/browse/" + .key),
        summary: .fields.summary,
        status: (.fields.status.name // null),
        type: (.fields.issuetype.name // null),
        priority: (.fields.priority.name // null),
        assignee: (.fields.assignee.displayName // null),
        labels: (.fields.labels // []),
        parent: (.fields.parent.key // null),
        created: .fields.created,
        updated: .fields.updated
    })' "$PAGES"/issues.*.json
fi

echo "Fetched $fetched issue(s)" >&2

# In keys mode, report requested keys the search did not return.
if [[ "$KEYS_MODE" == "true" ]]; then
    found=$(jq -rs 'add // [] | map(.key) | .[]' "$PAGES"/issues.*.json)
    missing=()
    for key in "${ARGS[@]}"; do
        grep -qix "$key" <<< "$found" || missing+=("$key")
    done
    if [[ ${#missing[@]} -gt 0 ]]; then
        echo "Missing (not returned - may not exist or no permission): ${missing[*]}" >&2
    fi
fi