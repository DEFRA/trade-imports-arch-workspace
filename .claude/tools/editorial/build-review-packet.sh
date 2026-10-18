#!/usr/bin/env bash
# build-review-packet.sh - one work packet for every reviewer of an editorial
# review: the review brief, every source the brief names (the record contract
# by its reviewer-set section only), explain and rewrite, and the documents
# under review with line numbers as the Read tool gives them. A reviewer reads
# this one file instead of discovering and reading a dozen.
#
# Usage: build-review-packet.sh --out <packet.md> [--context <page.md>]... <doc.md>...
#
# A --context page is read but not reviewed (for example the shared rules the
# reviewed pages link into); it is numbered after the documents.
#
# Sections are cut by heading, so an edit to the brief or the contract moves
# with them. Prints the packet path, lines and bytes. Exit: 0 written, 1 usage
# or a missing source.

set -uo pipefail
C="$HOME/trade-imports-arch-workspace/.claude"
OUT=""
DOCS=()
CONTEXT=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --out) OUT="${2:?--out needs a path}"; shift 2 ;;
    --context) CONTEXT+=("${2:?--context needs a path}"); shift 2 ;;
    -h|--help) sed -n '2,16p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    -*) echo "build-review-packet: unknown flag $1 (see --help)" >&2; exit 1 ;;
    *) DOCS+=("$1"); shift ;;
  esac
done
[[ -n "$OUT" ]] || { echo "build-review-packet: give --out <packet.md>" >&2; exit 1; }
[[ ${#DOCS[@]} -ge 1 ]] || { echo "build-review-packet: give at least one document" >&2; exit 1; }

BRIEF="$C/skills/editorial/references/review-brief.md"
CONTRACT="$C/skills/editorial-triage/assets/editorial-triage-schema.md"
SOURCES=("$BRIEF" "$C/best-practices/writing/language.md" "$C/best-practices/writing/ubiquitous-language.md"
         "$C/best-practices/writing/snapshot-authoring.md" "$C/skills/editorial/references/document-types.md"
         "$CONTRACT" "$C/skills/editorial/references/explain-and-rewrite.md")
for f in "${SOURCES[@]}"; do
  [[ -f "$f" ]] || { echo "build-review-packet: source missing: ${f/#$HOME/~} (incomplete checkout - run make check)" >&2; exit 1; }
done
for d in "${DOCS[@]}" ${CONTEXT[@]+"${CONTEXT[@]}"}; do
  [[ -f "${d/#\~/$HOME}" ]] || { echo "build-review-packet: no document at $d" >&2; exit 1; }
done
grep -q '^### Reviewer-set fields' "$CONTRACT" || { echo "build-review-packet: the contract has no '### Reviewer-set fields' section" >&2; exit 1; }

section() {  # $1 title, $2 file; stdin overrides the file's content when $3 is "-"
  printf '\n\n===== %s =====\n(source: %s)\n\n' "$1" "${2/#$HOME/~}"
  if [[ "${3:-}" == "-" ]]; then cat; else cat "$2"; fi
}
numbered() {  # $1 file, $2 heading word: line-numbered as the Read tool shows it
  printf '\n\n===== %s %s =====\n(source: %s; line numbers as the Read tool gives them)\n\n' "$2" "$(basename "$1")" "${1/#$HOME/~}"
  awk '{ printf "%6d\t%s\n", NR, $0 }' "$1"
}

mkdir -p "$(dirname "${OUT/#\~/$HOME}")"
TMP="${OUT/#\~/$HOME}.tmp"
{
  printf '# Review work packet\n\nEverything a reviewer of this run needs, in one file: the review brief, the sources it names, and the documents. Cite page lines from the numbered copies below.\n'
  section "Review brief" "$BRIEF"
  section "language.md" "$C/best-practices/writing/language.md"
  section "ubiquitous-language.md" "$C/best-practices/writing/ubiquitous-language.md"
  section "snapshot-authoring.md" "$C/best-practices/writing/snapshot-authoring.md"
  section "document-types.md" "$C/skills/editorial/references/document-types.md"
  awk '/^### Reviewer-set fields/{ on = 1; print; next } on && /^##/{ exit } on' "$CONTRACT" | section "editorial-triage-schema.md, Reviewer-set fields" "$CONTRACT" -
  section "explain-and-rewrite.md" "$C/skills/editorial/references/explain-and-rewrite.md"
  for d in "${DOCS[@]}"; do numbered "${d/#\~/$HOME}" "Document"; done
  for d in ${CONTEXT[@]+"${CONTEXT[@]}"}; do numbered "${d/#\~/$HOME}" "Context document, not under review,"; done
} > "$TMP"
mv "$TMP" "${OUT/#\~/$HOME}"
P="${OUT/#\~/$HOME}"
printf 'build-review-packet: %s, %s lines, %s bytes\n' "${P/#$HOME/~}" "$(wc -l < "$P" | tr -d ' ')" "$(wc -c < "$P" | tr -d ' ')"
