#!/bin/bash
# Materialise a workspace skill scaffold from decisions.json.
#
# Usage:
#   scaffold-skill.sh --run-id <name> [--dry-run]
#
# Reads workareas/skill-creator/<name>/decisions.json and writes:
#   .claude/skills/<name>/SKILL.md             (from template, TODO markers;
#                                               + metadata.dependencies and a
#                                               Dependencies section when the
#                                               dependencies answer is depend)
#   .claude/skills/<name>/references/<N>.md    (per fan-out worker)
#   .claude/skills/<name>/assets/<name>-schema.md   (if state_shape=json)
#   tools/<name>/<helper>.sh                    (per helper entry)
#   .claude/skills/<name>/decisions.md          (rendered sidecar)
#   .claude/settings.json                       (allowlist entries appended only
#                                               when the blanket tools/ entry
#                                               does not already cover them)
#
# Refuses to scaffold if any of the 9 answers is missing or if
# triggers.disambiguation is empty. Dependency gaps (depend without
# declared tokens / justification / dispatcher) WARN and proceed —
# audit pattern 9 flags them; the scaffold never blocks on judgment.
#
# All mutations atomic: write to .tmp then mv.

set -e

RUN_ID=""
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --run-id) RUN_ID="$2"; shift 2 ;;
        --dry-run) DRY_RUN=true; shift ;;
        -h|--help)
            sed -n '2,18p' "$0" >&2
            exit 0 ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done

[[ -z "$RUN_ID" ]] && { echo "Missing --run-id" >&2; exit 1; }

case "$RUN_ID" in
    *[!a-z0-9-]*|-*|"")
        echo "Invalid run-id (must match ^[a-z0-9-]+$): $RUN_ID" >&2
        exit 1 ;;
esac

WS="$HOME/trade-imports-arch-workspace"
DECISIONS="$WS/.claude/workareas/skill-creator/$RUN_ID/decisions.json"
[[ -f "$DECISIONS" ]] || { echo "No decisions.json at $DECISIONS" >&2; exit 1; }

