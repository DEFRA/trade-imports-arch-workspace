#!/bin/bash
# Render one Mermaid source file and report whether it parses.
# Boundary — this renders a SINGLE source. To sweep a file tree and
# extract diagrams out of Markdown, use start-mermaid-check.sh, which
# calls this per diagram.
#
# Usage:
#   render-mermaid.sh --file <path> [--out <svg-path>] [--label <text>]
#   render-mermaid.sh --text '<diagram source>' [--label <text>]
#
# --text checks a diagram held in context without writing it to the
# repo first, so any agent that has just drafted a block can verify it
# in one call. No pipe needed, so it stays within Bash call hygiene.
#
# Exit 0 = renders. Exit 1 = does not render; the mermaid parser
# message is printed to stdout. Exit 2 = renderer environment broken
# (no mmdc/npx, fetch failure, missing Chrome) - not a verdict.
#
# Writes nothing unless --out is given (renders to a temp file and
# discards it).

set -e

FILE=""
TEXT=""
OUT=""
LABEL=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --file) FILE="$2"; shift 2 ;;
        --text) TEXT="$2"; shift 2 ;;
        --out) OUT="$2"; shift 2 ;;
        --label) LABEL="$2"; shift 2 ;;
        -h|--help)
            sed -n '2,19p' "$0" >&2
            exit 0 ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done

tmp_src=""
tmp_src_base=""
if [[ -n "$TEXT" ]]; then
    [[ -n "$FILE" ]] && { echo "Give --file or --text, not both" >&2; exit 1; }
    tmp_src_base=$(mktemp -t mermaid-check-src-XXXXXX)
    tmp_src="$tmp_src_base.mmd"
    printf '%s\n' "$TEXT" > "$tmp_src"
    FILE="$tmp_src"
    [[ -z "$LABEL" ]] && LABEL="(inline)"
fi

[[ -z "$FILE" ]] && { echo "Missing --file or --text" >&2; exit 1; }
[[ -f "$FILE" ]] || { echo "No such file: $FILE" >&2; exit 1; }
[[ -z "$LABEL" ]] && LABEL="$FILE"

WS="$HOME/trade-imports-arch-workspace"

# Resolve mmdc. Mirrors findMmdc() in
# delivery-info-arch-tooling/lib/diagrams/convert-mmd.js so both
# agree on which binary renders.
find_mmdc() {
    local lib="$WS/delivery-info-arch-tooling/node_modules/.bin/mmdc"
    [[ -x "$lib" ]] && { echo "$lib"; return; }
    local consumer="$WS/trade-imports-documentation/node_modules/.bin/mmdc"
    [[ -x "$consumer" ]] && { echo "$consumer"; return; }
    echo "npx:mmdc"
}

MMDC=$(find_mmdc)

tmp_out=""
tmp_out_base=""
if [[ -z "$OUT" ]]; then
    tmp_out_base=$(mktemp -t mermaid-check-XXXXXX)
    tmp_out="$tmp_out_base.svg"
    OUT="$tmp_out"
fi

err=$(mktemp -t mermaid-check-err-XXXXXX)

# Clean every temp (including extensionless mktemp bases) on any exit,
# interrupts included.
cleanup() {
    [[ -n "${tmp_out:-}" ]] && rm -f "$tmp_out"
    [[ -n "$tmp_out_base" ]] && rm -f "$tmp_out_base"
    [[ -n "${tmp_src:-}" ]] && rm -f "$tmp_src"
    [[ -n "${tmp_src_base:-}" ]] && rm -f "$tmp_src_base"
    rm -f "$err"
}
trap cleanup EXIT

set +e
if [[ "$MMDC" == "npx:mmdc" ]]; then
    # Last rung of the fallback chain must degrade gracefully, not
    # die raw (pattern 9 soft-probe rule).
    if ! command -v npx >/dev/null 2>&1; then
        echo "ERROR: no mmdc found and npx is not on PATH - install Node 22+ (or npm install in delivery-info-arch-tooling) to render Mermaid" >&2
        exit 2
    fi
    npx --yes @mermaid-js/mermaid-cli mmdc -i "$FILE" -o "$OUT" >/dev/null 2>"$err"
else
    "$MMDC" -i "$FILE" -o "$OUT" >/dev/null 2>"$err"
fi
rc=$?
set -e

# Note: mmdc exits 1 on a parse failure and writes no output file.
# Never pipe its invocation through another command to check status -
# the pipe's exit code masks it.
if [[ $rc -eq 0 ]]; then
    echo "PASS  $LABEL"
else
    # Classify PARSE failures first: every mmdc parse error prints a
    # Node stack full of puppeteer-core frames, so any env grep that
    # runs first would swallow genuine diagram failures.
    if ! grep -qiE 'parse error on line|expecting |no diagram type|unknowndiagramerror|lexical error' "$err"; then
        # Not parse vocabulary - check for an environment failure (npx
        # fetch failed, or a local mmdc without a usable Chrome). That
        # is NOT a diagram failure: reporting it in the FAIL vocabulary
        # would make one machine problem read as N broken diagrams.
        if grep -qiE 'npm err|registry|ENOTFOUND|ETIMEDOUT|EAI_AGAIN|could not determine executable|could not find chrome|failed to launch|timed out.*browser|protocolerror|browser was not found' "$err"; then
            echo "ERROR: renderer environment failure - not a diagram problem. If npx fetched nothing: restore network or npm install in delivery-info-arch-tooling; if a local mmdc lacks Chrome: npx puppeteer browsers install chrome." >&2
            exit 2
        fi
    fi
    # The parser message is the useful line; the puppeteer stack is not.
    reason=$(grep -m1 -iE 'error|expecting|unrecognized|no diagram type' "$err" || true)
    [[ -z "$reason" ]] && reason="render failed (exit $rc)"
    echo "FAIL  $LABEL"
    echo "      $reason"
fi

exit $rc
