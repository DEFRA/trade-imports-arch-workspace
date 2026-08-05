#!/bin/bash
#
# update-page.sh
#
# Updates an existing Confluence page with new content.
# Supports wiki markup format.
#
# Usage: ./update-page.sh PAGE_ID_OR_URL [--file <file>] [--title <title>]
#
# Options:
#   --file, -f    File containing the new content (wiki markup)
#   --title, -t   Optional new title for the page
#   --dry-run     Show what would be sent without making changes
#
# Environment variables required:
#   JIRA_USER   - Atlassian account email
#   JIRA_TOKEN  - Atlassian API token
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_URL="${JIRA_BASE_URL:?JIRA_BASE_URL is not set - see README.md}/wiki"

# Options
PAGE_INPUT=""
CONTENT_FILE=""
NEW_TITLE=""
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --file|-f) CONTENT_FILE="$2"; shift 2 ;;
        --title|-t) NEW_TITLE="$2"; shift 2 ;;
        --dry-run) DRY_RUN=true; shift ;;
        -h|--help)
            echo "Usage: $0 PAGE_ID_OR_URL [--file <file>] [--title <title>] [--dry-run]"
            echo ""
            echo "Updates a Confluence page with content from a file (wiki markup format)."
            echo ""
            echo "Options:"
            echo "  --file, -f <file>   File containing wiki markup content"
            echo "  --title, -t <title> New title for the page (optional)"
            echo "  --dry-run           Show payload without making changes"
            echo ""
            echo "If --file is not specified, reads from stdin."
            exit 0
            ;;
        *)
            if [[ -z "$PAGE_INPUT" ]]; then
                PAGE_INPUT="$1"
            else
                echo "Error: Unknown argument: $1"
                exit 1
            fi
            shift
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

if [[ -z "$PAGE_INPUT" ]]; then
    echo "Error: Page ID or URL required"
    echo "Usage: $0 PAGE_ID_OR_URL [--file <file>] [--title <title>]"
    exit 1
fi

# Extract page ID from URL if needed
if [[ "$PAGE_INPUT" =~ ^https?:// ]]; then
    PAGE_ID=$(echo "$PAGE_INPUT" | sed -E 's#.*/pages/([0-9]+).*#\1#')
else
    PAGE_ID="$PAGE_INPUT"
fi

if ! [[ "$PAGE_ID" =~ ^[0-9]+$ ]]; then
    echo "Error: Unable to determine page ID from input: $PAGE_INPUT"
    exit 1
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

echo "Fetching current page info..." >&2

# Get current page info (need version number and title)
CURRENT_PAGE=$(curl -s -u "$JIRA_USER:$JIRA_TOKEN" \
    -H "Accept: application/json" \
    "$BASE_URL/rest/api/content/$PAGE_ID?expand=version,space")

# Check for errors
if echo "$CURRENT_PAGE" | jq -e '.statusCode' > /dev/null 2>&1; then
    echo "Error: $(echo "$CURRENT_PAGE" | jq -r '.message // "Unknown error"')"
    exit 1
fi

CURRENT_VERSION=$(echo "$CURRENT_PAGE" | jq -r '.version.number')
CURRENT_TITLE=$(echo "$CURRENT_PAGE" | jq -r '.title')
SPACE_KEY=$(echo "$CURRENT_PAGE" | jq -r '.space.key')

# Use current title if no new title specified
if [[ -z "$NEW_TITLE" ]]; then
    NEW_TITLE="$CURRENT_TITLE"
fi

NEW_VERSION=$((CURRENT_VERSION + 1))

echo "Page: $CURRENT_TITLE" >&2
echo "Space: $SPACE_KEY" >&2
echo "Current version: $CURRENT_VERSION -> $NEW_VERSION" >&2

# Build the update payload
# Using wiki representation for wiki markup
PAYLOAD=$(jq -n \
    --arg title "$NEW_TITLE" \
    --arg spaceKey "$SPACE_KEY" \
    --argjson version "$NEW_VERSION" \
    --arg content "$CONTENT" \
    '{
        type: "page",
        title: $title,
        space: { key: $spaceKey },
        version: { number: $version },
        body: {
            wiki: {
                value: $content,
                representation: "wiki"
            }
        }
    }')

if [[ "$DRY_RUN" == "true" ]]; then
    echo "" >&2
    echo "=== DRY RUN - Would send this payload ===" >&2
    echo "$PAYLOAD" | jq .
    exit 0
fi

echo "Updating page..." >&2

# Send the update
RESPONSE=$(curl -s -w "\n%{http_code}" -u "$JIRA_USER:$JIRA_TOKEN" \
    -X PUT \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -d "$PAYLOAD" \
    "$BASE_URL/rest/api/content/$PAGE_ID")

# Extract HTTP status code (last line)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [[ "$HTTP_CODE" -ge 200 && "$HTTP_CODE" -lt 300 ]]; then
    echo "" >&2
    echo "✅ Page updated successfully!" >&2
    echo "   Version: $NEW_VERSION" >&2
    echo "   URL: $BASE_URL/spaces/$SPACE_KEY/pages/$PAGE_ID" >&2
else
    echo "" >&2
    echo "❌ Failed to update page (HTTP $HTTP_CODE)" >&2
    echo "$BODY" | jq -r '.message // .' >&2
    exit 1
fi
