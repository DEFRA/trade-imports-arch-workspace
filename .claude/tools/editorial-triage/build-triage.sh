#!/usr/bin/env bash
# build-triage.sh - normalise an editorial review result into triage state:
# one record per finding, anchors resolved against the pages, rewrites gated,
# clusters, buckets and ranks computed.
#
# Usage:
#   bash build-triage.sh --from-run <run-record.json | run-id> --dir <workarea> [--commit <sha>] [--params '<json>']
#   bash build-triage.sh --from-review <dir-with-review/*.json> --dir <workarea> [--commit <sha>] [--params '<json>']
#   bash build-triage.sh --hash-pages <page path>...
#
# --hash-pages prints one JSON object, page filename to the SHA-256 the build
# uses, for the pages given, and exits without touching a workarea: the review
# workflow takes its sourceHashes from this before any reviewer reads a page.
# --from-run reads the harness run record (its .result) or a bare result; a
# run id is searched for under ~/.claude/projects/*/workflows/<id>.json. The
# result is version 3: {version, mode, intent, sourceHashes, units, structural,
# editorPass}, normalised by lib/normalize-v2.jq. --from-review assembles the
# same shape from review/*.json plus review/run.json ({mode, intent,
# sourceHashes}). Every record with a rewrite is nominated for claim
# verification by lib/claim-elements.jq and held until a verdict exists.
# Writes review.json, findings.json, retains.json, triage.json, index.json,
# manifest.json into the workarea (atomic: temp file then mv).
# Exit: 0 ok, 1 usage or missing input (message names the remedy), 2 validation failure.
#
# Contract: ~/trade-imports-arch-workspace/.claude/skills/editorial-triage/assets/editorial-triage-schema.md

set -uo pipefail
export LC_ALL=C

ROOT="$HOME/trade-imports-arch-workspace"
LIB="$ROOT/.claude/tools/editorial-triage/lib"
GATE="$ROOT/.claude/tools/editorial/check-prose.sh"
BUILDER="build-triage v3"

usage() { sed -n '2,22p' "$0" | sed 's/^# \{0,1\}//'; }
die() { printf 'build-triage: %s\n' "$1" >&2; exit "${2:-1}"; }
say() { printf 'build-triage: %s\n' "$1"; }

FROM_RUN=""; FROM_REVIEW=""; DIR=""; COMMIT=""; PARAMS="{}"; HASH_PAGES=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --from-run) FROM_RUN="$2"; shift 2 ;;
    --from-review) FROM_REVIEW="$2"; shift 2 ;;
    --dir) DIR="$2"; shift 2 ;;
    --commit) COMMIT="$2"; shift 2 ;;
    --params) PARAMS="$2"; shift 2 ;;
    --hash-pages) HASH_PAGES=true; shift; break ;;
    -h|--help) usage; exit 0 ;;
    *) die "unknown argument: $1 (see --help)" ;;
  esac
done

command -v jq >/dev/null 2>&1 || die "jq is required (baseline tool); install jq and re-run"
command -v openssl >/dev/null 2>&1 || die "openssl is required for the page and candidate hashes; install openssl and re-run"

expand_tilde() { printf '%s' "${1/#\~/$HOME}"; }
hash_file() { openssl dgst -sha256 "$1" | awk '{print $NF}'; }
hash_text() { printf '%s' "$1" | openssl dgst -sha256 | awk '{print $NF}'; }
# a candidate is an edit: the source span, a NUL byte, the replacement
hash_edit() { { printf '%s' "$1"; printf '\0'; printf '%s' "$2"; } | openssl dgst -sha256 | awk '{print $NF}'; }

