#!/usr/bin/env bash
# Pre-flight (and executor) for publishing one docs page to Confluence.
#
# Default mode - pre-flight only. Checks: page exists and is under docs/,
# credentials present, Confluence API reachable, page listed in publishPaths
# (the publisher silently publishes nothing for unlisted files), target space
# resolvable, diagram PNGs present. Emits "MODE: READY" plus FACT lines
# (including the exact build and publish commands to run), or "MODE: BLOCKED"
# plus REASON lines.
#
# --publish mode - re-runs the same checks, additionally requires every
# diagram PNG to be present, then execs the doc repo's npm publish for the
# page. Credential bridging happens here: the node publisher reads only
# CONFLUENCE_USERNAME/CONFLUENCE_API_TOKEN, so JIRA_USER/JIRA_TOKEN (the
# convention of the .claude/tools/confluence and jira hand tools) are mapped
# across inside this script, and credentials never appear in a typed command.
#
# Never prints credential values - only variable names and HTTP status codes.
#
# Paths: the canonical workspace root is ~/trade-imports-arch-workspace (a
# symlink on machines where the checkout lives elsewhere). Script bodies use
# the $HOME-literal form; emitted commands use the ~ form so they match the
# permission allowlist verbatim. trade-imports-documentation/ and
# delivery-info-arch-tooling/ are children of the root.
#
# Usage:
#   start-confluence-publish.sh [--publish] <page-path>
#   <page-path> may be absolute, repo-relative, or docs/-relative.

set -euo pipefail

ROOT="$HOME/trade-imports-arch-workspace"
DOC_REPO="$ROOT/trade-imports-documentation"
CONFIG="$DOC_REPO/scripts/confluence/confluence-config.json"
CONFLUENCE_URL="${CONFLUENCE_URL:-https://eaflood.atlassian.net}"
# ~-spelled forms for emitted commands (matched literally by the allowlist).
TROOT='~/trade-imports-arch-workspace'
TSELF="$TROOT/.claude/tools/confluence-publish/start-confluence-publish.sh"
TDOC="$TROOT/trade-imports-documentation"

blocked() {
    echo "MODE: BLOCKED"
    local r
    for r in "$@"; do printf 'REASON: %s\n' "$r"; done
    exit 0
}

DO_PUBLISH="no"
if [[ "${1:-}" == "--publish" ]]; then
    DO_PUBLISH="yes"
    shift
fi

