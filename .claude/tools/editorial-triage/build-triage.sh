#!/usr/bin/env bash
# build-triage.sh - normalise an editorial review result into triage state:
# one record per finding, anchors resolved against the pages, rewrites gated,
# clusters, buckets and ranks computed.
#
# Usage:
#   bash build-triage.sh --from-run <run-record.json | run-id> --dir <workarea> [--commit <sha>] [--params '<json>']
#   bash build-triage.sh --from-review <dir-with-review/*.json> --dir <workarea> [--commit <sha>] [--params '<json>']
#
# --from-run reads the harness run record (its .result) or a bare result
# {units, structural, editorPass}; a run id is searched for under
# ~/.claude/projects/*/workflows/<id>.json. A v2 result (version 2: findings in
# the contract's fields, structural {findings, redundancies}, editorPass {pages,
# order, patterns}) is normalised by lib/normalize-v2.jq. A pre-v2 result is
# marked legacy and a review/<page>.classified.json in the workarea overlays
# the v2 fields (lib/normalize-legacy.jq).
# Writes review.json, findings.json, triage.json, index.json, manifest.json
# into the workarea (atomic: temp file then mv).
# Exit: 0 ok, 1 usage or missing input (message names the remedy), 2 validation failure.
#
# Contract: ~/trade-imports-arch-workspace/.claude/skills/editorial-triage/assets/editorial-triage-schema.md

set -uo pipefail
export LC_ALL=C

ROOT="$HOME/trade-imports-arch-workspace"
LIB="$ROOT/.claude/tools/editorial-triage/lib"
GATE="$ROOT/.claude/tools/editorial/check-prose.sh"
BUILDER="build-triage v1"

usage() { sed -n '2,22p' "$0" | sed 's/^# \{0,1\}//'; }
die() { printf 'build-triage: %s\n' "$1" >&2; exit "${2:-1}"; }
say() { printf 'build-triage: %s\n' "$1"; }

FROM_RUN=""; FROM_REVIEW=""; DIR=""; COMMIT=""; PARAMS="{}"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --from-run) FROM_RUN="$2"; shift 2 ;;
    --from-review) FROM_REVIEW="$2"; shift 2 ;;
    --dir) DIR="$2"; shift 2 ;;
    --commit) COMMIT="$2"; shift 2 ;;
    --params) PARAMS="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) die "unknown argument: $1 (see --help)" ;;
  esac
done

[[ -z "$DIR" ]] && die "missing --dir <workarea>; use ~/trade-imports-arch-workspace/.claude/workareas/editorial-triage/<run>"
DIR="${DIR/#\~/$HOME}"
command -v jq >/dev/null 2>&1 || die "jq is required (baseline tool); install jq and re-run"
[[ -f "$GATE" ]] || die "prose gate not found at $GATE; the editorial tools must be present"

atomic_write() {  # $1 target path; stdin content
  local tmp="$1.tmp.$$"
  cat > "$tmp" || return 1
  mv "$tmp" "$1"
}

expand_tilde() { printf '%s' "${1/#\~/$HOME}"; }

# ---------------------------------------------------------------- ingest
[[ -n "$FROM_RUN" || -n "$FROM_REVIEW" ]] || die "missing --from-run <run record or id> or --from-review <dir>"
mkdir -p "$DIR" || die "cannot create $DIR"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

LEGACY=false
SOURCE_KIND=""; SOURCE_PATH=""
if [[ -n "$FROM_RUN" ]]; then
  RUN_FILE="$(expand_tilde "$FROM_RUN")"
  if [[ ! -f "$RUN_FILE" ]]; then
    FOUND=$(ls "$HOME"/.claude/projects/*/*/workflows/"$FROM_RUN".json "$HOME"/.claude/projects/*/workflows/"$FROM_RUN".json 2>/dev/null | head -n 1)
    [[ -n "$FOUND" ]] || die "run record not found: $FROM_RUN (give a path, or a run id such as wf_f07b54c5-79b present under ~/.claude/projects/*/workflows/)"
    RUN_FILE="$FOUND"
  fi
  jq -e . "$RUN_FILE" >/dev/null 2>&1 || die "run record is not valid JSON: $RUN_FILE"
  if jq -e '.result | type == "object"' "$RUN_FILE" >/dev/null 2>&1; then
    jq '.result' "$RUN_FILE" | atomic_write "$DIR/review.json"
  else
    jq '.' "$RUN_FILE" | atomic_write "$DIR/review.json"
  fi
  SOURCE_KIND="run-record"; SOURCE_PATH="$RUN_FILE"
  if jq -e '.units | type == "array"' "$DIR/review.json" >/dev/null 2>&1; then
    # v2 results say so (version 2) and their findings carry kind; legacy findings carry category only
    if jq -e '((.version // 0) >= 2) or ([.units[].findings[]? | has("kind")] | any)' "$DIR/review.json" >/dev/null 2>&1; then LEGACY=false; else LEGACY=true; fi
  else
    die "review.json has no units array; expected {units, structural, editorPass}"
  fi
