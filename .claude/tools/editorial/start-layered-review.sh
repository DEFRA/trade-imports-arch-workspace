#!/usr/bin/env bash
# start-layered-review.sh - set up one layered editorial review: hash every
# page before anything reads it, build the work packet with the layer cards,
# and make the review folder the loader's forks write into.
# Boundary: this script only prepares; the editorial skill spawns the LAYERED_LOADER,
# and assemble-review.sh builds the review result from the forks' files.
#
# Usage: start-layered-review.sh --run-id <id> [--since <earlier run id>]
#          [--context <page.md>]... [--profile <editorial-profile.md>]
#          [--settled <earlier triage workarea>] [--pointers <pointers.md>] <doc.md>...
#
# --profile takes the document set's editorial profile. When the profile
# names preferred names, the names check runs first and stops while any
# replaced name remains, because a settled name needs no reviewer: rename
# with check-names.sh --fix, review the diff, then start again. The profile's
# context pages join any --context pages, and the packet carries its reader
# frame, defaults, run notes and names.
#
# --since re-reviews only what changed after an earlier run of the same pages:
# a page with a changed, new or removed paragraph is reviewed, with the
# paragraph pass limited to the changed and new paragraphs (none when the page
# only lost paragraphs); an unchanged page becomes a context page. The packet
# lists the changed lines and the earlier text of every removed or rewritten
# paragraph, so the page and set passes report only what the changes touch.
# --settled names the earlier run's triage workarea; its ignored and open
# findings go into the packet as settled, and no pass raises them again. Every
# run records its pages' paragraphs in paragraphs.json for the next --since.
#
# Writes ~/trade-imports-arch-workspace/.claude/workareas/editorial/layered/<id>/
# with hashes.json, paragraphs.json, scope.json, review-packet.md and review/,
# and prints one line per reviewed page with its key and, under --since, the
# changed lines. Exit: 0 ready, 1 usage or a missing page, 3 nothing changed.

set -uo pipefail
C="$HOME/trade-imports-arch-workspace/.claude"
RUN_ID="" SINCE="" POINTERS="" PROFILE="" SETTLED=""
DOCS=()
CONTEXT=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --run-id) RUN_ID="${2:?}"; shift 2 ;;
    --since) SINCE="${2:?}"; shift 2 ;;
    --context) CONTEXT+=("${2:?}"); shift 2 ;;
    --profile) PROFILE="${2:?}"; shift 2 ;;
    --settled) SETTLED="${2:?}"; shift 2 ;;
    --pointers) POINTERS="${2:?}"; shift 2 ;;
    -h|--help) awk 'NR == 1 { next } /^#/ { sub(/^# ?/, ""); print; next } { exit }' "$0"; exit 0 ;;
    -*) echo "start-layered-review: unknown flag $1 (see --help)" >&2; exit 1 ;;
    *) DOCS+=("$1"); shift ;;
  esac
