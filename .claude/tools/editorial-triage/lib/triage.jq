# triage.jq - cluster, partition and rank normalised finding records.
#
# Input:  {"records": [record, ...]} after build-triage.sh has resolved
#         anchors and computed applicable, gate, delta, band and checks.
# Args:   $params (object), $held ({"items": [{page, quote, note}]} or null),
#         $intent (the run's intent, from the manifest)
# Output: {"params", "records": [...with cluster set], "clusters": [...], "summary": {...}}
#
# Contract: ../../../skills/editorial-triage/assets/editorial-triage-schema.md
#
# The partition rules live once, in ../triage-lib.jq; this module imports them
# so the bucket a cluster carries is decided in one place.

include "triage-lib";

def norm:
  (. // "") | ascii_downcase
  | gsub("[\"'`*_]"; "") | gsub("[[:punct:]]"; " ") | gsub("[[:space:]]+"; " ") | ltrimstr(" ") | rtrimstr(" ");

def source_rank: if . == "drill" then 0 elif . == "editor" then 1 else 2 end;
def band_rank: if . == "shrinks" then 0 elif . == "neutral" then 1 elif . == "grows" then 2 else 3 end;
def bearing_rank: if . == "central" then 0 elif . == "supporting" then 1 elif . == "tangential" then 2 else 3 end;
def shift_rank: if . == "stale" then 0 elif . == "missing" then 1 elif . == "material" then 2 elif . == "unresolved" then 3 else 4 end;
def introduced_rank: if . == "held" then 0 elif . == "supported" then 1 else 2 end;

def page_no: (capture("^(?<n>[0-9]{2})") | .n) // "xx";

def cluster_key:
  if .anchorLine != null then "\(.page):\(.anchorLine)"
  else "\(.page):q:\((.quote | norm)[0:40])" end;

def kind_or_category: (.kind // .category);

def quotes_overlap($a; $b):
  ($a | norm) as $na | ($b | norm) as $nb
  | ($na != "" and $nb != "") and (($na | contains($nb)) or ($nb | contains($na)));

# Greedy sub-clustering inside one key group: join the first sub-cluster
# whose quote overlaps or whose kind matches; else start a new one.
def subcluster:
  sort_by([(.source | source_rank), .id])
  | reduce .[] as $r ([];
      ( [ to_entries[]
          | select( (.value | any(.[]; quotes_overlap(.quote; $r.quote)))
                    or (.value | any(.[]; (kind_or_category) != null and (kind_or_category) == ($r | kind_or_category))) )
          | .key ] | first ) as $hit
      | if $hit == null then . + [[$r]] else .[$hit] += [$r] end);

def chosen_of($members):
  [$members[] | select(.after != null)]
  | sort_by([ (if .applicable == "unique" then 0 else 1 end),
              (if .gate == "pass" then 0 else 1 end),
              (.basis | basis_rank), (.band | band_rank),
              (.source | source_rank), ((.after // "") | length) ])
  | first // null;

def most_conservative_bearing($members):
  [$members[] | .bearing | select(. != null)] | sort_by(bearing_rank) | first // null;

# Removal first: when members disagree about whether the finding can be closed
# by removing text, the cluster takes a real span over a "none:" reason. One
# reviewer writing "none:" must not discard a cluster another reviewer can close
# by cutting a span, and must not leave the apply step with no text to remove.
# The chosen record's span wins when it names one, so a cluster whose rewrite
# carries a span keeps that span.
def removes_of($ch; $members):
  ([$members[] | .removes | select(. != null and ((. | starts_none) | not))]) as $spans
  | if ($ch.removes != null) and (($ch.removes | starts_none) | not) then $ch.removes
    elif ($spans | length) > 0 then $spans[0]
    else ($ch.removes // ([$members[] | .removes | select(. != null)] | first // null)) end;

def held_match($members; $page; $heldItems):
  any($heldItems[]; . as $h
    | ($h.page == null or $h.page == $page)
      and any($members[]; quotes_overlap(.quote; $h.quote)));

# ---- partition (rules imported from triage-lib.jq) ----------------------

# The lead record is the chosen rewrite, else the first member; the cluster's
# severity, claimShift and introducedCheck override the lead's, so the most
# severe member decides the band and any member's nomination holds the cluster.
def cluster_partition($p):
  . as $c
  | (($c._chosen // $c._members[0]) + {severity: $c.severity, claimShift: $c.claimShift, introducedCheck: $c.introducedCheck}) as $lead
  | partition($lead; $c.dispersion; $c.bearing; $c.removes; $p);

def needs_of:
  . as $c
  | ([ (if ($c.kinds | any(. == "contradiction")) or (($c.related | length) > 0) then "reconcile" else empty end),
       (if $c.bucket == "author" or $c.bearing == "tangential" then "bearing" else empty end),
       (if $c.bucket == "fix" then "verify" else empty end),
       (if any($c._members[]; (.claimDiff.nominated // false) and .claimShift != "none") then "verify-claims" else empty end) ]
     | if length == 0 then "none" else join("+") end);

def make_cluster($members; $no; $seq; $heldItems):
  (chosen_of($members)) as $ch
  | ([$members[] | select(.after != null) | .after | norm] | unique) as $afters
  | {
      id: ("C-" + $no + "-" + ($seq | tostring | ("000" + .) | .[-3:])),
      page: $members[0].page, path: $members[0].path,
      anchorLine: $members[0].anchorLine,
      key: ($members[0] | cluster_key),
      members: [$members[] | .id],
      severity: ([$members[] | .severity | select(. != null)] | sort_by(sev_num) | first // null),
      kinds: ([$members[] | kind_or_category | select(. != null)] | unique),
      actions: ([$members[] | .action | select(. != null)] | unique),
      reach: {pages: (([$members[] | .page] + [$members[] | (.related // [])[] | .page]) | unique | length),
              reviewers: ([$members[] | .reviewer] | unique | length)},
      dispersion: ($afters | length),
      chosen: ($ch.id // null),
      alternatives: (if $ch == null then [] else [$members[] | select(.after != null and .id != $ch.id and ((.after | norm) != ($ch.after | norm))) | .id] end),
      related: [],
      bearing: ($ch.bearing // most_conservative_bearing($members)),
      removes: removes_of($ch; $members),
      questions: ([$members[] | select(.question != null) | {text: .question, owner: .owner, from: .id}] | unique_by(.text | norm)),
      guess: ($members | any(.guess == true)),
      held: held_match($members; $members[0].page; $heldItems),
      intent: $intent,
      claimShift: ([$members[] | .claimShift // "none"] | sort_by(shift_rank) | first),
      layoutOnly: ($ch.layoutOnly // false),
      introducedCheck: ([$members[] | .introducedCheck // "none"] | sort_by(introduced_rank) | first),
      _members: $members,
      _chosen: $ch
    }
  | .conflict = ((.alternatives | length) > 0);

# ---- main ----------------------------------------------------------------

($params // {}) as $p0
| ({growthAllowance: 12, neutralWords: 3, neutralRatio: 0.10, absolutesBlocking: false, demoteBelowHigh: false, essentialCap: 12} + $p0) as $p
| (($held // {}) | .items // []) as $heldItems
| .records as $records
| ($records | group_by(cluster_key)) as $groups
| ([ $groups[] | subcluster[] ]) as $subs
| ($subs | sort_by([ (.[0].page), (.[0].anchorLine // 999999), (.[0].id) ])) as $ordered
| ( reduce $ordered[] as $members ({seqs: {}, clusters: []};
      ($members[0]._key // ($members[0].page | page_no)) as $no
      | ((.seqs[$no] // 0) + 1) as $seq
      | .seqs[$no] = $seq
      | .clusters += [ make_cluster($members; $no; $seq; $heldItems) ] )
    | .clusters ) as $clusters0
# cross-page related links: a related anchor {page, line, quote} points at the
# cluster on that page with that line, or whose members overlap the quote.
| ( $clusters0 | map( . as $c
      | .related = ([ $c._members[] | (.related // [])[] | . as $r
                      | ($clusters0[] | select(.id != $c.id and .page == $r.page
                          and ((.anchorLine != null and $r.line != null and .anchorLine == $r.line)
                               or ($r.quote != null and any(._members[]; quotes_overlap(.quote; $r.quote))))) | .id) ]
                    | unique) ) ) as $clusters1
| ( $clusters1 | map( . as $c | ($c | cluster_partition($p)) as $b | $c + $b ) ) as $clusters2
| ( $clusters2
    | group_by(.bucket)
    | map( sort_by( . as $c
             | [ ($c.severity | sev_num), (-($c.reach.pages + $c.reach.reviewers)),
                 (($c._chosen // $c._members[0]) | .basis | basis_rank),
                 (($c._chosen // {delta: 0}) | .delta // 0) ] )
           | to_entries | map(.value + {rank: (.key + 1)}) )
    | add // [] ) as $clusters3
| ( $clusters3 | map(.needs = needs_of) | sort_by([.page, (.anchorLine // 999999), .id]) ) as $clusters
| ( $clusters | map(. as $c | ._members[] | {(.id): $c.id}) | add // {} ) as $recToCluster
| {
    params: $p,
    records: [ $records[] | .cluster = ($recToCluster[.id] // null) ],
    clusters: [ $clusters[] | del(._members, ._chosen) ],
    summary: {
      records: ($records | length),
      clusters: ($clusters | length),
      bySource: ($records | group_by(.source) | map({(.[0].source): length}) | add // {}),
      byBucket: ($clusters | group_by(.bucket) | map({(.[0].bucket): length}) | add // {}),
      byReason: ($clusters | group_by(.reason) | map({(.[0].reason): length}) | add // {}),
      anchors: ($records | group_by(.anchorResolved) | map({((.[0].anchorResolved // "null")): length}) | add // {}),
      # A record whose rewrite span no longer occurs in the page, or occurs more
      # than once, cannot be applied. A high count means the pages moved on after
      # the review read them, which is worth knowing before grading rather than
      # at the apply step.
      stale: {
        spanAbsent: ([ $records[] | select(.applicable == "missing") ] | length),
        spanAmbiguous: ([ $records[] | select(.applicable == "multiple") ] | length),
        anchorUnresolved: ([ $records[] | select(.anchorResolved == "none" or .anchorResolved == null) ] | length)
      },
      bands: ($records | group_by(.band) | map({((.[0].band // "null")): length}) | add // {}),
      duplicatesCollapsed: (($records | length) - ($clusters | length)),
      netDeltaFix: ([ $clusters[] | select(.bucket == "fix") | ._chosen.delta // 0 ] | add // 0),
      netDeltaPropose: ([ $clusters[] | select(.bucket == "propose") | ._chosen.delta // 0 ] | add // 0),
      held: ([$clusters[] | select(.held)] | length),
      claims: {
        nominated: ([ $records[] | select(.claimDiff.nominated == true) ] | length),
        byShift: ($records | map(select(.claimDiff != null)) | group_by(.claimShift) | map({(.[0].claimShift): length}) | add // {}),
        introducedHeld: ([ $records[] | select(.introducedCheck == "held") ] | length),
        layoutOnly: ([ $records[] | select(.layoutOnly == true) ] | length)
      },
      questions: ([$clusters[] | select(.bucket == "author") | .questions[]] | length)
    }
  }