[[ -d "$DOC_REPO" ]] || blocked "doc repo not found at $DOC_REPO (is the canonical symlink in place? ln -s <checkout> ~/trade-imports-arch-workspace)"
# Pattern 9 pre-flight: the publisher lives in the tooling repo, reached
# through the doc repo's file:../ npm link — check both, with remedies.
TOOLING="$ROOT/delivery-info-arch-tooling"
[[ -d "$TOOLING" ]] || blocked "tooling repo not found at $TOOLING - the publisher lives there (clone it: make -C ~/trade-imports-arch-workspace clone)"
[[ -e "$DOC_REPO/node_modules/@defra/delivery-info-arch-tooling" ]] || blocked "doc repo not installed - node_modules/@defra/delivery-info-arch-tooling missing or dangling (run: npm --prefix ~/trade-imports-arch-workspace/trade-imports-documentation install)"
command -v npm >/dev/null 2>&1 || blocked "npm not found on PATH - the build and publish commands run through npm (install Node 22+)"
[[ $# -ge 1 && -n "${1:-}" ]] || blocked "usage: start-confluence-publish.sh [--publish] <page-path>"

RAW="$1"

# --- Resolve the page to an absolute path, then to its docs/-anchored form ---
if [[ -f "$RAW" ]]; then
    ABS="$(cd "$(dirname "$RAW")" && pwd -P)/$(basename "$RAW")"
elif [[ -f "$DOC_REPO/$RAW" ]]; then
    ABS="$DOC_REPO/$RAW"
elif [[ -f "$DOC_REPO/docs/$RAW" ]]; then
    ABS="$DOC_REPO/docs/$RAW"
else
    blocked "page not found: $RAW (tried as given, under $DOC_REPO/, and under $DOC_REPO/docs/)"
fi

# Compare canonically so symlinked and real forms of the same file agree.
CANON_DOC_REPO="$(cd -P "$DOC_REPO" && pwd)"
case "$ABS" in
    "$DOC_REPO"/docs/*) PAGE="${ABS#"$DOC_REPO"/}" ;;
    "$CANON_DOC_REPO"/docs/*) PAGE="${ABS#"$CANON_DOC_REPO"/}" ;;
    *) blocked "page is not under $DOC_REPO/docs/ - only docs/ content publishes: $ABS" ;;
esac
REL="${PAGE#docs/}"

# --- Credentials: CONFLUENCE_* preferred, JIRA_* accepted (names only, never values) ---
CONFLUENCE_USERNAME="${CONFLUENCE_USERNAME:-${JIRA_USER:-}}"
CONFLUENCE_API_TOKEN="${CONFLUENCE_API_TOKEN:-${JIRA_TOKEN:-}}"
export CONFLUENCE_USERNAME CONFLUENCE_API_TOKEN
MISSING=()
[[ -n "$CONFLUENCE_USERNAME" ]] || MISSING+=("CONFLUENCE_USERNAME (or JIRA_USER)")
[[ -n "$CONFLUENCE_API_TOKEN" ]] || MISSING+=("CONFLUENCE_API_TOKEN (or JIRA_TOKEN)")
if ((${#MISSING[@]} > 0)); then
    blocked "missing environment variables: ${MISSING[*]} (export them in the shell and re-run; values are never printed)"
fi

# --- Confluence reachable and credentials valid: status code only ---
STATUS=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 \
    -u "$CONFLUENCE_USERNAME:$CONFLUENCE_API_TOKEN" \
    "$CONFLUENCE_URL/wiki/rest/api/space?limit=1" || echo "000")
if [[ "$STATUS" != "200" ]]; then
    blocked "Confluence API check failed: HTTP $STATUS from $CONFLUENCE_URL/wiki/rest/api/space (401/403 = credentials rejected, 000 = network/timeout)"
fi

# --- Config present, page listed in publishPaths (exact match or glob entry) ---
[[ -f "$CONFIG" ]] || blocked "config not found: $CONFIG"
MEMBER="no"
while IFS= read -r ENTRY; do
    # Unquoted RHS makes [[ == ]] glob-match, so wildcard entries in
    # publishPaths (e.g. ".../API Calls/**/*.md") match here too.
    if [[ "$REL" == "$ENTRY" || "$REL" == $ENTRY ]]; then
        MEMBER="yes"
        break
    fi
done < <(jq -r '.publishPaths[].path' "$CONFIG")
if [[ "$MEMBER" != "yes" ]]; then
    blocked "page is not listed in publishPaths ($CONFIG)" \
        "the publisher exits 0 having published nothing for unlisted files - add an entry with path: $REL"
fi

# --- Target space (mirrors hierarchy-manager: systems/<Name>/ or top folder) ---
TOP="${REL%%/*}"
if [[ "$TOP" == "systems" ]]; then
    SYS=$(echo "$REL" | cut -d/ -f2)
else
    SYS="$TOP"
fi
SPACE=$(jq -r --arg k "$SYS" '.spaceMapping[$k] // empty' "$CONFIG")
[[ -n "$SPACE" ]] || blocked "no spaceMapping entry for '$SYS' in $CONFIG"

# --- Diagram inventory: what the page embeds vs what exists on disk ---
LIKEC4_IDS=$(grep -o '<LikeC4View[^>]*viewId="[^"]*"' "$ABS" 2>/dev/null | sed 's/.*viewId="\([^"]*\)".*/\1/' | sort -u || true)
MERMAID_IDS=$(grep -o '<MermaidDiagram[^>]*diagramId="[^"]*"' "$ABS" 2>/dev/null | sed 's/.*diagramId="\([^"]*\)".*/\1/' | sort -u || true)
FENCED=$(grep -c '^```mermaid' "$ABS" || true)

NEED_MMD="no"
NEED_C4="no"
DIAGRAM_LINES=()
for ID in $LIKEC4_IDS; do
    if [[ -f "$DOC_REPO/generated/diagrams/$ID.png" ]]; then
        DIAGRAM_LINES+=("LIKEC4_VIEW: $ID png=present")
    else
        DIAGRAM_LINES+=("LIKEC4_VIEW: $ID png=MISSING")
        NEED_C4="yes"
    fi
done
for ID in $MERMAID_IDS; do
    if [[ -f "$DOC_REPO/generated/diagrams/$ID.png" ]]; then
        DIAGRAM_LINES+=("MERMAID_COMPONENT: $ID png=present")
    else
        DIAGRAM_LINES+=("MERMAID_COMPONENT: $ID png=MISSING")
        NEED_MMD="yes"
    fi
done

BUILD_NEEDED="none"
if [[ "$NEED_MMD" == "yes" && "$NEED_C4" == "yes" ]]; then
    BUILD_NEEDED="build:mmd build:diagrams"
elif [[ "$NEED_MMD" == "yes" ]]; then
    BUILD_NEEDED="build:mmd"
elif [[ "$NEED_C4" == "yes" ]]; then
    BUILD_NEEDED="build:diagrams"
fi

# --- Publish mode: refuse while builds are pending, then exec the publisher ---
if [[ "$DO_PUBLISH" == "yes" ]]; then
    if [[ "$BUILD_NEEDED" != "none" ]]; then
        blocked "diagram exports missing ($BUILD_NEEDED) - run the build commands and re-run --publish" \
            "builds: npm --prefix $TDOC run ${BUILD_NEEDED// / and npm --prefix $TDOC run }"
    fi
    echo "MODE: PUBLISHING"
    echo "PAGE: $PAGE"
    echo "SPACE: $SPACE"
    echo "CONFLUENCE_BASE: $CONFLUENCE_URL/wiki"
    # cd -P canonicalises through the root symlink so npm sees one path identity.
    cd -P "$DOC_REPO"
    exec npm run publish:confluence -- --file "$PAGE"
fi

# --- Verdict: command FACT lines are ~-spelled so they match the allowlist ---
echo "MODE: READY"
echo "PAGE: $PAGE"
echo "SPACE: $SPACE"
echo "CONFLUENCE_BASE: $CONFLUENCE_URL/wiki"
for LINE in "${DIAGRAM_LINES[@]+"${DIAGRAM_LINES[@]}"}"; do echo "$LINE"; done
echo "FENCED_MERMAID_BLOCKS: ${FENCED:-0}"
echo "BUILD_NEEDED: $BUILD_NEEDED"
if [[ "$NEED_MMD" == "yes" ]]; then
    echo "BUILD_CMD: npm --prefix $TDOC run build:mmd"
fi
if [[ "$NEED_C4" == "yes" ]]; then
    echo "BUILD_CMD: npm --prefix $TDOC run build:diagrams"
fi
echo "PUBLISH_CMD: $TSELF --publish \"$PAGE\""