#!/bin/bash
# Update a JIRA issue's description (project auth via JIRA_USER/JIRA_TOKEN)
# Usage: ./update-description.sh -D FILE KEY
#
# The description field takes Jira wiki markup (h3. headings, {{monospace}},
# ||header|| tables) - the v2 API renders markdown literally, so convert
# before sending.
#
# Options:
#   -D, --description-file FILE    Read the new description from FILE (use - for stdin)
#   -h, --help                     Show this help message
#
# Examples:
#   ./update-description.sh -D new-body.txt EUDPA-380
#   cat new-body.txt | ./update-description.sh -D - EUDPA-380

set -e

KEY=""
DESCRIPTION_FILE=""

show_help() {
    sed -n '2,16p' "$0" | sed 's/^# \{0,1\}//'
    cat << EOF

Environment Variables:
  JIRA_USER      Your Atlassian email address
  JIRA_TOKEN     Your Atlassian API token
  JIRA_BASE_URL  Your Atlassian site, e.g. https://example.atlassian.net
EOF
    exit 0
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        -D|--description-file)
            DESCRIPTION_FILE="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            ;;
        -*)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
        *)
            if [[ -z "$KEY" ]]; then
                KEY="$1"
            else
                echo "Error: Too many positional arguments"
                echo "Use --help for usage information"
                exit 1
            fi
            shift
            ;;
    esac
done

if [[ -z "$KEY" ]]; then
    echo "Error: issue KEY is required (e.g. EUDPA-380)"
    echo "Use --help for usage information"
    exit 1
fi

if [[ -z "$DESCRIPTION_FILE" ]]; then
    echo "Error: --description-file is required"
    echo "Use --help for usage information"
    exit 1
fi

if [[ "$DESCRIPTION_FILE" == "-" ]]; then
    DESCRIPTION=$(cat)
else
    if [[ ! -r "$DESCRIPTION_FILE" ]]; then
        echo "Error: cannot read description file: $DESCRIPTION_FILE"
        exit 1
    fi
    DESCRIPTION=$(cat "$DESCRIPTION_FILE")
fi

if [[ -z "$DESCRIPTION" ]]; then
    echo "Error: the new description is empty"
    exit 1
fi

USER="${JIRA_USER:-}"
if [[ -z "$USER" ]]; then
    echo "Error: JIRA_USER environment variable not set"
    exit 1
fi

if [[ -z "$JIRA_TOKEN" ]]; then
    echo "Error: JIRA_TOKEN environment variable not set"
    exit 1
fi

AUTH="$USER:$JIRA_TOKEN"
BASE_URL="${JIRA_BASE_URL:?JIRA_BASE_URL is not set - set it in the workspace .env}"

PAYLOAD=$(jq -n \
    --arg description "$DESCRIPTION" \
    '{ fields: { description: $description } }')

# v2 PUT returns 204 with an empty body on success; errors carry JSON.
response=$(curl -s -w '\n%{http_code}' -X PUT \
    -u "$AUTH" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" \
    "$BASE_URL/rest/api/2/issue/$KEY")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [[ "$http_code" != "204" ]]; then
    echo "Error updating $KEY (HTTP $http_code):"
    if echo "$body" | jq -e '.errorMessages' > /dev/null 2>&1; then
        echo "$body" | jq -r '.errorMessages[]'
    fi
    if echo "$body" | jq -e '.errors' > /dev/null 2>&1; then
        echo "$body" | jq -r '.errors'
    fi
    exit 1
fi

echo "$KEY"
echo "Updated: $BASE_URL/browse/$KEY"