else
  REVIEW_DIR="$(expand_tilde "$FROM_REVIEW")"
  ls "$REVIEW_DIR"/review/*.json >/dev/null 2>&1 || die "no review/*.json under $REVIEW_DIR"
  jq -s '{units: [ .[] | select(.reviewer | startswith("drill")) | {unit: .page, path: .path, findings: .items} ],
          structural: {redundancies: [], structure: [], crossReferences: [], shapes: []},
          editorPass: null,
          extra: [ .[] | select(.reviewer | startswith("drill") | not) ]}' "$REVIEW_DIR"/review/*.json \
    | atomic_write "$DIR/review.json"
  SOURCE_KIND="review-dir"; SOURCE_PATH="$REVIEW_DIR"; LEGACY=false
fi

# pages: {page, path, no}
jq -c --arg home "$HOME" '[ .units[] | (.path | sub("^~/"; $home + "/")) as $p
         | {page: ($p | split("/") | last), path: $p,
            no: (($p | split("/") | last | capture("^(?<n>[0-9]{2})") | .n) // "xx")} ]
       | unique_by(.page)' "$DIR/review.json" > "$TMP/pages.json"
MISSING=$(jq -r '.[].path' "$TMP/pages.json" | while IFS= read -r p; do [[ -f "$p" ]] || printf '%s\n' "$p"; done)
[[ -z "$MISSING" ]] || die "page file(s) not found; check the docs repo is present and on the reviewed commit:
$MISSING"

# ---------------------------------------------------------------- normalise
if $LEGACY; then
  jq --argjson pages "$(cat "$TMP/pages.json")" -f "$LIB/normalize-legacy.jq" "$DIR/review.json" > "$TMP/records0.json"
else
  jq --argjson pages "$(cat "$TMP/pages.json")" -f "$LIB/normalize-v2.jq" "$DIR/review.json" > "$TMP/records0.json"
fi

# overlay classified fields (review/<page>.classified.json), matched on legacyRef
if ls "$DIR"/review/*.classified.json >/dev/null 2>&1; then
  jq -s '.[0] as $base | (.[1:] | map(.items // []) | add // []) as $cls
         | $base | .records |= map( . as $r
             | ([$cls[] | select(.legacyRef == $r.legacyRef)] | first) as $c
             | if $c then $r + ($c | del(.legacyRef)) | .legacy = true | .classified = true else . end )' \
     "$TMP/records0.json" "$DIR"/review/*.classified.json > "$TMP/records1.json"
else
  cp "$TMP/records0.json" "$TMP/records1.json"
fi

# ids per page in source order; precompute anchor candidates
jq '
  def source_rank: if . == "drill" then 0 elif . == "editor" then 1 else 2 end;
  def page_no: (capture("^(?<n>[0-9]{2})") | .n) // "xx";
  def longest_dquoted: ([match("\"(?<q>[^\"]{6,})\""; "g") | .captures[0].string] | max_by(length)) // null;
  .records
  | map(.quote = ((.quote // .location // "") | gsub("[\n\r]+"; " ")))
  | group_by(.page)
  | map( sort_by([(.source | source_rank), (.legacyRef.index // 0)])
         | to_entries
         | map(.value + {id: ("F-" + (.value.page | page_no) + "-" + ((.key + 1) | tostring | ("000" + .) | .[-3:]))}) )
  | add
  | map(. + {
      _stripped: (.quote | gsub("[\"`'"'"']"; "")),
      _span: (.quote | longest_dquoted),
      _prefix: (.quote[0:30]),
      _setCites: ([ (.cites // [])[] | capture("^(?<p>[0-9]{2})[^\"]*\"(?<q>[^\"]+)\"") ] ),
      guess: (.guess // false)
    })
  | {records: .}' "$TMP/records1.json" > "$TMP/records2.json"

# ---------------------------------------------------------------- anchors, gate, delta
# stripped page copies (quotes and backticks removed, line numbers preserved)
mkdir -p "$TMP/stripped"
while IFS=$'\t' read -r no path; do
  sed "s/[\"'\`]//g" "$path" > "$TMP/stripped/$no"
done < <(jq -r '.[] | [.no, .path] | @tsv' "$TMP/pages.json")

page_path_for() { jq -r --arg pg "$1" '.[] | select(.page == $pg) | .path' "$TMP/pages.json"; }
page_no_for() { jq -r --arg pg "$1" '.[] | select(.page == $pg) | .no' "$TMP/pages.json"; }
path_for_no() { jq -r --arg no "$1" '.[] | select(.no == $no) | .path' "$TMP/pages.json"; }

find_once() {  # $1 needle, $2 file -> prints "count line"
  local n="$1" f="$2" c l
  [[ -z "$n" || ! -f "$f" ]] && { printf '0 0\n'; return; }
  c=$(grep -c -F -- "$n" "$f" 2>/dev/null || true)
  c=${c:-0}
  if [[ "$c" -gt 0 ]]; then l=$(grep -n -F -m1 -- "$n" "$f" | cut -d: -f1); else l=0; fi
  printf '%s %s\n' "$c" "$l"
}

words() { [[ -z "$1" ]] && { printf '0'; return; }; printf '%s' "$1" | wc -w | tr -d ' '; }

: > "$TMP/computed.jsonl"
US=$(printf '\037'); RS=$(printf '\036'); NULLMARK=$(printf '\002')
jq -j --arg us "$US" --arg rs "$RS" --arg absent "$NULLMARK" '.records[]
  | [ .id, .page, ((.line // "") | tostring), .quote, (.before // $absent), (.after // $absent),
      ._stripped, (._span // ""), ._prefix, (.basis // ""), (._setCites | tojson), ((.kind // "") | tostring) ]
  | map(tostring | gsub("[\u001f\u001e]"; " "))
  | join($us) + $rs' "$TMP/records2.json" > "$TMP/records.rs"

while IFS="$US" read -r -d "$RS" id page line quote before after stripped span prefix basis setcites kind; do
  [[ -z "$id" ]] && continue
  path=$(page_path_for "$page")
  no=$(page_no_for "$page")
  anchorLine=null; rung="none"
  if [[ -n "$path" && -f "$path" ]]; then
    # rung 1: the reviewer's line, when it holds the quote (or its stripped form or prefix)
    if [[ -n "$line" && "$line" =~ ^[0-9]+$ ]]; then
      lineText=$(sed -n "${line}p" "$path")
      lineStripped=$(printf '%s' "$lineText" | sed "s/[\"'\`]//g")
      if [[ -n "$quote" ]] && printf '%s' "$lineText" | grep -q -F -- "$quote"; then anchorLine=$line; rung="reviewer"
      elif [[ -n "$stripped" ]] && printf '%s' "$lineStripped" | grep -q -F -- "$stripped"; then anchorLine=$line; rung="reviewer"
      elif [[ ${#prefix} -ge 12 ]] && printf '%s' "$lineStripped" | grep -q -F -- "$prefix"; then anchorLine=$line; rung="reviewer"
      fi
    fi
    # rungs 2 to 5: search the page
    if [[ "$rung" == "none" ]]; then
      read -r c l < <(find_once "$quote" "$path")
      if [[ "$c" -ge 1 ]]; then anchorLine=$l; rung="exact"; fi
    fi
    if [[ "$rung" == "none" ]]; then
      read -r c l < <(find_once "$stripped" "$TMP/stripped/$no")
      [[ "$c" -ge 1 ]] && { anchorLine=$l; rung="stripped"; }
    fi
    if [[ "$rung" == "none" && -n "$span" ]]; then
      read -r c l < <(find_once "$span" "$path")
      [[ "$c" -ge 1 ]] && { anchorLine=$l; rung="span"; }
    fi
    if [[ "$rung" == "none" && ${#prefix} -ge 12 ]]; then
      read -r c l < <(find_once "$prefix" "$TMP/stripped/$no")
      [[ "$c" -ge 1 ]] && { anchorLine=$l; rung="prefix"; }
    fi
    # a reviewer line that disagrees with a search hit is a conflict (the search wins);
    # a reviewer line with no search hit still anchors the record (rung "line")
    if [[ -n "$line" && "$line" =~ ^[0-9]+$ ]]; then
      if [[ "$rung" == "none" ]]; then anchorLine=$line; rung="line"
      elif [[ "$rung" != "reviewer" && "$anchorLine" != "$line" ]]; then rung="conflict"
      fi
    fi
  fi
  # applicable
  applicable="none"
  if [[ "$before" != "$NULLMARK" ]]; then
    if [[ -n "$path" && -f "$path" && -n "$before" ]]; then
      read -r c l < <(find_once "$before" "$path")
      if [[ "$c" -eq 1 ]]; then applicable="unique"; elif [[ "$c" -gt 1 ]]; then applicable="multiple"; else applicable="missing"; fi
    else
      applicable="missing"
    fi
  fi
  # gate on after
  gate="none"; delta=null; band="none"
  if [[ "$after" != "$NULLMARK" ]]; then
    if [[ -z "$after" ]]; then gate="pass"
    else
      printf '%s\n' "$after" | bash "$GATE" --stdin --label "$id" >/dev/null 2>&1; rc=$?
      if [[ $rc -eq 0 ]]; then gate="pass"; else gate="fail"; fi
    fi
    if [[ "$before" != "$NULLMARK" ]]; then
      wb=$(words "$before"); wa=$(words "$after"); delta=$((wa - wb))
      if [[ $delta -lt 0 ]]; then band="shrinks"
      elif [[ $delta -eq 0 ]]; then band="neutral"
      elif [[ $delta -le 3 && $wb -gt 0 && $((delta * 100)) -le $((wb * 10)) ]]; then band="neutral"
      else band="grows"; fi
    fi
  fi
  # cites for basis=set must be found in the named page
  citesFound="true"
  if [[ "$basis" == "set" && "$setcites" != "[]" ]]; then
    while IFS= read -r cq; do
      cp=$(printf '%s' "$cq" | jq -r '.p'); ct=$(printf '%s' "$cq" | jq -r '.q')
      cpath=$(path_for_no "$cp")
      if [[ -z "$cpath" ]] || ! grep -q -F -- "$ct" "$cpath" 2>/dev/null; then citesFound="false"; fi
    done < <(printf '%s' "$setcites" | jq -c '.[]')
  fi
  jq -n -c --arg id "$id" --argjson anchorLine "$anchorLine" --arg rung "$rung" --arg applicable "$applicable" \
        --arg gate "$gate" --argjson delta "$delta" --arg band "$band" --argjson citesFound "$citesFound" \
        '{id: $id, anchorLine: $anchorLine, anchorResolved: $rung, applicable: $applicable, gate: $gate, delta: $delta, band: $band, citesFound: $citesFound}' \
    >> "$TMP/computed.jsonl"
done < "$TMP/records.rs"

jq -s '.' "$TMP/computed.jsonl" > "$TMP/computed.json"

# merge computed fields and run validation checks
jq --slurpfile comp "$TMP/computed.json" '
  def sev_ok:
    (.kind as $k | .severity as $s
     | if $k == null or $s == null then true
       else ({fact: ["S1","S2","S3"], citation: ["S1"], reference: ["S1","S3","S4"], contradiction: ["S2"],
              absolute: ["S3"], omission: ["S3","S4"], ambiguity: ["S2","S3","S4"], term: ["S4","S5"],
              repetition: ["S4","S5"], compression: ["S3","S4"], flow: ["S4","S5"], residue: ["S4","S5"]}[$k] // [])
             | index($s) != null end);
  def denylist: ["completeness","context","clarity","helpful","useful"];
  ($comp[0] | map({(.id): .}) | add // {}) as $c
  | .records |= map( . as $r
      | ($c[$r.id] // {}) as $x
      | $r + {anchorLine: $x.anchorLine, anchorResolved: $x.anchorResolved, applicable: $x.applicable,
              gate: $x.gate, delta: $x.delta, band: $x.band}
      | .checks = (
          if .kind == null then []
          else [ (if sev_ok then empty else "severity-range" end),
                 (if .basis != "author" and ((.cites // []) | length) == 0 then "cites-missing" else empty end),
                 (if .basis == "set" and ($x.citesFound == false) then "cites-not-found" else empty end),
                 (if .loss != null and ((.loss | ascii_downcase) as $l | denylist | any(.[]; . == $l)) then "loss-denylist" else empty end),
                 (if .removes == null then "removes-missing" else empty end),
                 (if .basis == "author" and (.question // "") == "" then "question-missing" else empty end) ]
          end)
      | del(._stripped, ._span, ._prefix, ._setCites) )' "$TMP/records2.json" > "$TMP/records3.json"

# ---------------------------------------------------------------- cluster, partition, rank
HELD='null'
[[ -f "$DIR/held.json" ]] && HELD=$(cat "$DIR/held.json")
jq -L "$ROOT/.claude/tools/editorial-triage" --argjson params "$PARAMS" --argjson held "$HELD" -f "$LIB/triage.jq" "$TMP/records3.json" > "$TMP/triaged.json" \
  || die "clustering failed (see jq error above)" 2

jq '{records: .records}' "$TMP/triaged.json" | atomic_write "$DIR/findings.json"
jq '{params: .params, clusters: .clusters, summary: .summary}' "$TMP/triaged.json" | atomic_write "$DIR/triage.json"
jq '[ .clusters | group_by(.page)[] | {page: .[0].page, path: .[0].path,
      clusters: [ .[] | {id, line: .anchorLine, needs, bucket, severity} ] } ]
  | {pages: .}' "$TMP/triaged.json" | atomic_write "$DIR/index.json"

if [[ -z "$COMMIT" ]]; then
  FIRST_PATH=$(jq -r '.[0].path' "$TMP/pages.json")
  COMMIT=$(git -C "$(dirname "$FIRST_PATH")" rev-parse --short HEAD 2>/dev/null || printf 'unknown')
fi
jq -n --arg run "$(basename "$DIR")" --arg kind "$SOURCE_KIND" --arg src "$SOURCE_PATH" --arg commit "$COMMIT" \
      --argjson pages "$(cat "$TMP/pages.json")" --argjson legacy "$LEGACY" --arg builder "$BUILDER" \
      --argjson summary "$(jq '.summary' "$TMP/triaged.json")" --argjson params "$(jq '.params' "$TMP/triaged.json")" \
      '{run: $run, source: {kind: $kind, path: $src}, commit: $commit, pages: $pages, params: $params,
        legacy: $legacy, builder: $builder, summary: $summary}' | atomic_write "$DIR/manifest.json"

jq -r '.summary as $s
  | "records \($s.records) (\($s.bySource | to_entries | map("\(.key) \(.value)") | join(", ")))",
    "clusters \($s.clusters); duplicates collapsed \($s.duplicatesCollapsed)",
    "anchors \($s.anchors | to_entries | map("\(.key) \(.value)") | join(", "))",
    "buckets \($s.byBucket | to_entries | map("\(.key) \(.value)") | join(", "))",
    "net delta: fix \($s.netDeltaFix), propose \($s.netDeltaPropose); held \($s.held); questions \($s.questions)"' \
  "$TMP/triaged.json" | sed 's/^/build-triage: /'
if $LEGACY && [[ "$(jq -r '.summary.byBucket.unclassified // 0' "$TMP/triaged.json")" != "0" ]]; then
  say "legacy result: $(jq -r '.summary.byBucket.unclassified' "$TMP/triaged.json") clusters are unclassified until review/<page>.classified.json files exist (run the LEGACY_CLASSIFIER per page, then build again)"
fi
say "wrote $DIR/{review,findings,triage,index,manifest}.json"
exit 0
