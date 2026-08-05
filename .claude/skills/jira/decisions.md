# jira skill — decisions

Recorded during CREATE interview. Update if a shape choice
changes; do not delete entries.

## 1. Purpose

Create and read JIRA tickets from the workspace via the standalone curl+jq scripts in tools/jira/: single-key or JQL batch fetch with a flat JSON projection, ticket creation with type/priority/labels/parent, and an auth pre-flight.

## 2. State shape

**Choice:** prose
**Pattern reference:** docs/best-practices/skills/patterns.md §1

## 3. Dispatcher

**Choice:** false
**Pattern reference:** patterns.md §2

## 4. Pre-baked context

**Choice:** false
**Pattern reference:** patterns.md §3

## 5. Worker fan-out

**Choice:** false
**Workers:** 
**Pattern reference:** patterns.md §5

## 6. Walker

**Choice:** false
**Pattern reference:** patterns.md §7

## 7. Helpers introduced

- create-ticket
- fetch
- auth

## 8. Triggers

- "create jira ticket"
- "fetch jira ticket"
- "read jira ticket"
- "run jql"

**Disambiguation:** Distinct from confluence-publish (Atlassian Confluence pages, not JIRA issues) and from the built-in /init (CLAUDE.md scaffolding). Owns JIRA issue creation and reading only - not updates, transitions or comments.
