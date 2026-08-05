#!/bin/bash
#
# create-page.sh
#
# Creates a new Confluence page in a given space.
# Supports wiki markup format.
#
# Usage: ./create-page.sh --space KEY --title "Title" [--parent PAGE_ID_OR_URL] [--file <file>]
#
# Options:
#   --space, -s     Space key (e.g., IT, IM)
#   --title, -t     Page title (required)
#   --parent, -p    Parent page ID or URL (optional, creates top-level page if omitted)
#   --file, -f      File containing the content (wiki markup)
#   --dry-run       Show what would be sent without making changes
#
# If --file is not specified, reads content from stdin.
#
# Environment variables required:
#   JIRA_USER   - Atlassian account email
#   JIRA_TOKEN  - Atlassian API token
#

set -euo pipefail

BASE_URL="${JIRA_BASE_URL:?JIRA_BASE_URL is not set - see README.md}/wiki"

# Options
SPACE=""
TITLE=""
PARENT_INPUT=""
CONTENT_FILE=""
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --space|-s) SPACE="$2"; shift 2 ;;
        --title|-t) TITLE="$2"; shift 2 ;;
        --parent|-p) PARENT_INPUT="$2"; shift 2 ;;
        --file|-f) CONTENT_FILE="$2"; shift 2 ;;
        --dry-run) DRY_RUN=true; shift ;;
        -h|--help)
            cat << EOF
Create a new Confluence page

Usage: $0 --space KEY --title "Title" [--parent PAGE_ID_OR_URL] [--file <file>]

Options:
  --space, -s KEY        Space key (e.g., IT, IM)
  --title, -t TITLE      Page title (required)
  --parent, -p ID_OR_URL Parent page ID or URL (optional)
  --file, -f FILE        File containing wiki markup content
  --dry-run              Show payload without making changes

If --file is not specified, reads content from stdin.

Examples:
  $0 -s IT -t "My New Page" -f content.wiki
  $0 -s IM -t "Design Doc" -p 12345678 -f design.wiki
  $0 -s IT -t "Quick Note" -p https://your-instance.atlassian.net/wiki/spaces/IT/pages/12345678 -f note.wiki
  echo "h1. Hello" | $0 -s IT -t "From stdin"

Environment Variables:
  JIRA_USER   Your Atlassian email address
  JIRA_TOKEN  Your Atlassian API token
EOF
            exit 0
            ;;
        *)
            echo "Error: Unknown argument: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Check required environment variables
if [[ -z "${JIRA_USER:-}" ]]; then
    echo "Error: JIRA_USER environment variable not set"
    exit 1
fi

if [[ -z "${JIRA_TOKEN:-}" ]]; then
    echo "Error: JIRA_TOKEN environment variable not set"
    exit 1
fi

# Validate required fields
if [[ -z "$SPACE" ]]; then
    echo "Error: --space is required"
    echo "Use --help for usage information"
    exit 1
fi

if [[ -z "$TITLE" ]]; then
    echo "Error: --title is required"
    echo "Use --help for usage information"
    exit 1
fi

# Extract parent page ID from URL if needed
PARENT_ID=""
if [[ -n "$PARENT_INPUT" ]]; then
    if [[ "$PARENT_INPUT" =~ ^https?:// ]]; then
        PARENT_ID=$(echo "$PARENT_INPUT" | sed -E 's#.*/pages/([0-9]+).*#\1#')
    else
        PARENT_ID="$PARENT_INPUT"
    fi

    if ! [[ "$PARENT_ID" =~ ^[0-9]+$ ]]; then
        echo "Error: Unable to determine page ID from parent: $PARENT_INPUT"
        exit 1
    fi
fi

# Read content from file or stdin
if [[ -n "$CONTENT_FILE" ]]; then
    if [[ ! -f "$CONTENT_FILE" ]]; then
        echo "Error: File not found: $CONTENT_FILE"
        exit 1
    fi
    CONTENT=$(cat "$CONTENT_FILE")
else
    echo "Reading content from stdin..." >&2
    CONTENT=$(cat)
fi

if [[ -z "$CONTENT" ]]; then
    echo "Error: No content provided"
    exit 1
fi

echo "Creating page..." >&2
echo "  Space: $SPACE" >&2
echo "  Title: $TITLE" >&2
if [[ -n "$PARENT_ID" ]]; then
    echo "  Parent: $PARENT_ID" >&2
fi

# Build the payload
PAYLOAD=$(jq -n \
    --arg title "$TITLE" \
    --arg spaceKey "$SPACE" \
    --arg content "$CONTENT" \
    --arg parentId "$PARENT_ID" \
    '{
        type: "page",
        title: $title,
        space: { key: $spaceKey },
        body: {
            wiki: {
                value: $content,
                representation: "wiki"
            }
        }
    } + (if $parentId != "" then { ancestors: [{ id: $parentId }] } else {} end)')

if [[ "$DRY_RUN" == "true" ]]; then
    echo "" >&2
    echo "=== DRY RUN - Would send this payload ===" >&2
    echo "$PAYLOAD" | jq .
    exit 0
fi

# Create the page
RESPONSE=$(curl -s -w "\n%{http_code}" -u "$JIRA_USER:$JIRA_TOKEN" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -d "$PAYLOAD" \
    "$BASE_URL/rest/api/content")

# Extract HTTP status code (last line)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [[ "$HTTP_CODE" -ge 200 && "$HTTP_CODE" -lt 300 ]]; then
    PAGE_ID=$(echo "$BODY" | jq -r '.id')
    echo "" >&2
    echo "Page created successfully!" >&2
    echo "  ID: $PAGE_ID" >&2
    echo "  URL: $BASE_URL/spaces/$SPACE/pages/$PAGE_ID" >&2
    # Output page ID to stdout for scripting
    echo "$PAGE_ID"
else
    echo "" >&2
    echo "Failed to create page (HTTP $HTTP_CODE)" >&2
    echo "$BODY" | jq -r '.message // .' >&2
    exit 1
fi
