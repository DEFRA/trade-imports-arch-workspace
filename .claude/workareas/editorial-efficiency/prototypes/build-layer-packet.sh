#!/usr/bin/env bash
# build-layer-packet.sh - the work packet for a layered review (R3): the
# review brief's shared sections (sources, rules for every reviewer, the
# finding, the retain record, compression patterns) without its gate step
# and role sections, the three layer cards, the layer 0 pointers, every
# source the brief names, and the run's documents with line numbers.
#
# Usage: bash build-layer-packet.sh <run id> [<layer cards file>]
# Needs runs/<run id>/layer0-pointers.md (layer0-pointers.py).
# Writes runs/<run id>/review-packet.md and prints its size.

set -uo pipefail
E="$HOME/trade-imports-arch-workspace/analysis/editorial-efficiency/experiments"
C="$HOME/trade-imports-arch-workspace/.claude"
RUN="${1:?run id}"; D="$E/runs/$RUN"; CARDS="${2:-$E/variants/layer-cards.md}"
[[ -d "$D/pages" ]] || { echo "build-layer-packet: no pages in $D (run prepare-run.sh first)" >&2; exit 1; }
[[ -f "$D/layer0-pointers.md" ]] || { echo "build-layer-packet: no layer0-pointers.md in $D" >&2; exit 1; }
BRIEF="$C/skills/editorial/references/review-brief.md"
GATE=$(grep -n '^## Gate' "$BRIEF" | cut -d: -f1)
COMP=$(grep -n '^## Compression patterns' "$BRIEF" | cut -d: -f1)
[[ -n "$GATE" && -n "$COMP" ]] || { echo "build-layer-packet: brief sections not found" >&2; exit 1; }
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
  printf '# Layered review work packet, run %s\n\nEverything a reviewer of this run needs, in one file: the brief'"'"'s shared sections, the layer cards, the layer 0 pointers, the sources the brief names, and the documents. Each pass applies its own layer card in place of the brief'"'"'s reviewer roles. Cite page lines from the numbered copies below.\n' "$RUN"
  section "Review brief, shared sections" "$BRIEF" "1,$((GATE - 1))p"
  section "Review brief, compression patterns" "$BRIEF" "${COMP},\$p"
  section "Layer cards" "$CARDS"
  section "Layer 0 pointers" "$D/layer0-pointers.md"
  section "language.md" "$C/best-practices/writing/language.md"
  section "ubiquitous-language.md" "$C/best-practices/writing/ubiquitous-language.md"
  section "snapshot-authoring.md" "$C/best-practices/writing/snapshot-authoring.md"
  section "document-types.md" "$C/skills/editorial/references/document-types.md"
  section "editorial-triage-schema.md, Reviewer-set fields" "$C/skills/editorial-triage/assets/editorial-triage-schema.md" '27,69p'
  section "explain-and-rewrite.md" "$C/skills/editorial/references/explain-and-rewrite.md"
  for f in "$D"/pages/*.md; do numbered "Document $(basename "$f")" "$f"; done
} > "$OUT"
printf 'build-layer-packet: %s, %s lines, %s bytes\n' "${OUT/#$HOME/~}" "$(wc -l < "$OUT" | tr -d ' ')" "$(wc -c < "$OUT" | tr -d ' ')"
