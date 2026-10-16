#!/usr/bin/env bash
# build-blind-pack.sh - the blind comparison pack for Ben's quality judgement:
# for each run of one corpus, the closing plan and a word diff of the edits
# applied to the frozen pages, labelled by letter. The letter-to-run key goes
# to a separate folder so the judge does not see it while judging.
#
# Usage: bash build-blind-pack.sh <C1|C3> <run id>...
# Writes blind-pack/<corpus>/<letter>/{plan.md, applied.diff} and
# blind-pack-key/<corpus>.json. The letter order comes from a hash of the
# run ids, so it is stable but unrelated to the experiment order.

set -uo pipefail
E="$HOME/trade-imports-arch-workspace/analysis/editorial-efficiency/experiments"
W="$HOME/trade-imports-arch-workspace/.claude/workareas/editorial-triage"
C="${1:?corpus C1 or C3}"; shift
[[ $# -ge 2 ]] || { echo "build-blind-pack: give at least two run ids" >&2; exit 1; }
OUT="$E/blind-pack/$C"; KEY="$E/blind-pack-key"
rm -rf "$OUT"; mkdir -p "$OUT" "$KEY"
ORDER=$(for r in "$@"; do printf '%s %s\n' "$(printf '%s' "blind-$r" | shasum | cut -c1-12)" "$r"; done | sort | awk '{print $2}')
LETTERS=(A B C D E F G H I J K L)
i=0; KEYJSON='{}'
for r in $ORDER; do
  L=${LETTERS[$i]}; i=$((i+1))
  mkdir -p "$OUT/$L"
  anon() { sed -e "s/exp-$r/run-$L/g" -e "s|runs/$r/|runs/$L/|g" -e "s/-$r/-$L/g"; }
  if [[ -f "$W/exp-$r/closing/plan.md" ]]; then anon < "$W/exp-$r/closing/plan.md" > "$OUT/$L/plan.md"; else echo "(no plan)" > "$OUT/$L/plan.md"; fi
  : > "$OUT/$L/applied.diff"
  for f in "$E/runs/$r"/pages/0[2]*.md; do
    b=$(basename "$f"); edited="$f"
    [[ -f "$E/runs/$r/applied-$b" ]] && edited="$E/runs/$r/applied-$b"
    git diff --no-index --word-diff=plain --unified=1 "$E/corpus/5fc8cd2/$b" "$edited" 2>/dev/null \
      | sed -e "s|$E/corpus/5fc8cd2/|original/|g" -e "s|$E/runs/$r/pages/|edited/|g" -e "s|$E/runs/$r/applied-|edited/|g" >> "$OUT/$L/applied.diff"
  done
  KEYJSON=$(jq -c --arg l "$L" --arg r "$r" '. + {($l): $r}' <<< "$KEYJSON")
done
jq . <<< "$KEYJSON" > "$KEY/$C.json"
printf 'build-blind-pack: %s runs into %s; key in %s\n' "$#" "${OUT/#$HOME/~}" "${KEY/#$HOME/~}/$C.json"
