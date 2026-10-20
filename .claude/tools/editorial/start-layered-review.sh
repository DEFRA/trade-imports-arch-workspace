#!/usr/bin/env bash
# start-layered-review.sh - set up one layered editorial review: hash every
# page before anything reads it, build the work packet with the layer cards,
# and make the review folder the loader's forks write into.
# Boundary: this script only prepares; the editorial skill spawns the LAYERED_LOADER,
# and assemble-review.sh builds the review result from the forks' files.
#
# Usage: start-layered-review.sh --run-id <id> [--context <page.md>]...
#          [--pointers <pointers.md>] <doc.md>...
#
# Writes ~/trade-imports-arch-workspace/.claude/workareas/editorial/layered/<id>/
# with hashes.json, review-packet.md and review/, and prints the page keys the
# loader needs. Exit: 0 ready, 1 usage or a missing page.

set -uo pipefail
C="$HOME/trade-imports-arch-workspace/.claude"
RUN_ID="" POINTERS=""
DOCS=()
CONTEXT=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --run-id) RUN_ID="${2:?}"; shift 2 ;;
    --context) CONTEXT+=("${2:?}"); shift 2 ;;
    --pointers) POINTERS="${2:?}"; shift 2 ;;
    -h|--help) sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    -*) echo "start-layered-review: unknown flag $1 (see --help)" >&2; exit 1 ;;
    *) DOCS+=("$1"); shift ;;
  esac
done
[[ "$RUN_ID" =~ ^[a-z0-9][a-z0-9._-]*$ ]] || { echo "start-layered-review: give --run-id <id>, lowercase letters, digits, dots and dashes, such as ins-auth-2026-10-18" >&2; exit 1; }
[[ ${#DOCS[@]} -ge 1 ]] || { echo "start-layered-review: give the documents under review" >&2; exit 1; }
DIR="$C/workareas/editorial/layered/$RUN_ID"
[[ -e "$DIR/review" && -n "$(ls -A "$DIR/review" 2>/dev/null)" ]] && { echo "start-layered-review: ${DIR/#$HOME/~}/review already holds files; choose a new run id" >&2; exit 1; }
mkdir -p "$DIR/review"

ABS=()
for d in "${DOCS[@]}"; do ABS+=("${d/#\~/$HOME}"); done
bash "$C/tools/editorial-triage/build-triage.sh" --hash-pages "${ABS[@]}" > "$DIR/hashes.json.tmp" \
  || { echo "start-layered-review: hashing the pages failed" >&2; exit 1; }
mv "$DIR/hashes.json.tmp" "$DIR/hashes.json"

ARGS=(--out "$DIR/review-packet.md" --cards "$C/skills/editorial/references/layer-cards.md")
for c in ${CONTEXT[@]+"${CONTEXT[@]}"}; do ARGS+=(--context "$c"); done
[[ -z "$POINTERS" ]] || ARGS+=(--pointers "$POINTERS")
bash "$C/tools/editorial/build-review-packet.sh" "${ARGS[@]}" "${DOCS[@]}" || exit 1

echo "start-layered-review: run $RUN_ID ready; packet ${DIR/#$HOME/~}/review-packet.md; review folder ${DIR/#$HOME/~}/review/"
for d in "${DOCS[@]}"; do
  name=$(basename "$d")
  key=$(printf '%s' "${name%.md}" | sed -E 's/^([0-9]+[a-z]?)-.*/\1/')
  echo "page: $key $name"
done
