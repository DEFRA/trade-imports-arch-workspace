#!/usr/bin/env bash
# build-review-packet.sh - one work packet for every reviewer of a run (X2):
# the review brief, every source the brief names (the schema by its
# reviewer-set section only), explain and rewrite, and the run's documents
# with line numbers. A reviewer reads this one file instead of discovering
# and reading a dozen.
#
# Usage: bash build-review-packet.sh <run id>
# Writes runs/<run id>/review-packet.md and prints its size.

set -uo pipefail
E="$HOME/trade-imports-arch-workspace/analysis/editorial-efficiency/experiments"
C="$HOME/trade-imports-arch-workspace/.claude"
RUN="${1:?run id}"; D="$E/runs/$RUN"
[[ -d "$D/pages" ]] || { echo "build-review-packet: no pages in $D (run prepare-run.sh first)" >&2; exit 1; }
OUT="$D/review-packet.md"

section() {  # $1 title, $2 file, [$3 sed range]
  printf '\n\n===== %s =====\n(source: %s)\n\n' "$1" "${2/#$HOME/~}"
  if [[ -n "${3:-}" ]]; then sed -n "$3" "$2"; else cat "$2"; fi
}
numbered() {  # $1 title, $2 file: line-numbered as the Read tool shows it
  printf '\n\n===== %s =====\n(source: %s; line numbers as the Read tool gives them)\n\n' "$1" "${2/#$HOME/~}"
  awk '{ printf "%6d\t%s\n", NR, $0 }' "$2"
}

{
  printf '# Review work packet, run %s\n\nEverything a reviewer of this run needs, in one file: the brief, the sources it names, and the documents. Cite page lines from the numbered copies below.\n' "$RUN"
  section "Review brief" "$C/skills/editorial/references/review-brief.md"
  section "language.md" "$C/best-practices/writing/language.md"
  section "ubiquitous-language.md" "$C/best-practices/writing/ubiquitous-language.md"
  section "snapshot-authoring.md" "$C/best-practices/writing/snapshot-authoring.md"
  section "document-types.md" "$C/skills/editorial/references/document-types.md"
  section "editorial-triage-schema.md, Reviewer-set fields" "$C/skills/editorial-triage/assets/editorial-triage-schema.md" '27,69p'
  section "explain-and-rewrite.md" "$C/skills/editorial/references/explain-and-rewrite.md"
  for f in "$D"/pages/*.md; do numbered "Document $(basename "$f")" "$f"; done
} > "$OUT"
printf 'build-review-packet: %s, %s lines, %s bytes\n' "${OUT/#$HOME/~}" "$(wc -l < "$OUT" | tr -d ' ')" "$(wc -c < "$OUT" | tr -d ' ')"
