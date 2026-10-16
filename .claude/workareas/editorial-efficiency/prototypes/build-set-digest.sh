#!/usr/bin/env bash
# build-set-digest.sh - a digest of every document in a run (X3): headings,
# the first sentence of each paragraph and list item, and each table's header
# row and first column, with the source line numbers. A page reviewer reads
# its own page whole and the rest of the set through this digest.
#
# Usage: bash build-set-digest.sh <run id>
# Writes runs/<run id>/set-digest.md and prints its size.

set -uo pipefail
E="$HOME/trade-imports-arch-workspace/analysis/editorial-efficiency/experiments"
RUN="${1:?run id}"; D="$E/runs/$RUN"
[[ -d "$D/pages" ]] || { echo "build-set-digest: no pages in $D" >&2; exit 1; }
OUT="$D/set-digest.md"
{
  printf '# Set digest, run %s\n\nOne entry per source line kept: headings, the first sentence of each paragraph or list item, and table header rows and first cells. Line numbers are the source page'"'"'s. Open the page itself only to confirm a contradiction or a link.\n' "$RUN"
  for f in "$D"/pages/*.md; do
    printf '\n\n===== %s =====\n' "$(basename "$f")"
    awk '
      /^```/ { fence = !fence; next }
      fence { next }
      /^#/ { printf "%d: %s\n", NR, $0; next }
      /^\|/ {
        if ($0 ~ /^\| *-/) next
        n = split($0, c, "|"); cell = c[2]; gsub(/^ +| +$/, "", cell)
        if (!intable) { printf "%d: %s\n", NR, $0; intable = 1 } else printf "%d: | %s | ...\n", NR, cell
        next
      }
      { intable = 0 }
      /^[[:space:]]*$/ { next }
      /^<!--/ { next }
      {
        s = $0; sub(/^[-*] |^[0-9]+\. /, "", s)
        if (match(s, /[.!?] /)) s = substr(s, 1, RSTART)
        if (length(s) > 220) s = substr(s, 1, 220) "..."
        printf "%d: %s\n", NR, s
      }' "$f"
  done
} > "$OUT"
printf 'build-set-digest: %s, %s lines, %s bytes\n' "${OUT/#$HOME/~}" "$(wc -l < "$OUT" | tr -d ' ')" "$(wc -c < "$OUT" | tr -d ' ')"