# --hash-pages: the pages as they are now, keyed by filename, and nothing
# else; the paths that follow the flag are the pages, and every one must be a
# readable file with a filename no other given path shares.
if [[ "$HASH_PAGES" == true ]]; then
  [[ $# -gt 0 ]] || die "--hash-pages needs at least one page path (see --help)"
  SEEN=""; LINES=""
  for p in "$@"; do
    path=$(expand_tilde "$p")
    [[ -f "$path" && -r "$path" ]] || die "not a readable page file: $path"
    name=$(basename "$path")
    if printf '%s\n' "$SEEN" | grep -qxF -- "$name"; then
      die "two of the given paths share the filename $name; a page is keyed by its filename, so give one path per page"
    fi
    SEEN="$SEEN$name
"
    LINES="$LINES$(jq -n -c --arg p "$name" --arg h "$(hash_file "$path")" '{($p): $h}')
"
  done
  printf '%s' "$LINES" | jq -s 'add'
  exit 0
fi

[[ -z "$DIR" ]] && die "missing --dir <workarea>; use ~/trade-imports-arch-workspace/.claude/workareas/editorial-triage/<run>"
DIR="${DIR/#\~/$HOME}"
[[ -f "$GATE" ]] || die "prose gate not found at $GATE; the editorial tools must be present"

atomic_write() {  # $1 target path; stdin content
  local tmp="$1.tmp.$$"
  cat > "$tmp" || return 1
  mv "$tmp" "$1"
}

# ---------------------------------------------------------------- ingest
[[ -n "$FROM_RUN" || -n "$FROM_REVIEW" ]] || die "missing --from-run <run record or id> or --from-review <dir>"
mkdir -p "$DIR" || die "cannot create $DIR"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

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
  jq -e '.units | type == "array"' "$DIR/review.json" >/dev/null 2>&1 \
    || die "review.json has no units array; expected {version, mode, intent, sourceHashes, units, structural, editorPass}"
else
  REVIEW_DIR="$(expand_tilde "$FROM_REVIEW")"
  [[ -f "$REVIEW_DIR/review/run.json" ]] || die "no review/run.json under $REVIEW_DIR; it must hold {mode, intent, sourceHashes} for the findings files beside it"
  FINDING_FILES=()
  for f in "$REVIEW_DIR"/review/*.json; do
    [[ -f "$f" && "$(basename "$f")" != "run.json" ]] && FINDING_FILES+=("$f")
  done
  [[ ${#FINDING_FILES[@]} -gt 0 ]] || die "no findings files (review/*.json other than run.json) under $REVIEW_DIR"
  jq -s --slurpfile run "$REVIEW_DIR/review/run.json" \
     '{version: 3, mode: $run[0].mode, intent: $run[0].intent, sourceHashes: $run[0].sourceHashes,
       units: [ .[] | select((.reviewer // "") | startswith("drill")) | {unit: .page, path: .path, findings: .items, retains: (.retains // [])} ],
       structural: {findings: [], redundancies: []},
       editorPass: null,
       extra: [ .[] | select((.reviewer // "") | startswith("drill") | not) ]}' "${FINDING_FILES[@]}" > "$TMP/assembled.json" \
    || die "could not assemble the findings files under $REVIEW_DIR/review (see the jq error above)"
  atomic_write "$DIR/review.json" < "$TMP/assembled.json"
  SOURCE_KIND="review-dir"; SOURCE_PATH="$REVIEW_DIR"
fi

# the run fields: what the review was asked to do and what it read
jq -e '(.version // 0) >= 3' "$DIR/review.json" >/dev/null 2>&1 \
  || die "review result is not version 3 (found version $(jq -r '.version // "none"' "$DIR/review.json")); re-run the editorial-review workflow, which returns mode, intent and sourceHashes"
MODE=$(jq -r '.mode // ""' "$DIR/review.json")
INTENT=$(jq -r '.intent // ""' "$DIR/review.json")
[[ "$MODE" == "review" || "$MODE" == "revise" ]] || die "review result has no mode (review or revise); found '$MODE'"
[[ "$INTENT" == "distil" || "$INTENT" == "clarify" ]] || die "review result has no intent (distil or clarify); found '$INTENT'"
jq -e '.sourceHashes | type == "object"' "$DIR/review.json" >/dev/null 2>&1 \
  || die "review result has no sourceHashes (page filename to the SHA-256 of the page the review read)"

# pages: {page, path, no, key}. `no` is the page's leading number; `key` is
# unique within the run, because two pages can carry the same number, and is
# what record ids, cluster ids and the per-page temp files use. A number held
# by one page alone keys as itself, so single-numbered runs are unchanged. A
# page anchor (a set cite, an introduction's source) names the page by its
# filename, never by its number.
jq -c --arg home "$HOME" '[ .units[] | (.path | sub("^~/"; $home + "/")) as $p
         | {page: ($p | split("/") | last), path: $p,
            no: (($p | split("/") | last | capture("^(?<n>[0-9]{2})") | .n) // "xx")} ]
       | unique_by(.page)
       | group_by(.no)
       | map(if length == 1 then map(. + {key: .no})
             else to_entries | map(.value + {key: (.value.no + ([97 + .key] | implode))}) end)
       | add
       | sort_by(.page)' "$DIR/review.json" > "$TMP/pages0.json"
MISSING=$(jq -r '.[].path' "$TMP/pages0.json" | while IFS= read -r p; do [[ -f "$p" ]] || printf '%s\n' "$p"; done)
[[ -z "$MISSING" ]] || die "page file(s) not found; check the docs repo is present and on the reviewed commit:
$MISSING"
# hash: the page as it is now; sourceHash: the page as the review read it
: > "$TMP/hashes.jsonl"
while IFS=$'\t' read -r pg path; do
  jq -n -c --arg pg "$pg" --arg h "$(hash_file "$path")" '{page: $pg, hash: $h}' >> "$TMP/hashes.jsonl"
done < <(jq -r '.[] | [.page, .path] | @tsv' "$TMP/pages0.json")
jq --slurpfile hashes "$TMP/hashes.jsonl" --slurpfile review "$DIR/review.json" '
  ($hashes | map({(.page): .hash}) | add // {}) as $h
  | map(. + {hash: $h[.page], sourceHash: ($review[0].sourceHashes[.page] // null)})' "$TMP/pages0.json" > "$TMP/pages.json"
UNHASHED=$(jq -r '.[] | select(.sourceHash == null) | .page' "$TMP/pages.json")
[[ -z "$UNHASHED" ]] || die "sourceHashes has no entry for page(s) the review reported on; the review must hash every page it read:
$UNHASHED"

# ---------------------------------------------------------------- normalise
jq --argjson pages "$(cat "$TMP/pages.json")" -f "$LIB/normalize-v2.jq" "$DIR/review.json" > "$TMP/records1.json"
jq '{retains: .retains}' "$TMP/records1.json" | atomic_write "$DIR/retains.json"

# a finding the partition cannot place is malformed input, not a bucket
MALFORMED=$(jq -r '.records | to_entries[] | . as $e
                   | [ ["kind", "severity", "action", "basis"][] | select(($e.value[.] | type) != "string") ] as $missing
                   | select(($missing | length) > 0)
                   | "  \($e.value.reviewer) record \($e.key + 1) (\($e.value.page)) missing \($missing | join(", ")): \(($e.value.quote // "") | .[0:60])"' "$TMP/records1.json") \
  || die "could not validate the records (see the jq error above)" 2
[[ -z "$MALFORMED" ]] || die "review result is malformed: every finding carries kind, severity, action and basis (contract, reviewer-set fields). Fix the review result or re-run the review:
$MALFORMED" 2

# ids per page in source order; anchor candidates; the claim nomination and
# the layout test, which need nothing but the record itself
jq -L "$LIB" --argjson pages "$(cat "$TMP/pages.json")" '
  include "claim-elements";
  def source_rank: if . == "drill" then 0 elif . == "editor" then 1 else 2 end;
  def page_key: . as $p | ([$pages[] | select(.page == $p) | .key] | first) // "xx";
  def longest_dquoted: ([match("\"(?<q>[^\"]{6,})\""; "g") | .captures[0].string] | max_by(length)) // null;
  .records
  | map(.quote = ((.quote // "") | gsub("[\n\r]+"; " ")))
  | group_by(.page)
  | map( sort_by(.source | source_rank)
         | to_entries
         | map(.value + {id: ("F-" + (.value.page | page_key) + "-" + ((.key + 1) | tostring | ("000" + .) | .[-3:]))}) )
  | add
  | map(. + {
      _key: (.page | page_key),
      _stripped: (.quote | gsub("[\"`'"'"']"; "")),
      _span: (.quote | longest_dquoted),
      _prefix: (.quote[0:30]),
      # a page anchor: the page filename (spaces allowed), whitespace, a double-quoted
      # quote; an anchor that does not parse is kept as an empty one, so it fails
      # resolution rather than vanishing from the check
      _setCites: ([ (.cites // [])[] | ((tostring | capture("^(?<p>.+?)\\s+\"(?<q>[^\"]+)\"$")) // {p: "", q: ""}) ] ),
      _invQuotes: ([ ((.inventory // {}) | .steps // [])[] | .quote | select(type == "string" and length > 0) ]),
      _introAnchors: ([ ((.introduced // []) | if type == "array" then .[] else empty end)
                        | select(type == "object" and .status == "supported")
                        | ((.source // "") | tostring | capture("^(?<p>.+?)\\s+\"(?<q>[^\"]+)\"$")) // {p: "", q: ""} ]),
      claimDiff: (if .before == null then null else claim_diff(.before; .after) end),
      layoutOnly: layout_only(.before; .after)
    })
  | {records: .}' "$TMP/records1.json" > "$TMP/records2.json"

# ---------------------------------------------------------------- anchors, gate, delta
# stripped page copies (quotes and backticks removed, line numbers preserved)
mkdir -p "$TMP/stripped"
while IFS=$'\t' read -r key path; do
  sed "s/[\"'\`]//g" "$path" > "$TMP/stripped/$key"
done < <(jq -r '.[] | [.key, .path] | @tsv' "$TMP/pages.json")

page_path_for() { jq -r --arg pg "$1" '.[] | select(.page == $pg) | .path' "$TMP/pages.json"; }
page_key_for() { jq -r --arg pg "$1" '.[] | select(.page == $pg) | .key' "$TMP/pages.json"; }

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
      ._stripped, (._span // ""), ._prefix, (.basis // ""), (._setCites | tojson), ((.kind // "") | tostring),
      (.layoutOnly | tostring), (._invQuotes | tojson), (._introAnchors | tojson), (.removes // $absent) ]
  | map(tostring | gsub("[\u001f\u001e]"; " "))
  | join($us) + $rs' "$TMP/records2.json" > "$TMP/records.rs"

while IFS="$US" read -r -d "$RS" id page line quote before after stripped span prefix basis setcites kind layoutOnly invquotes introanchors removes; do
  [[ -z "$id" ]] && continue
  path=$(page_path_for "$page")
  key=$(page_key_for "$page")
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
      read -r c l < <(find_once "$stripped" "$TMP/stripped/$key")
      [[ "$c" -ge 1 ]] && { anchorLine=$l; rung="stripped"; }
    fi
    if [[ "$rung" == "none" && -n "$span" ]]; then
      read -r c l < <(find_once "$span" "$path")
      [[ "$c" -ge 1 ]] && { anchorLine=$l; rung="span"; }
    fi
    if [[ "$rung" == "none" && ${#prefix} -ge 12 ]]; then
      read -r c l < <(find_once "$prefix" "$TMP/stripped/$key")
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
  # applicable: a before that spans lines resolves line by line and is unique
  # only when every line occurs once, in order
  applicable="none"
  if [[ "$before" != "$NULLMARK" ]]; then
    if [[ -n "$path" && -f "$path" && -n "$before" ]]; then
      applicable="unique"; last=0
      while IFS= read -r bl; do
        [[ -z "$bl" ]] && continue
        read -r c l < <(find_once "$bl" "$path")
        if [[ "$c" -eq 0 || "$l" -le "$last" ]]; then applicable="missing"; break
        elif [[ "$c" -gt 1 ]]; then applicable="multiple"; break
        fi
        last=$l
      done <<< "$before"
    else
      applicable="missing"
    fi
  fi
  # gate on after; a layout-only rewrite is gated as the whole changed page,
  # since its text is the page's own
  gate="none"; delta=null; band="none"; candidateHash=null; removalHash=null
  if [[ "$after" != "$NULLMARK" ]]; then
    b4="$before"; [[ "$b4" == "$NULLMARK" ]] && b4=""
    candidateHash="\"$(hash_edit "$b4" "$after")\""
    if [[ -z "$after" ]]; then gate="pass"
    elif [[ "$layoutOnly" == "true" && "$applicable" == "unique" ]]; then
      jq -Rrs --arg b "$before" --arg a "$after" 'split($b) | join($a)' "$path" | bash "$GATE" --stdin --label "$id" >/dev/null 2>&1; rc=$?
      if [[ $rc -eq 0 ]]; then gate="pass"; else gate="fail"; fi
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
  # a cite for basis=set names a page by filename and must be found on that
  # page alone: a page the run does not hold, or a quote the named page does
  # not carry, is a cite not found, whatever a same-numbered sibling holds.
  citesFound="true"
  if [[ "$basis" == "set" && "$setcites" != "[]" ]]; then
    while IFS= read -r cq; do
      cp=$(printf '%s' "$cq" | jq -r '.p'); ct=$(printf '%s' "$cq" | jq -r '.q')
      cpath=$(page_path_for "$cp")
      if [[ -z "$cpath" ]] || ! grep -q -F -- "$ct" "$cpath" 2>/dev/null; then citesFound="false"; fi
    done < <(printf '%s' "$setcites" | jq -c '.[]')
  fi
  # a presentation inventory quotes only what the page states
  inventoryFound="true"
  if [[ "$kind" == "presentation" && "$invquotes" != "[]" && -n "$path" ]]; then
    while IFS= read -r iq; do
      grep -q -F -- "$iq" "$path" 2>/dev/null || inventoryFound="false"
    done < <(printf '%s' "$invquotes" | jq -r '.[]')
  fi
  # a real removes span is a removal candidate: the span deleted
  if [[ "$removes" != "$NULLMARK" && -n "$removes" ]]; then
    case "$(printf '%s' "$removes" | tr 'A-Z' 'a-z')" in
      none*) ;;
      *) removalHash="\"$(hash_edit "$removes" "")\"" ;;
    esac
  fi
  # a supported introduction cites a page anchor, by filename, whose quote is
  # on that page alone
  introducedFound="true"
  if [[ "$introanchors" != "[]" ]]; then
    while IFS= read -r ia; do
      ip=$(printf '%s' "$ia" | jq -r '.p'); iq=$(printf '%s' "$ia" | jq -r '.q')
      ipath=""
      [[ -n "$ip" && -n "$iq" ]] && ipath=$(page_path_for "$ip")
      if [[ -z "$ipath" ]] || ! grep -q -F -- "$iq" "$ipath" 2>/dev/null; then introducedFound="false"; fi
    done < <(printf '%s' "$introanchors" | jq -c '.[]')
  fi
  jq -n -c --arg id "$id" --argjson anchorLine "$anchorLine" --arg rung "$rung" --arg applicable "$applicable" \
        --arg gate "$gate" --argjson delta "$delta" --arg band "$band" --argjson citesFound "$citesFound" \
        --argjson candidateHash "$candidateHash" --argjson removalHash "$removalHash" --argjson inventoryFound "$inventoryFound" --argjson introducedFound "$introducedFound" \
        '{id: $id, anchorLine: $anchorLine, anchorResolved: $rung, applicable: $applicable, gate: $gate, delta: $delta, band: $band,
          citesFound: $citesFound, candidateHash: $candidateHash, removalHash: $removalHash, inventoryFound: $inventoryFound, introducedFound: $introducedFound}' \
    >> "$TMP/computed.jsonl"
done < "$TMP/records.rs"

jq -s '.' "$TMP/computed.jsonl" > "$TMP/computed.json"

# merge computed fields, run validation checks, set claimShift and introducedCheck
jq --slurpfile comp "$TMP/computed.json" --argjson pages "$(cat "$TMP/pages.json")" '
  def sev_ok:
    (.kind as $k | .severity as $s
     | if $k == null or $s == null then true
       else ({fact: ["S1","S2","S3"], citation: ["S1"], reference: ["S1","S3","S4"], contradiction: ["S2"],
              absolute: ["S3"], omission: ["S3","S4"], ambiguity: ["S2","S3","S4"], term: ["S4","S5"],
              repetition: ["S4","S5"], compression: ["S3","S4"], flow: ["S4","S5"], residue: ["S4","S5"],
              presentation: ["S4","S5"]}[$k] // [])
             | index($s) != null end);
  def denylist: ["completeness","context","clarity","helpful","useful"];
  def sentences: [ splits("(?<=[.!?])\\s+") | select(test("[a-z]"; "i")) | ltrimstr(" ") | rtrimstr(" ") ];
  def sentences_changed: . as $r | [ ($r.before | sentences)[] | select(. as $s | ($r.after | contains($s)) | not) ] | length;
  def introduced_ok: all(.[]; type == "object" and (.text | type) == "string"
                            and ((.status == "supported" and (.source | type) == "string" and .source != "") or .status == "unsupported"));
  def page_hash($pg): ([$pages[] | select(.page == $pg) | .hash] | first) // null;
  def page_source_hash($pg): ([$pages[] | select(.page == $pg) | .sourceHash] | first) // null;
  ($comp[0] | map({(.id): .}) | add // {}) as $c
  | .records |= map( . as $r
      | ($c[$r.id] // {}) as $x
      | $r + {anchorLine: $x.anchorLine, anchorResolved: $x.anchorResolved, applicable: $x.applicable,
              gate: $x.gate, delta: $x.delta, band: $x.band,
              sourceHash: page_source_hash($r.page), candidateHash: $x.candidateHash, removalHash: $x.removalHash}
      | .checks = (
          if .kind == null then []
          else [ (if sev_ok then empty else "severity-range" end),
                 (if .basis != "author" and ((.cites // []) | length) == 0 then "cites-missing" else empty end),
                 (if .basis == "set" and ($x.citesFound == false) then "cites-not-found" else empty end),
                 (if .loss != null and ((.loss | ascii_downcase) as $l | denylist | any(.[]; . == $l)) then "loss-denylist" else empty end),
                 (if .removes == null then "removes-missing" else empty end),
                 (if .basis == "author" and (.question // "") == "" then "question-missing" else empty end),
                 (if .kind == "presentation" and ((.inventory | type) != "object" or ((.inventory.steps // null) | type) != "array") then "inventory-missing" else empty end),
                 (if .kind == "presentation" and ($x.inventoryFound == false) then "inventory-unquoted" else empty end),
                 (if (.after // "") != "" and (.introduced | type) != "array" then "introduced-missing" else empty end),
                 (if (.introduced | type) == "array" and ((.introduced | introduced_ok) | not) then "introduced-invalid" else empty end),
                 (if (.after // "") != "" and (.action == "split" or .action == "list" or (sentences_changed > 1))
                     and ((.changes | type) != "array" or (.changes | length) == 0) then "changes-missing" else empty end) ]
          end)
      | .introducedCheck = (if ((.introduced // []) | length) == 0 then "none"
                            elif any(.introduced[]; .status != "supported") or ($x.introducedFound == false) then "held"
                            else "supported" end)
      | .claimShift = (if .sourceHash != null and page_hash(.page) != null and .sourceHash != page_hash(.page) then "stale"
                       elif (.claimDiff.nominated // false) then "missing" else "none" end)
      | .claimShiftNote = null
      # the record has its own removal candidate unless the removal is the rewrite (a deletion of exactly removes)
      | .removalShift = (if .removalHash == null then null
                         elif (.after // null) == "" and .before == .removes then null
                         elif .claimShift == "stale" then "stale" else "missing" end)
      | .removalNote = null
      | del(._stripped, ._span, ._prefix, ._setCites, ._invQuotes, ._introAnchors) )' "$TMP/records2.json" > "$TMP/records3.json"

# ---------------------------------------------------------------- verdicts
# verification/claims-<page>.json, one per page, read on every build. File
# checks here; item checks in the jq pass. Every failure is reported and
# leaves the record unverified (missing) or, for a hash that disagrees, stale.
VER_READ=0; VER_IGNORED=0; STALE_PAGES='[]'
: > "$TMP/verdicts.jsonl"
while IFS=$'\t' read -r pg hash shash; do
  f="$DIR/verification/claims-$pg.json"
  [[ -f "$f" ]] || continue
  if [[ "$hash" != "$shash" ]]; then
    say "verification: $pg has moved on since the review (hash differs); claims-$pg.json is not read and its records are stale"
    continue
  fi
  if ! jq -e 'type == "object"' "$f" >/dev/null 2>&1; then
    say "verification: ignored claims-$pg.json (not a JSON object); its records stay unverified"; VER_IGNORED=$((VER_IGNORED + 1)); continue
  fi
  # a wrong source hash comes first: the verdicts were made against another version of the page
  if ! jq -e --arg h "$shash" '.sourceHash == $h' "$f" >/dev/null 2>&1; then
    say "verification: ignored claims-$pg.json (sourceHash differs from the manifest); its records are stale"; VER_IGNORED=$((VER_IGNORED + 1))
    STALE_PAGES=$(jq -c --arg pg "$pg" '. + [$pg]' <<< "$STALE_PAGES"); continue
  fi
  if ! jq -e --arg pg "$pg" '.page == $pg' "$f" >/dev/null 2>&1; then
    say "verification: ignored claims-$pg.json (page is $(jq -c '.page' "$f"), not \"$pg\"); its records stay unverified"; VER_IGNORED=$((VER_IGNORED + 1)); continue
  fi
  if ! jq -e '.verifiedBy | type == "string" and length > 0' "$f" >/dev/null 2>&1; then
    say "verification: ignored claims-$pg.json (verifiedBy is not a non-empty string); its records stay unverified"; VER_IGNORED=$((VER_IGNORED + 1)); continue
  fi
  if ! jq -e '.items | type == "array"' "$f" >/dev/null 2>&1; then
    say "verification: ignored claims-$pg.json (items is not an array); its records stay unverified"; VER_IGNORED=$((VER_IGNORED + 1)); continue
  fi
  jq -c --arg pg "$pg" '{page: $pg, items: .items}' "$f" >> "$TMP/verdicts.jsonl"
  VER_READ=$((VER_READ + 1))
done < <(jq -r '.[] | [.page, .hash, .sourceHash] | @tsv' "$TMP/pages.json")
jq -s '.' "$TMP/verdicts.jsonl" > "$TMP/verdicts.json"

jq -L "$LIB" --slurpfile v "$TMP/verdicts.json" --argjson stalePages "$STALE_PAGES" '
  include "claim-elements";
  def allowed: ["none", "material", "unresolved"];
  def rank: {"material": 0, "unresolved": 1, "none": 2}[.];
  def worst: map(rank) | min | if . == 0 then "material" elif . == 1 then "unresolved" else "none" end;
  # every non-blank sentence of a deletion is a required element, whatever its characters
  def sentences_all: gsub("[\n]+"; " ") | [ splits("(?<=[.!?:;])\\s+") | select(test("\\S")) ];
  def required($r):
    if ($r.after // "") == "" then [ ($r.before | sentences_all) | to_entries[] | "sentence:\(.key)" ]
    else [ $r.claimDiff.added[] | "added:\(.class):\(.term)" ]
         + [ $r.claimDiff.removed[] | "removed:\(.class):\(.term)" ]
         + [ $r.claimDiff.missingSentence | to_entries[] | "sentence:\(.key)" ] end;
  # one problem string, or null when the rewrite part of the item is valid for
  # the record; the element set must equal the required set exactly, and the
  # note must explain any verdict that is not none, and any deletion
  def part_problem($req; $it; $needNote):
    ([$it.shifts[]? | .element]) as $els
    | if ($req | length) == 0 then "the candidate has no required element (empty text)"
      elif ($it.claimShift | IN(allowed[]) | not) then "claimShift \($it.claimShift | tojson) is not none, material or unresolved"
      elif ($it.shifts | type) != "array" or ($it.shifts | length) == 0 then "shifts is empty"
      elif any($it.shifts[]; (.judgment | IN(allowed[]) | not)) then "a judgment is not none, material or unresolved"
      elif ($els | length) != ($els | unique | length) then "shifts name an element twice"
      elif ([$req[] | select(. as $e | ($els | index($e)) == null)] | length) > 0
        then "shifts do not cover \([$req[] | select(. as $e | ($els | index($e)) == null)] | join(", "))"
      elif ([$els[] | select(. as $e | ($req | index($e)) == null)] | length) > 0
        then "shifts name elements the candidate does not have: \([$els[] | select(. as $e | ($req | index($e)) == null)] | join(", "))"
      elif $it.claimShift != ([$it.shifts[].judgment] | worst) then "claimShift \($it.claimShift) is not the worst judgment (\([$it.shifts[].judgment] | worst))"
      elif ($it.claimShift != "none" or $needNote) and (($it.note | type) != "string" or ($it.note | length) == 0)
        then "note is missing; a verdict that is not none, and any deletion, needs one"
      else null end;
  def problem($r; $it): part_problem(required($r) | unique; $it; (($r.after // "") == ""));
  def removal_required($r): [ ($r.removes | sentences_all) | to_entries[] | "sentence:\(.key)" ];
  def removal_problem($r; $rm): part_problem(removal_required($r) | unique; $rm; true);
  ($v[0] | map({(.page): .items}) | add // {}) as $files
  | (.records | map({(.id): .page}) | add // {}) as $pageOf
  | ([ $v[0][] | .page as $pg | .items[] | select((.record | type) != "string" or $pageOf[.record] != $pg)
       | "verification: claims-\($pg).json names \(.record | tojson), which is not a record on that page; item ignored" ]) as $unknown
  | .reports = $unknown
  | .records |= map( . as $r
      | if (($r.claimDiff.nominated // false) != true or $r.claimShift != "missing") and $r.removalShift != "missing" then .
        elif ($stalePages | index($r.page)) != null
          then (if $r.claimShift == "missing" then .claimShift = "stale" else . end)
             | (if $r.removalShift == "missing" then .removalShift = "stale" else . end)
        else ([ ($files[$r.page] // [])[] | select(.record == $r.id) ]) as $its
          | if ($its | length) == 0 then .
            elif ($its | length) > 1 then . + {_report: ["verification: claims-\($r.page).json names \($r.id) \($its | length) times; every item for that record ignored"]}
            else $its[0] as $it
              # the rewrite part, when the nominated rewrite is unverified
              | (if $r.claimShift == "missing" then
                   (if ($it | has("shifts") or has("claimShift")) | not then . + {_report: ["verification: \($r.id) has no rewrite verdict in its item; rewrite stays unverified"]}
                    else (problem($r; $it)) as $p
                      | if $p != null then . + {_report: ["verification: \($r.id) rewrite item ignored: \($p)"]}
                        elif $it.candidateHash != $r.candidateHash then .claimShift = "stale" | . + {_report: ["verification: \($r.id) rewrite verdict was made against another candidate (hash differs); record is stale"]}
                        else .claimShift = $it.claimShift | .claimShiftNote = $it.note end
                    end)
                 else . end)
              # the removal part, when the own removal candidate is unverified
              | (if $r.removalShift == "missing" then
                   (if ($it.removal | type) != "object" then . + {_report: ((._report // []) + ["verification: \($r.id) has no removal verdict in its item; removal stays unverified"])}
                    else (removal_problem($r; $it.removal)) as $p
                      | if $p != null then . + {_report: ((._report // []) + ["verification: \($r.id) removal item ignored: \($p)"])}
                        elif $it.removal.removalHash != $r.removalHash then .removalShift = "stale" | . + {_report: ((._report // []) + ["verification: \($r.id) removal verdict was made against another span (hash differs); removal is stale"])}
                        else .removalShift = $it.removal.claimShift | .removalNote = $it.removal.note end
                    end)
                 else . end)
            end
          end )
  | .reports += [ .records[] | (._report // [])[] ]
  | .records |= map(del(._report))' "$TMP/records3.json" > "$TMP/records4.json" \
  || die "could not apply the verification files (see the jq error above)" 2
jq -r '.reports[]' "$TMP/records4.json" | sed 's/^/build-triage: /'
VER_APPLIED=$(jq -r '[.records[] | select(.claimDiff.nominated == true and (.claimShift | IN("none", "material", "unresolved")))] | length' "$TMP/records4.json")
VER_REMOVALS=$(jq -r '[.records[] | select(.removalShift != null and (.removalShift | IN("none", "material", "unresolved")))] | length' "$TMP/records4.json")
VER_ITEMS_IGNORED=$(jq -r '[.reports[] | capture("(?<id>F-[A-Za-z0-9]+-[0-9]+)") | .id] | unique | length' "$TMP/records4.json")
jq '{records: .records}' "$TMP/records4.json" > "$TMP/records3.json"

# ---------------------------------------------------------------- cluster, partition, rank
HELD='null'
[[ -f "$DIR/held.json" ]] && HELD=$(cat "$DIR/held.json")
jq -L "$ROOT/.claude/tools/editorial-triage" --argjson params "$PARAMS" --argjson held "$HELD" --arg intent "$INTENT" -f "$LIB/triage.jq" "$TMP/records3.json" > "$TMP/triaged.json" \
  || die "clustering failed (see jq error above)" 2

jq '{records: (.records | map(del(._key)))}' "$TMP/triaged.json" | atomic_write "$DIR/findings.json"
jq '{params: .params, clusters: .clusters, summary: .summary}' "$TMP/triaged.json" | atomic_write "$DIR/triage.json"
jq '[ .clusters | group_by(.page)[] | {page: .[0].page, path: .[0].path,
      clusters: [ .[] | {id, line: .anchorLine, needs, bucket, severity} ] } ]
  | {pages: .}' "$TMP/triaged.json" | atomic_write "$DIR/index.json"

if [[ -z "$COMMIT" ]]; then
  FIRST_PATH=$(jq -r '.[0].path' "$TMP/pages.json")
  COMMIT=$(git -C "$(dirname "$FIRST_PATH")" rev-parse --short HEAD 2>/dev/null || printf 'unknown')
fi
jq -n --arg run "$(basename "$DIR")" --arg kind "$SOURCE_KIND" --arg src "$SOURCE_PATH" --arg commit "$COMMIT" \
      --arg mode "$MODE" --arg intent "$INTENT" --argjson sourceHashes "$(jq '.sourceHashes' "$DIR/review.json")" \
      --argjson pages "$(jq 'map(del(.sourceHash))' "$TMP/pages.json")" --arg builder "$BUILDER" \
      --argjson summary "$(jq '.summary' "$TMP/triaged.json")" --argjson params "$(jq '.params' "$TMP/triaged.json")" \
      '{run: $run, source: {kind: $kind, path: $src}, commit: $commit, mode: $mode, intent: $intent, sourceHashes: $sourceHashes,
        pages: $pages, params: $params, builder: $builder, summary: $summary}' | atomic_write "$DIR/manifest.json"

jq -r '.summary as $s
  | "records \($s.records) (\($s.bySource | to_entries | map("\(.key) \(.value)") | join(", ")))",
    "clusters \($s.clusters); duplicates collapsed \($s.duplicatesCollapsed)",
    "anchors \($s.anchors | to_entries | map("\(.key) \(.value)") | join(", "))",
    "stale: span absent \($s.stale.spanAbsent), span ambiguous \($s.stale.spanAmbiguous), anchor unresolved \($s.stale.anchorUnresolved)",
    "claims: nominated \($s.claims.nominated); claimShift \($s.claims.byShift | to_entries | map("\(.key) \(.value)") | join(", ")); introductions held \($s.claims.introducedHeld); layout-only \($s.claims.layoutOnly)",
    "buckets \($s.byBucket | to_entries | map("\(.key) \(.value)") | join(", "))",
    "net delta: fix \($s.netDeltaFix), propose \($s.netDeltaPropose); held \($s.held); questions \($s.questions)"' \
  "$TMP/triaged.json" | sed 's/^/build-triage: /'
MOVED=$(jq -r '.[] | select(.hash != .sourceHash) | .page' "$TMP/pages.json")
if [[ -n "$MOVED" ]]; then
  say "page(s) changed since the review read them (hash differs from sourceHashes); their records are held as stale until the review is re-run: $(printf '%s' "$MOVED" | tr '\n' ' ')"
fi
STALE=$(jq -r '.summary.stale.spanAbsent' "$TMP/triaged.json")
RECS=$(jq -r '.summary.records' "$TMP/triaged.json")
if [[ -z "$MOVED" && "$STALE" -gt 0 && $((STALE * 20)) -ge "$RECS" ]]; then
  say "$STALE of $RECS records carry a rewrite whose span is not in the page although the page is unchanged, so the reviewer misquoted. Those records cannot be applied and will skip."
fi
say "verification: files read $VER_READ, ignored $VER_IGNORED; verdicts applied $VER_APPLIED (removals $VER_REMOVALS), items rejected $VER_ITEMS_IGNORED"
UNVERIFIED=$(jq -r '[.records[] | select(.claimShift == "missing" or .removalShift == "missing")] | length' "$TMP/records3.json")
if [[ "$UNVERIFIED" -gt 0 ]]; then
  TO_VERIFY=$(jq -r --slurpfile p "$TMP/pages.json" '[.records[] | select(.claimShift == "missing" or .removalShift == "missing") | .page] | unique
      | map(. as $pg | select(any($p[0][]; .page == $pg and .hash == .sourceHash))) | join(" ")' "$TMP/records3.json")
  say "$UNVERIFIED records have an unverified rewrite or removal; spawn CLAIM_VERIFIER for: ${TO_VERIFY:-none (every unverified page has moved on)}"
fi
say "wrote $DIR/{review,findings,retains,triage,index,manifest}.json"
exit 0
