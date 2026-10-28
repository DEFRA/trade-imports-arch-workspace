# jira skill - decisions

Recorded during CREATE interview. Update if a shape choice
changes; do not delete entries.

## 1. Purpose

Create, read and update JIRA tickets from the workspace. Reads go through the `hedy` CLI: one ticket by key, or a JQL search with a flat JSON projection. Creation with type/priority/labels/parent and description update go through the curl+jq scripts in tools/jira/. `hedy auth` is the auth pre-flight.

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
- update-description
- `hedy`, for reads and the auth pre-flight

## 8. Triggers

- "create jira ticket"
- "fetch jira ticket"
- "read jira ticket"
- "run jql"
- "update jira description"
- "rewrite the ticket"

**Disambiguation:** Distinct from confluence-publish (Atlassian Confluence pages, not JIRA issues) and from the built-in /init (CLAUDE.md scaffolding). Owns JIRA issue creation, reading and description updates - not transitions or comments.
