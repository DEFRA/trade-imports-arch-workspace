# jira skill - decisions

Recorded during CREATE interview. Update if a shape choice
changes; do not delete entries.

## 1. Purpose

Create, read and update JIRA tickets from the workspace. Reads, creation and description updates all go through the `hedy` CLI. Reads fetch one ticket by key, or run a JQL search with a flat JSON projection. Creation takes a manifest with type, priority, labels and parent. Creation and description replacement each run a dry run first, and only a confirm with the dry run's plan id changes Jira. `hedy auth` is the auth pre-flight.

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

- `hedy`, for reads, creation, description updates and the auth pre-flight

## 8. Triggers

- "create jira ticket"
- "fetch jira ticket"
- "read jira ticket"
- "run jql"
- "update jira description"
- "rewrite the ticket"

**Disambiguation:** Distinct from confluence-publish (Atlassian Confluence pages, not JIRA issues) and from the built-in /init (CLAUDE.md scaffolding). Owns JIRA issue creation, reading and description updates - not transitions or comments.
