#!/bin/bash
# Create a JIRA ticket (project set via JIRA_PROJECT_KEY env var)
# Usage: ./create-ticket.sh [options] "Summary" ["Description"]
#
# Options:
#   -t, --type TYPE                Issue type: Bug, Story, Task, Epic (default: Task)
#   -p, --parent KEY               Parent epic key (e.g., EUDPA-20628)
#   -P, --priority LEVEL           Priority: Lowest, Low, Medium, High, Highest (default: Medium)
#   -l, --label LABEL              Add label (can be used multiple times)
#   -D, --description-file FILE    Read description from FILE (use - for stdin)
#   -a, --assign-self              Assign ticket to yourself
#   -h, --help                     Show this help message
#
# Examples:
#   ./create-ticket.sh "Fix login bug"
#   ./create-ticket.sh -t Bug -P High "Fix login timeout" "Users cannot login after 5 minutes"
#   ./create-ticket.sh -t Story -p EUDPA-12345 -l frontend -l urgent "Add dark mode"
#   ./create-ticket.sh -t Task -p EUDPA-17736 -l technicalImprovement -P Lowest -D draft.md "Tidy validators"
#   cat draft.md | ./create-ticket.sh -D - "Fix login bug"

set -e

# Defaults
TYPE="Task"
PARENT=""
PRIORITY="Medium"
LABELS=()
SUMMARY=""
DESCRIPTION=""
DESCRIPTION_FILE=""
ASSIGN_SELF=false

show_help() {
    cat << EOF
Create a JIRA ticket (project set via JIRA_PROJECT_KEY env var)

Usage: ./create-ticket.sh [options] "Summary" ["Description"]

Options:
  -t, --type TYPE                Issue type: Bug, Story, Task, Epic (default: Task)
  -p, --parent KEY               Parent epic key (e.g., EUDPA-20628)
  -P, --priority LEVEL           Priority: Lowest, Low, Medium, High, Highest (default: Medium)
  -l, --label LABEL              Add label (can be used multiple times)
  -D, --description-file FILE    Read description from FILE (use - for stdin).
                                 Mutually exclusive with the positional Description arg.
  -a, --assign-self              Assign ticket to yourself
  -h, --help                     Show this help message

Examples:
  ./create-ticket.sh "Fix login bug"
  ./create-ticket.sh -t Bug -P High "Fix login timeout" "Users cannot login"
  ./create-ticket.sh -t Story -p EUDPA-12345 -l frontend "Add dark mode"
  ./create-ticket.sh -t Task -p EUDPA-17736 -l technicalImprovement -P Lowest -D draft.md "Tidy validators"
  cat draft.md | ./create-ticket.sh -D - "Fix login bug"

Environment Variables:
  JIRA_USER   Your Atlassian email address
  JIRA_TOKEN  Your Atlassian API token
EOF
    exit 0
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        -t|--type)
            TYPE="$2"
            shift 2
            ;;
        -p|--parent)
            PARENT="$2"
            shift 2
            ;;
        -P|--priority)
            PRIORITY="$2"
            shift 2
            ;;
        -l|--label)
            LABELS+=("$2")
            shift 2
            ;;
        -D|--description-file)
            DESCRIPTION_FILE="$2"
            shift 2
            ;;
        -a|--assign-self)
            ASSIGN_SELF=true
            shift
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
            if [[ -z "$SUMMARY" ]]; then
                SUMMARY="$1"
            elif [[ -z "$DESCRIPTION" ]]; then
                DESCRIPTION="$1"
            else
                echo "Error: Too many positional arguments"
                echo "Use --help for usage information"
                exit 1
            fi
            shift
            ;;
    esac
done

# Resolve description from --description-file if supplied
if [[ -n "$DESCRIPTION_FILE" ]]; then
    if [[ -n "$DESCRIPTION" ]]; then
        echo "Error: --description-file cannot be combined with a positional Description argument"
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
fi

# Validate required fields
if [[ -z "$SUMMARY" ]]; then
    echo "Error: Summary is required"
    echo "Use --help for usage information"
    exit 1
fi

# Validate type
case "$TYPE" in
    Bug|Story|Task|Epic) ;;
    *)
        echo "Error: Invalid type '$TYPE'. Must be Bug, Story, Task, or Epic"
        exit 1
        ;;
esac

# Validate priority
case "$PRIORITY" in
    Lowest|Low|Medium|High|Highest) ;;
    *)
        echo "Error: Invalid priority '$PRIORITY'. Must be Lowest, Low, Medium, High, or Highest"
        exit 1
        ;;
esac

# Check environment variables
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

# Build labels JSON array
if [[ ${#LABELS[@]} -gt 0 ]]; then
    LABELS_JSON=$(printf '%s\n' "${LABELS[@]}" | jq -R . | jq -s .)
else
    LABELS_JSON="[]"
fi

# Build the JSON payload using jq for proper escaping
PAYLOAD=$(jq -n \
    --arg summary "$SUMMARY" \
    --arg description "$DESCRIPTION" \
    --arg type "$TYPE" \
    --arg priority "$PRIORITY" \
    --arg parent "$PARENT" \
    --arg project_key "${JIRA_PROJECT_KEY:?JIRA_PROJECT_KEY is not set - set it in the workspace .env}" \
    --argjson labels "$LABELS_JSON" \
    '{
        fields: ({
            project: { key: $project_key },
            summary: $summary,
            description: $description,
            issuetype: { name: $type },
            priority: { name: $priority },
            labels: $labels
        } + (if $parent != "" then { parent: { key: $parent } } else {} end))
    }')

# Create the ticket
response=$(curl -s -X POST \
    -u "$AUTH" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" \
    "$BASE_URL/rest/api/2/issue")

# Check for errors
if echo "$response" | jq -e '.errors' > /dev/null 2>&1; then
    echo "Error creating ticket:"
    echo "$response" | jq -r '.errors'
    exit 1
fi

if echo "$response" | jq -e '.errorMessages' > /dev/null 2>&1 && [[ $(echo "$response" | jq '.errorMessages | length') -gt 0 ]]; then
    echo "Error creating ticket:"
    echo "$response" | jq -r '.errorMessages[]'
    exit 1
fi

# Extract and return the new ticket key
TICKET_KEY=$(echo "$response" | jq -r '.key')

if [[ "$TICKET_KEY" == "null" || -z "$TICKET_KEY" ]]; then
    echo "Error: Failed to create ticket"
    echo "$response"
    exit 1
fi

echo "$TICKET_KEY"
echo "Created: $BASE_URL/browse/$TICKET_KEY"

# Assign to self if requested
if [[ "$ASSIGN_SELF" == "true" ]]; then
    # Get current user's account ID
    myself_response=$(curl -s -X GET \
        -u "$AUTH" \
        -H "Content-Type: application/json" \
        "$BASE_URL/rest/api/2/myself")

    ACCOUNT_ID=$(echo "$myself_response" | jq -r '.accountId')

    if [[ "$ACCOUNT_ID" != "null" && -n "$ACCOUNT_ID" ]]; then
        assign_response=$(curl -s -X PUT \
            -u "$AUTH" \
            -H "Content-Type: application/json" \
            -d "{\"accountId\": \"$ACCOUNT_ID\"}" \
            "$BASE_URL/rest/api/2/issue/$TICKET_KEY/assignee")

        if [[ -z "$assign_response" ]]; then
            echo "Assigned to: $(echo "$myself_response" | jq -r '.displayName')"
        else
            echo "Warning: Could not assign ticket"
        fi
    fi
fi
