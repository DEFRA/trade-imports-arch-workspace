#!/bin/bash
# Verify JIRA authentication
# Usage: ./auth.sh

set -e

USER="${JIRA_USER:-}"
if [[ -z "$USER" ]]; then
    echo "JIRA: FAILED - JIRA_USER not set"
    exit 1
fi

echo -n "JIRA: "
if [[ -z "$JIRA_TOKEN" ]]; then
    echo "FAILED - JIRA_TOKEN not set"
    exit 1
fi

response=$(curl -s -u "$USER:$JIRA_TOKEN" \
    -H "Content-Type: application/json" \
    "${JIRA_BASE_URL:?JIRA_BASE_URL is not set - set it in the workspace .env}/rest/api/2/myself")

if echo "$response" | jq -e '.displayName' > /dev/null 2>&1; then
    name=$(echo "$response" | jq -r '.displayName')
    echo "OK - Authenticated as $name"
else
    echo "FAILED - Invalid token or API error"
    exit 1
fi

# Creation-only variable: reads never need it, so a warning keeps the
# pre-flight honest for both flows without blocking read-only machines.
if [[ -z "${JIRA_PROJECT_KEY:-}" ]]; then
    echo "WARN - JIRA_PROJECT_KEY not set: ticket READS work, ticket CREATION will fail (set it in the workspace .env)"
fi