# Validate all 9 answers present.
# jq's // operator treats `false` as null, so use explicit
# `has(key)` checks for booleans (dispatcher, prebake, walker,
# fanout.enabled). String / array answers fall back to // null
# safely because their absence is genuinely null.
missing=$(jq -r '
    .answers as $a |
    [
        (if ($a | has("purpose")) and $a.purpose != "" then empty else "purpose" end),
        (if ($a.dependencies.resolution // "" | . == "none" or . == "build" or . == "port" or . == "depend") then empty else "dependencies.resolution" end),
        (if ($a | has("state_shape")) and $a.state_shape != "" then empty else "state_shape" end),
        (if ($a | has("dispatcher")) then empty else "dispatcher" end),
        (if ($a | has("prebake")) then empty else "prebake" end),
        (if ($a.fanout | type) == "object" and ($a.fanout | has("enabled")) then empty else "fanout.enabled" end),
        (if ($a | has("walker")) then empty else "walker" end),
        (if ($a.helpers | type) == "array" then empty else "helpers" end),
        (if (($a.triggers.phrases // []) | length) > 0 then empty else "triggers.phrases" end),
        (if ($a.triggers.disambiguation // "") != "" then empty else "triggers.disambiguation" end)
    ] | join(",")
' "$DECISIONS")

if [[ -n "$missing" ]]; then
    echo "Cannot scaffold — missing answers: $missing" >&2
    echo "Run interview-add-answer.sh for each missing field, then retry." >&2
    exit 1
fi

NAME="$RUN_ID"
SKILL_DIR="$WS/.claude/skills/$NAME"
TOOLS_DIR="$WS/.claude/tools/$NAME"
SETTINGS="$WS/.claude/settings.json"

STATE_SHAPE=$(jq -r '.answers.state_shape' "$DECISIONS")
DISPATCHER=$(jq -r '.answers.dispatcher' "$DECISIONS")
FANOUT=$(jq -r '.answers.fanout.enabled' "$DECISIONS")
WALKER=$(jq -r '.answers.walker' "$DECISIONS")
PURPOSE=$(jq -r '.answers.purpose' "$DECISIONS")
DISAMBIG=$(jq -r '.answers.triggers.disambiguation' "$DECISIONS")
TRIGGERS_CSV=$(jq -r '.answers.triggers.phrases | map("\"" + . + "\"") | join(", ")' "$DECISIONS")
DEP_RESOLUTION=$(jq -r '.answers.dependencies.resolution // "none"' "$DECISIONS")
DEP_DECLARED=$(jq -r '.answers.dependencies.declared // [] | join(" ")' "$DECISIONS")
DEP_WHY=$(jq -r '.answers.dependencies.justification // ""' "$DECISIONS")

# Advisory warnings, not gates (pattern 9 is audit criteria; the
# scaffold never blocks on judgment calls).
if [[ "$DEP_RESOLUTION" == "depend" ]]; then
    [[ -z "$DEP_DECLARED" ]] && echo "WARN: resolution=depend with no declared tokens — frontmatter will carry a TODO; audit pattern 9 will flag it" >&2
    [[ -z "$DEP_WHY" ]] && echo "WARN: resolution=depend with no justification — the Dependencies section will carry a TODO" >&2
    [[ "$DISPATCHER" != "true" ]] && echo "WARN: resolution=depend without a dispatcher — no home for the pre-flight; audit pattern 9 will flag this until one exists" >&2
fi

if $DRY_RUN; then
    echo "DRY RUN — would scaffold $NAME:"
    echo "  SKILL.md → $SKILL_DIR/SKILL.md"
    echo "  state_shape=$STATE_SHAPE dispatcher=$DISPATCHER fanout=$FANOUT walker=$WALKER"
    echo "  dependencies: resolution=$DEP_RESOLUTION declared=[$DEP_DECLARED]"
    echo "  helpers:"
    jq -r '.answers.helpers[] | "    tools/'"$NAME"'/" + . + ".sh"' "$DECISIONS"
    if [[ "$FANOUT" == "true" ]]; then
        echo "  workers:"
        jq -r '.answers.fanout.workers[] | "    references/" + . + ".md"' "$DECISIONS"
    fi
    exit 0
fi

mkdir -p "$SKILL_DIR/references" "$SKILL_DIR/assets" "$TOOLS_DIR"

# ---------------------------------------------------------------------
# SKILL.md
# ---------------------------------------------------------------------
skill_md="$SKILL_DIR/SKILL.md"

# Worker table rows (only if fan-out).
worker_rows=""
if [[ "$FANOUT" == "true" ]]; then
    worker_rows=$(jq -r '.answers.fanout.workers[] | "| `references/" + . + ".md` | TODO step | TODO artifact |"' "$DECISIONS")
fi

# Step 0 prose (only if dispatcher).
step0_block=""
if [[ "$DISPATCHER" == "true" ]]; then
    step0_block=$(cat <<EOF

## Step 0: Start

\`\`\`bash
~/trade-imports-arch-workspace/.claude/tools/$NAME/start-$NAME.sh TODO_ARGS
\`\`\`

First stdout line is \`MODE: <BRANCH>\`. Branch on it.
EOF
)
fi

# Worker references block.
worker_block=""
if [[ "$FANOUT" == "true" ]]; then
    worker_block=$(cat <<EOF

## Worker references

| Persona | Used in | Artifact |
|---|---|---|
$worker_rows

Spawn idiom — Task tool, \`subagent_type: general-purpose\`,
prompt begins:

\`\`\`
Follow the instructions in ~/trade-imports-arch-workspace/.claude/skills/$NAME/references/<NAME>.md.

<per-spawn context>
\`\`\`
EOF
)
fi

# State block.
state_block=""
if [[ "$STATE_SHAPE" == "json" ]]; then
    state_block=$(cat <<EOF

## State

Canonical state is JSON at
\`~/trade-imports-arch-workspace/.claude/workareas/$NAME/<id>/state.json\`.
Schema: \`assets/$NAME-schema.md\`. Mutated only via
\`.claude/tools/$NAME/*.sh\` helpers (atomic \`jq ... > tmp; mv tmp file\`).
EOF
)
fi

# Helpers cheat-sheet.
helper_rows=$(jq -r '.answers.helpers[] | "| `" + . + ".sh` | TODO — one-line purpose |"' "$DECISIONS")

# Frontmatter — metadata.dependencies only when depending. Built as a
# variable so the non-depending case leaves no blank line inside the
# frontmatter block.
frontmatter="---
name: $NAME
description: '$PURPOSE Triggers: $TRIGGERS_CSV. $DISAMBIG TODO — refine description and add NOT-for clauses pointing at neighbouring skills.'"
# Emit whenever anything is declared: a depend resolution OR
# beyond-baseline tool tokens recorded with resolution none/build/port.
if [[ -n "$DEP_DECLARED" || "$DEP_RESOLUTION" == "depend" ]]; then
    frontmatter="$frontmatter
metadata:
  dependencies: ${DEP_DECLARED:-TODO-declare-tokens}"
fi
frontmatter="$frontmatter
---"

# Dependencies body section (pattern 9) — whenever anything is declared.
deps_section=""
if [[ -n "$DEP_DECLARED" || "$DEP_RESOLUTION" == "depend" ]]; then
    why_line="beyond the workspace baseline (bash, curl, jq, git)."
    if [[ "$DEP_RESOLUTION" == "depend" ]]; then
        why_line="at runtime instead of a local port.
Why: ${DEP_WHY:-TODO — record the justification for depending}."
    fi
    deps_section=$(cat <<EOF

## Dependencies

This skill needs ${DEP_DECLARED:-TODO — declare the project/tool tokens}
$why_line
Declared in the frontmatter \`metadata.dependencies\` (format contract:
\`best-practices/skills/agent-skills.md\` → "Dependencies frontmatter");
verified machine-wide by \`check-deps.sh\`; pre-flighted where the skill
runs — \`MODE: BLOCKED\` with a REASON naming the remedy when a
dependency is missing. Keep this list in sync with what the steps
actually invoke.
EOF
)
fi

cat > "$skill_md.tmp" <<EOF
$frontmatter

<!-- TODO: one-paragraph intro. State the audience (which tickets,
     which work) and the outcome (what artifact lands where). -->

## Path conventions

Cross-workspace paths use the literal home-relative form —
\`~/trade-imports-arch-workspace/.claude/tools/<domain>/\`,
\`~/trade-imports-arch-workspace/.claude/best-practices/\`,
\`~/trade-imports-arch-workspace/.claude/workareas/\`. Bash
expands \`~\` automatically. Skill-internal references stay
relative (\`references/<NAME>.md\`, \`assets/<NAME>.md\`).

**Bash call hygiene** - one command per Bash call. Full rule
table: [\`agent-skills.md\`](../../best-practices/skills/agent-skills.md)
→ "Bash call hygiene".

## When to use

| Trigger | What to follow |
|---------|----------------|
$(jq -r '.answers.triggers.phrases[] | "| \"" + . + "\" | TODO — section name |"' "$DECISIONS")

NOT for TODO — name out-of-scope cases pointing at the right
neighbouring skill.
$deps_section
$worker_block
$state_block
$step0_block

## Step 1: TODO

<!-- TODO: per-step instructions. -->

## Completion output

\`\`\`
$NAME complete for <id>.

Summary:
- TODO key metric

Next: TODO hint.
\`\`\`

## Scripts cheat-sheet

All under \`~/trade-imports-arch-workspace/.claude/tools/$NAME/\`:

| Script | Purpose |
|---|---|
$helper_rows
EOF
mv "$skill_md.tmp" "$skill_md"

# ---------------------------------------------------------------------
# References stubs (per fan-out worker).
# ---------------------------------------------------------------------
if [[ "$FANOUT" == "true" ]]; then
    while IFS= read -r worker; do
        [[ -z "$worker" ]] && continue
        ref="$SKILL_DIR/references/$worker.md"
        cat > "$ref.tmp" <<EOF
TODO — one-paragraph statement of what this worker does and what
single artifact it produces.

**Bash call hygiene** — one command per Bash call. Full rule table:
\`~/trade-imports-arch-workspace/.claude/best-practices/skills/agent-skills.md\`
→ "Bash call hygiene".

## Inputs

TODO — describe the per-spawn context the parent provides.

## Workflow

TODO — numbered steps. Read X, decide Y, write Z.

## Return value

TODO — one-line summary the parent aggregates.
EOF
        mv "$ref.tmp" "$ref"
    done < <(jq -r '.answers.fanout.workers[]' "$DECISIONS")
fi

# ---------------------------------------------------------------------
# Assets stub (only if JSON state).
# ---------------------------------------------------------------------
if [[ "$STATE_SHAPE" == "json" ]]; then
    asset="$SKILL_DIR/assets/$NAME-schema.md"
    cat > "$asset.tmp" <<EOF
# $NAME state JSON shape

Canonical state file:
\`~/trade-imports-arch-workspace/.claude/workareas/$NAME/<id>/state.json\`.

Mutated only via \`tools/$NAME/*.sh\` helpers. A markdown view is
regenerated by the skill's render helper (if the helpers list
includes one) whenever the JSON changes.

## Schema

\`\`\`jsonc
{
  "id": "<id>",
  "created_at": "2026-05-26T...",
  "items": [
    {
      "id": 1,
      "TODO": "TODO — fill in the per-item shape"
    }
  ]
}
\`\`\`

## Field rules

- TODO — document each field, validation rules, and which helper
  mutates it.
EOF
    mv "$asset.tmp" "$asset"
fi

# ---------------------------------------------------------------------
# Helper script stubs.
# ---------------------------------------------------------------------
while IFS= read -r helper; do
    [[ -z "$helper" ]] && continue
    sh="$TOOLS_DIR/$helper.sh"

    # Pattern 9: the dispatcher stub of a depending skill carries the
    # pre-flight TODO.
    preflight=""
    if [[ "$helper" == "start-$NAME" && "$DEP_RESOLUTION" == "depend" ]]; then
        preflight="
# TODO pattern 9 — pre-flight each declared dependency before real work:
#   projects: [[ -d \$HOME/trade-imports-arch-workspace/<project> ]]
#   tools:    command -v <tool>
# On failure print MODE: BLOCKED plus REASON: <remedy> (model:
# tools/confluence-publish/start-confluence-publish.sh).
"
    fi
    cat > "$sh.tmp" <<EOF
#!/bin/bash
# TODO — one-line purpose of this helper.
# Boundary (only if this helper has a sibling) — TODO: when to use this vs that sibling.
#
# Usage:
#   $helper.sh --run-id <id> [TODO other flags]
#
# Atomic mutations: write to .tmp then mv.
# Solve, don't defer: handle missing prerequisites with a specific
# remedy in the error message, never a raw failure.
$preflight
set -e

RUN_ID=""

while [[ \$# -gt 0 ]]; do
    case "\$1" in
        --run-id) RUN_ID="\$2"; shift 2 ;;
        -h|--help)
            sed -n '2,9p' "\$0" >&2
            exit 0 ;;
        *) echo "Unknown arg: \$1" >&2; exit 1 ;;
    esac
done

[[ -z "\$RUN_ID" ]] && { echo "Missing --run-id" >&2; exit 1; }

# TODO — implement.
echo "TODO: $helper.sh not yet implemented" >&2
exit 1
EOF
    mv "$sh.tmp" "$sh"
    chmod +x "$sh"
done < <(jq -r '.answers.helpers[]' "$DECISIONS")

# ---------------------------------------------------------------------
# decisions.md sidecar.
# ---------------------------------------------------------------------
"$WS/.claude/tools/skill-creator/render-interview.sh" --run-id "$RUN_ID" > "$SKILL_DIR/decisions.md.tmp"
mv "$SKILL_DIR/decisions.md.tmp" "$SKILL_DIR/decisions.md"

# ---------------------------------------------------------------------
# .claude/settings.json — allowlist coverage (pattern 8).
# ---------------------------------------------------------------------
entry1="Bash(~/trade-imports-arch-workspace/.claude/tools/$NAME/*)"
entry2="Bash(~/trade-imports-arch-workspace/.claude/tools/$NAME/*:*)"
blanket="Bash(~/trade-imports-arch-workspace/.claude/tools/:*)"

# The blanket tools/ entry (the live settings.json shape) already
# covers every tools/<name>/ script — appending per-skill entries
# under it would be redundant from birth. Append only when neither
# the blanket nor the per-skill pair is present.
covered=$(jq \
    --arg b "$blanket" --arg e1 "$entry1" --arg e2 "$entry2" \
    '.permissions.allow as $cur
     | (($cur | index($b)) != null)
       or ((($cur | index($e1)) != null) and (($cur | index($e2)) != null))' \
    "$SETTINGS")

if [[ "$covered" == "true" ]]; then
    ALLOWLIST_MSG="covered (blanket tools/ entry or per-skill pair already present; nothing appended)"
else
    # Append entries preserving existing ordering — `unique_by`
    # would sort as a side effect.
    jq \
        --arg e1 "$entry1" \
        --arg e2 "$entry2" \
        '.permissions.allow as $cur
         | .permissions.allow = (
            $cur + (
                [$e1, $e2]
                | map(select(. as $x | ($cur | index($x)) == null))
            )
         )' "$SETTINGS" > "$SETTINGS.tmp"
    mv "$SETTINGS.tmp" "$SETTINGS"
    ALLOWLIST_MSG="appended $entry1"
fi

# Stamp scaffolded_at.
jq --arg now "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
    '.scaffolded_at = $now' "$DECISIONS" > "$DECISIONS.tmp"
mv "$DECISIONS.tmp" "$DECISIONS"

# ---------------------------------------------------------------------
# Summary.
# ---------------------------------------------------------------------
echo "Scaffolded skill: $NAME"
echo "  SKILL.md:    $SKILL_DIR/SKILL.md"
if [[ "$FANOUT" == "true" ]]; then
    jq -r '.answers.fanout.workers[] | "  reference:   '"$SKILL_DIR"'/references/" + . + ".md"' "$DECISIONS"
fi
if [[ "$STATE_SHAPE" == "json" ]]; then
    echo "  schema:      $SKILL_DIR/assets/$NAME-schema.md"
fi
jq -r '.answers.helpers[] | "  helper:      '"$TOOLS_DIR"'/" + . + ".sh"' "$DECISIONS"
echo "  decisions:   $SKILL_DIR/decisions.md"
echo "  allowlist:   $ALLOWLIST_MSG"
echo
echo "Open the SKILL.md and replace the TODO markers."