done
[[ "$RUN_ID" =~ ^[a-z0-9][a-z0-9._-]*$ ]] || { echo "start-layered-review: give --run-id <id>, lowercase letters, digits, dots and dashes, such as ins-auth-2026-10-18" >&2; exit 1; }
[[ ${#DOCS[@]} -ge 1 ]] || { echo "start-layered-review: give the documents under review" >&2; exit 1; }
for d in "${DOCS[@]}"; do [[ -f "${d/#\~/$HOME}" ]] || { echo "start-layered-review: no page at $d" >&2; exit 1; }; done
LAYERED="$C/workareas/editorial/layered"
DIR="$LAYERED/$RUN_ID"
[[ -e "$DIR/review" && -n "$(ls -A "$DIR/review" 2>/dev/null)" ]] && { echo "start-layered-review: ${DIR/#$HOME/~}/review already holds files; choose a new run id" >&2; exit 1; }
PREV=""
if [[ -n "$SINCE" ]]; then
  PREV="$LAYERED/$SINCE/paragraphs.json"
  [[ -f "$PREV" ]] || { echo "start-layered-review: run $SINCE recorded no paragraphs; review the pages in full instead of --since" >&2; exit 1; }
fi
if [[ -n "$SETTLED" ]]; then
  SETTLED="${SETTLED/#\~/$HOME}"
  for f in closing/plan.json triage.json findings.json; do
    [[ -f "$SETTLED/$f" ]] || { echo "start-layered-review: ${SETTLED/#$HOME/~} holds no $f; give the triage workarea of the earlier run, after its plan" >&2; exit 1; }
  done
fi

if [[ -n "$PROFILE" ]]; then
  PROFILE="${PROFILE/#\~/$HOME}"
  PJ=$(bash "$C/tools/editorial/read-profile.sh" "$PROFILE") || exit 1
  if jq -e '.names | length > 0' <<< "$PJ" > /dev/null \
     && ! bash "$C/tools/editorial/check-names.sh" --profile "$PROFILE" "${DOCS[@]}"; then
    echo "start-layered-review: replaced names remain; run check-names.sh --fix --profile ${PROFILE/#$HOME/~} with the same pages, review the diff, then start again" >&2
    exit 1
  fi
  # The profile's context pages, unless a page is itself under review.
  while IFS= read -r p; do
    [[ -n "$p" ]] || continue
    under_review=0
    for d in "${DOCS[@]}"; do [[ "$(cd "$(dirname "${d/#\~/$HOME}")" && pwd)/$(basename "$d")" == "$p" ]] && under_review=1; done
    [[ $under_review -eq 1 ]] || CONTEXT+=("$p")
  done < <(jq -r '.contextPages[]' <<< "$PJ")
fi
mkdir -p "$DIR/review"

# Every page's paragraphs (one per non-blank line), for the next --since.
for d in "${DOCS[@]}"; do
  jq -R -s --arg page "$(basename "$d")" '{($page): (split("\n") | to_entries | map(select(.value | test("\\S"))) | map({line: (.key + 1), text: .value}))}' "${d/#\~/$HOME}"
done | jq -s 'add' > "$DIR/paragraphs.json"

# The scope: every page in full, or under --since the changed lines of each changed page.
if [[ -n "$PREV" ]]; then
  jq --slurpfile prev "$PREV" 'with_entries(.key as $p | .value |= ((map(.text)) as $now | ($prev[0][$p] // [] | map(.text)) as $old
      | [.[] | select(.text as $t | $old | index($t) | not) | .line] as $changed
      | {new: ($prev[0] | has($p) | not), changed: $changed,
         removed: ([([$old[] | select(. as $t | $now | index($t) | not)] | length) - ($changed | length), 0] | max)}))' \
    "$DIR/paragraphs.json" > "$DIR/scope.json"
else
  jq 'with_entries(.value |= {new: false, changed: "all", removed: 0})' "$DIR/paragraphs.json" > "$DIR/scope.json"
fi
REVIEW=()
for d in "${DOCS[@]}"; do
  n=$(jq -r --arg p "$(basename "$d")" '.[$p] | if .changed == "all" then 1 else (.changed | length) + .removed end' "$DIR/scope.json")
  if [[ "$n" -gt 0 ]]; then REVIEW+=("$d"); else CONTEXT+=("$d"); fi
done
if [[ ${#REVIEW[@]} -eq 0 ]]; then
  echo "start-layered-review: nothing changed since run $SINCE; no review needed"
  exit 3
fi

ABS=()
for d in "${REVIEW[@]}"; do ABS+=("${d/#\~/$HOME}"); done
bash "$C/tools/editorial-triage/build-triage.sh" --hash-pages "${ABS[@]}" > "$DIR/hashes.json.tmp" \
  || { echo "start-layered-review: hashing the pages failed" >&2; exit 1; }
mv "$DIR/hashes.json.tmp" "$DIR/hashes.json"

# A re-review's scope for the packet: what changed, with the earlier text of
# each removed or rewritten paragraph, and what the earlier triage settled.
if [[ -n "$PREV" ]]; then
  {
    printf 'This run re-reviews what changed since run %s. The paragraph pass reviews only the changed lines; the page and set passes report only findings that touch a changed line, or that a removed or rewritten paragraph caused, such as a broken flow, a lost definition or an orphaned reference.\n' "$SINCE"
    for d in "${REVIEW[@]}"; do
      jq -r --arg p "$(basename "$d")" --slurpfile prev "$PREV" --slurpfile now "$DIR/paragraphs.json" '
        ($now[0][$p] | map(.text)) as $nowt
        | "\n## \($p)\n", "Changed or new lines: \(.[$p].changed | if length == 0 then "none" else map(tostring) | join(", ") end)",
          (($prev[0][$p] // []) | map(select(.text as $t | $nowt | index($t) | not))
           | if length == 0 then empty else "Earlier text of removed or rewritten paragraphs:", (.[] | "- line \(.line) before: \(.text[0:400])") end)' \
        "$DIR/scope.json"
    done
  } > "$DIR/changes.md"
  ARGS_CHANGES=(--changes "$DIR/changes.md")
fi
if [[ -n "$SETTLED" ]]; then
  {
    printf 'The earlier review raised these findings and its triage closed them as ignored (I) or open with an owner (O). They are settled: raise none of them again, even where the wording still matches.\n\n'
    jq -r --slurpfile t "$SETTLED/triage.json" --slurpfile f "$SETTLED/findings.json" '
      ($t[0].clusters | map({(.id): .}) | add) as $cl | ($f[0].records | map({(.id): .}) | add) as $rec
      | .entries[] | select(.move == "I" or .move == "O")
      | ($cl[.cluster]) as $c | ($rec[$c.chosen // $c.members[0]]) as $r
      | "- \(.page) [\(.move), \($r.kind)] \"\($r.quote)\": \((.defect // "")[0:200])"' "$SETTLED/closing/plan.json"
  } > "$DIR/settled.md"
  ARGS_SETTLED=(--settled "$DIR/settled.md")
fi

ARGS=(--out "$DIR/review-packet.md" --cards "$C/skills/editorial/references/layer-cards.md")
ARGS+=(${ARGS_CHANGES[@]+"${ARGS_CHANGES[@]}"} ${ARGS_SETTLED[@]+"${ARGS_SETTLED[@]}"})
for c in ${CONTEXT[@]+"${CONTEXT[@]}"}; do ARGS+=(--context "$c"); done
[[ -z "$POINTERS" ]] || ARGS+=(--pointers "$POINTERS")
[[ -z "$PROFILE" ]] || ARGS+=(--profile "$PROFILE")
bash "$C/tools/editorial/build-review-packet.sh" "${ARGS[@]}" "${REVIEW[@]}" || exit 1

echo "start-layered-review: run $RUN_ID ready; packet ${DIR/#$HOME/~}/review-packet.md; review folder ${DIR/#$HOME/~}/review/"
[[ -z "$SINCE" ]] || echo "start-layered-review: since run $SINCE: ${#REVIEW[@]} of ${#DOCS[@]} pages changed; the rest are context"
for d in "${REVIEW[@]}"; do
  name=$(basename "$d")
  key=$(printf '%s' "${name%.md}" | sed -E 's/^([0-9]+[a-z]?)-.*/\1/')
  lines=$(jq -r --arg p "$name" '.[$p] | if .changed == "all" then "all" elif .new then "all (new page)"
    else ((if (.changed | length) == 0 then "none" else (.changed | map(tostring) | join(",")) end)
          + (if .removed > 0 then "; \(.removed) paragraph\(if .removed > 1 then "s" else "" end) removed" else "" end)) end' "$DIR/scope.json")
  echo "page: $key $name lines: $lines"
done
