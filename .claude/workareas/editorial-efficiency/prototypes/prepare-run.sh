#!/usr/bin/env bash
# prepare-run.sh - set up one experiment run: a fresh copy of the corpus
# pages, the review arguments with the run's own page paths, the triage
# workarea name and the start time the measurement window opens at.
#
# Usage: bash prepare-run.sh <run id> <C1|C3> [<variant args json>]
#
# Writes runs/<run id>/pages/, runs/<run id>/args.json and
# runs/<run id>/run.json ({run, corpus, started, workarea}). A variant args
# file is merged over the corpus arguments (for an experiment that changes
# the frame, the notes or adds arguments a variant workflow reads).

set -uo pipefail
E="$HOME/trade-imports-arch-workspace/analysis/editorial-efficiency/experiments"
CORPUS="$E/corpus/5fc8cd2"
RUN="${1:?run id}"; C="${2:?corpus C1 or C3}"; VARIANT="${3:-}"
case "$C" in
  C1) REVIEWED="02b-ins-auth-session-record" ;;
  C3) REVIEWED="02a-ins-auth-session-service-design 02b-ins-auth-session-record 02c-ins-auth-session-api" ;;
  *) echo "prepare-run: corpus must be C1 or C3" >&2; exit 1 ;;
esac
D="$E/runs/$RUN"
[[ -e "$D" ]] && { echo "prepare-run: $D exists; choose a new run id" >&2; exit 1; }
mkdir -p "$D/pages"
cp "$CORPUS/00-ins-auth-foundations.md" "$D/pages/"
DOCS=()
for p in $REVIEWED; do
  cp "$CORPUS/$p.md" "$D/pages/"
  DOCS+=("~/trade-imports-arch-workspace/analysis/editorial-efficiency/experiments/runs/$RUN/pages/$p.md")
done
jq '. + {docs: $ARGS.positional}' "$E/args/$C.json" --args "${DOCS[@]}" > "$D/args.json"
if [[ -n "$VARIANT" ]]; then jq -s '.[0] * .[1]' "$D/args.json" "$VARIANT" > "$D/args.tmp" && mv "$D/args.tmp" "$D/args.json"; fi
jq -n --arg run "$RUN" --arg c "$C" --arg t "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  '{run: $run, corpus: $c, started: $t, workarea: ("~/trade-imports-arch-workspace/.claude/workareas/editorial-triage/exp-" + $run)}' > "$D/run.json"
echo "prepare-run: $RUN ($C) ready at $D"
cat "$D/run.json"
