#!/bin/bash
# Verify Confluence authentication
# Usage: ./auth.sh

set -e

USER="${JIRA_USER:-}"
if [[ -z "$USER" ]]; then
    echo "Confluence: FAILED - JIRA_USER not set"
    exit 1
fi

echo -n "Confluence: "
if [[ -z "$JIRA_TOKEN" ]]; then
    echo "FAILED - JIRA_TOKEN not set"
    exit 1
fi

response=$(curl -s -u "$USER:$JIRA_TOKEN" \
    -H "Accept: application/json" \
    "${JIRA_BASE_URL:?JIRA_BASE_URL is not set - see README.md}/wiki/rest/api/user/current")

if echo "$response" | jq -e '.type' > /dev/null 2>&1; then
    name=$(echo "$response" | jq -r '.profile.displayName // .displayName // "Unknown"')
    echo "OK - Authenticated as $name"
else
    echo "FAILED - Invalid token or API error"
    exit 1
fi
