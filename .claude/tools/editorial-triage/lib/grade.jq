# grade.jq - calibration logic for grade-triage.sh: sampling, cards, label parsing, agreement and scoring.
#
# grade-triage.sh loads this module with `jq -L <this dir> 'include "grade"; ...'`
# and stays thin: which clusters a round holds, which closing moves a card
# offers, how a labels string parses, how agreement is counted and how a run
# scores are all decided here, so a golden test of the script covers the
# logic. Contract: the grade-triage.sh header, plus the workarea layout and
# cluster shape in
# ~/trade-imports-arch-workspace/.claude/skills/editorial-triage/assets/editorial-triage-schema.md.
# All calibration state lives under <run>/calibration/.
#
# One axis: the closing move. R remove, C correct, W reword, K keep one side
# (with a side A or B), O record as open, I ignore for now, T tell me what to
# do. Labels, grades, the round files and the reports all carry the letter.

# --- moves -------------------------------------------------------------------

def move_order: ["R", "C", "W", "K", "O", "I", "T"];
def move_of_word: {"remove": "R", "correct": "C", "reword": "W", "keep": "K", "open": "O", "ignore": "I", "tell": "T"};
def move_words: "R remove, C correct, W reword, K keep one side, O record as open, I ignore for now, T tell me what to do";

# A move given as a letter or a word, normalised to the letter; null when unknown.
def norm_move:
  if type != "string" then null
  else (ascii_upcase) as $u | (ascii_downcase) as $w
    | if (move_order | index($u)) != null then $u else (move_of_word[$w] // null) end end;
# A side: null when absent, "A" or "B", "?" when anything else.
def norm_side:
  if . == null or . == "" then null
  elif type != "string" then "?"
  else (ascii_upcase) as $u | if $u == "A" or $u == "B" then $u else "?" end end;
# Move with its side for reports, for example K:B.
def ms: .move + (if .side then ":" + .side else "" end);

# --- cluster helpers ---------------------------------------------------------

def sev_num: if type != "string" then 9 else ({"S1": 1, "S2": 2, "S3": 3, "S4": 4, "S5": 5}[.] // 9) end;
def category: "\(.bucket // "unclassified")/\(.reason // "unclassified")";
def starts_none: ((. // "") | ascii_downcase | startswith("none"));
# Page title: the filename without its numeric prefix and extension, hyphens to spaces.
def page_title: if . == null then null elif . == "set" then "set" else (sub("^[0-9]+-"; "") | sub("\\.md$"; "") | gsub("-"; " ")) end;

# Polynomial rolling hash (base 31, modulus 1000003) of a string: the
# reproducible shuffle key. The modulus keeps every intermediate below 2^53.
def rhash: explode | reduce .[] as $c (0; (. * 31 + $c) % 1000003);

# --- formatting --------------------------------------------------------------

def trim_ws: gsub("^[[:space:]]+"; "") | gsub("[[:space:]]+$"; "");
# A span in backticks, trimmed; double backticks when the span holds one.
def q: if . == null then "(none)" else (trim_ws) as $s | if $s == "" then "(delete)" elif ($s | test("`")) then "``" + $s + "``" else "`" + $s + "`" end end;
def signed: if . > 0 then "+" + tostring else tostring end;
def fmt2: (. * 100 | round) as $c | "\(($c / 100) | floor).\(($c % 100) | tostring | if length < 2 then "0" + . else . end)";
def fmt_or_dash: if . == null then "-" else fmt2 end;
def rate($a; $t): if $t == 0 then null else ($a / $t) end;
def ratio_text: "\(.agree) of \(.total)" + (if .rate == null then "" else " (\(.rate | fmt2))" end);
def short_ratio: "\(.agree) (\(.rate | fmt_or_dash))";
def rpad($w): if length < $w then . + (" " * ($w - length)) else . end;
def lpad($w): if length < $w then (" " * ($w - length)) + . else . end;
# Rows of strings, equal length: first column left-aligned, the rest right-aligned, two spaces between.
def pad_table:
  . as $rows | ($rows[0] | length) as $nc
  | [range(0; $nc) as $i | ($rows | map(.[$i] | length) | max)] as $w
  | $rows | map([range(0; $nc) as $i | .[$i] | if $i == 0 then rpad($w[$i]) else lpad($w[$i]) end] | join("  "));

# --- sample ------------------------------------------------------------------

def default_targets: {
  "fix/verified": 8, "propose/grows": 8, "propose/tangent": 7, "propose/removal": 6, "author/author": 8,
  "discard/tangent": 3, "propose/no-rewrite": 2, "propose/restructure": 2, "propose/dispersion": 2,
  "propose/inference": 2, "propose/unresolved": 2, "propose/preference": 1 };

# sample(clusters; prior items [{cluster, category}]; targets; size; seed)
#   -> {picked: [clusters in draw order], targets: {category: {target, drawnBefore, remaining, candidates, drawn}}}
# Targets are cumulative across rounds: a category's remaining target is its
# target minus the clusters of that category drawn in earlier rounds (the
# prior items, whose recorded category is the one they were drawn under).
# Per category the candidates are ordered severity ascending (S1 first, null
# last) then by the hash of "<seed>:<id>"; each walk visits the categories by
# remaining target descending (ties by name) and takes one from each that
# still has target and candidates, until size is reached or nothing is left.
def sample($clusters; $prior; $targets; $size; $seed):
  ($clusters | map({(.id): category}) | add // {}) as $catById
  | ($prior | map(.cluster)) as $priorIds
  | ($prior | map(.category // $catById[.cluster] // "unknown") | group_by(.) | map({(.[0]): length}) | add // {}) as $drawn
  | def target_of: $targets[.] // 2;
    def remaining_of: . as $cat | (($cat | target_of) - ($drawn[$cat] // 0)) | if . < 0 then 0 else . end;
    ([$clusters[] | .id as $id | select(($priorIds | index($id)) == null)
      | . + {_cat: category, _key: [(.severity | sev_num), ("\($seed):\($id)" | rhash), $id]}]
     | group_by(._cat)
     | map({cat: .[0]._cat, queue: (sort_by(._key) | map(del(._cat, ._key))), remaining: (.[0]._cat | remaining_of)})) as $init
  | (([$init[].cat] + ($drawn | keys)) | unique
     | map(. as $cat | ($init | map(select(.cat == $cat)) | .[0]) as $c
         | {($cat): {target: ($cat | target_of), drawnBefore: ($drawn[$cat] // 0), remaining: ($cat | remaining_of), candidates: (($c.queue // []) | length)}})
     | add // {}) as $summary
  | {cats: $init, picked: []}
  | until((.picked | length) >= $size or ([.cats[] | select(.remaining > 0 and (.queue | length) > 0)] | length) == 0;
      (.cats | sort_by([(0 - .remaining), .cat]) | map(.cat)) as $order
      | reduce $order[] as $name (.;
          if (.picked | length) >= $size then .
          else (.cats | map(.cat) | index($name)) as $i
            | if .cats[$i].remaining > 0 and (.cats[$i].queue | length) > 0
              then .picked += [.cats[$i].queue[0]] | .cats[$i].queue |= .[1:] | .cats[$i].remaining -= 1
              else . end
          end))
  | .picked as $picked
  | {picked: $picked,
     targets: ($summary | with_entries(.key as $k | .value += {drawn: ([$picked[] | select(category == $k)] | length)}))};

# --- items and moves ---------------------------------------------------------

def has_rewrite: .before != null and (.after // "") != "";
def is_deletion: .before != null and .after == "";
def removes_span: ((.removes // "") | length) > 0 and ((.removes | starts_none) | not);

# The text R removes: the removes span, else the before, else the card's text.
def remove_span: if removes_span then .removes elif .before != null then .before else .quote end;

# --- equivalent moves --------------------------------------------------------
# Two moves are equivalent on an item when they produce the same text. (1) A
# rewrite whose after equals the before with the removes span cut is a
# removal: the card offers R alone and a C or W counts as R. (2) On a
# contradiction, removing side A is keeping side B and the reverse: an R whose
# span equals the card's text counts as K:B, one equal to the related quote
# as K:A. Equivalence is applied to agreement only; counts stay as said.

# Comparison form of a span: whitespace collapsed, no space before punctuation, a leading
# list marker ("- ", "* ", "1. ") and leading or trailing punctuation dropped. Reviewers quote
# the same text with or without its bullet marker, its joining comma or its full stop.
def norm_cmp:
  (. // "") | trim_ws
  | sub("^([-*•]|[0-9]+[.)])[[:space:]]+"; "")
  | gsub("[[:space:]]+"; " ")
  | gsub("[[:space:]]+(?<p>[,.;:!?])"; "\(.p)")
  | sub("^[,;:][[:space:]]*"; "")
  | sub("[[:space:]]*[.,;:]$"; "");

# The before with the removes span cut, in comparison form; null when removes is not a span found in before.
def removal_text:
  if (removes_span | not) or .before == null then null
  else .before as $b | .removes as $r
    | (if ($b | index($r)) != null then $r elif ($b | index($r | trim_ws)) != null then ($r | trim_ws) else null end) as $span
    | if $span == null then null else ($b | split($span) | join("") | norm_cmp) end end;

# List form: commas and "and" between items become one separator, so "A, B and C" with an
# item removed ("A, B", "A, and C", "A, B and") equals its repaired form ("A and B", "A and C").
def norm_list:
  gsub(",?[[:space:]]+and[[:space:]]+"; " | ")
  | gsub(",[[:space:]]+"; " | ")
  | gsub("([[:space:]]*\\|[[:space:]]*)+"; " | ")
  | sub("^[[:space:]]*\\|[[:space:]]*"; "") | sub("[[:space:]]*\\|[[:space:]]*$"; "");

def rewrite_is_removal:
  (removal_text) as $rt | $rt != null and has_rewrite and ((.after | norm_cmp | norm_list) == ($rt | norm_list));

# On a contradiction, the side the card's R span equals: A (the card's text), B (the related quote), or null.
def r_span_side:
  if .kind != "contradiction" then null
  else (remove_span | norm_cmp) as $s
    | if $s == "" then null
      elif $s == (.quote | norm_cmp) then "A"
      elif (.related[0].quote != null) and $s == (.related[0].quote | norm_cmp) then "B"
      else null end end;

# equivalence -> {rewriteIsRemoval, rAsSide}: rAsSide is the K side an R on this item amounts to.
def equivalence:
  { rewriteIsRemoval: rewrite_is_removal,
    rAsSide: (r_span_side | if . == "A" then "B" elif . == "B" then "A" else null end) };

# canon(equivalence): {move, side} -> the canonical {move, side} for comparison.
def canon($eq):
  . as $m
  | (if ($m.move == "C" or $m.move == "W") and $eq.rewriteIsRemoval then {move: "R", side: null} else {move: $m.move, side: ($m.side // null)} end) as $m2
  | if $m2.move == "R" and $eq.rAsSide != null then {move: "K", side: $eq.rAsSide} else $m2 end;

# The moves a card offers, in card order: every move that is meaningful for
# the record. R, O, I and T always; C for a rewrite whose basis is not rule,
# W for a rule rewrite; K for a contradiction.
#
# A rewrite that produces the same text as the removal is still offered as C or
# W. The two moves read alike on the card, but they are not the same edit: R
# deletes a whole sentence, bullet or paragraph, while C and W restate a
# sentence that survives (H-19). Suppressing the offer would leave a card whose
# only edit is a removal the apply step refuses. H-17 still counts the two as
# agreement when the user and the grader pick differently between them.
def offered:
  . as $it
  | ($it | has_rewrite) as $rw
  | [ "R",
      (if $rw and $it.basis != "rule" then "C" else empty end),
      (if $rw and $it.basis == "rule" then "W" else empty end),
      (if $it.kind == "contradiction" then "K" else empty end),
      "O", "I", "T" ];

# The default move: the grader's move when the cluster has a grade, else the
# rubric's order of preference among the offered moves.
def default_move($o; $grade):
  . as $it
  | def has($m): ($o | index($m)) != null;
    ($it.band // (if ($it.delta // 0) > 0 then "grows" else "neutral" end)) as $band
  | ($it | has_rewrite) as $rw
  | if $grade != null and has($grade.move) then {move: $grade.move, from: "grade", side: (if $grade.move == "K" then $grade.side else null end)}
    elif has("C") and $rw and ((["fact", "citation", "reference"] | index($it.kind)) != null) then {move: "C", from: "rule", side: null}
    elif has("C") and $rw and $it.kind == "contradiction" and ($it.basis == "set" or $it.basis == "source") then {move: "C", from: "rule", side: null}
    elif ($it | removes_span) or ($rw and $band == "grows") then {move: "R", from: "rule", side: null}
    elif has("W") and $band != "grows" then {move: "W", from: "rule", side: null}
    elif has("K") and ($rw | not) then {move: "K", from: "rule", side: null}
    elif $it.basis == "author" then {move: "O", from: "rule", side: null}
    else {move: "I", from: "rule", side: null} end;

# One round item: the cluster plus its lead record (the chosen rewrite, else
# the first member). Related anchors come from the lead record, else from
# the first related cluster's lead record. $grades is the grades index
# ({cluster: grade}); a grade sets the default move.
# The rewrite the cluster can offer: the lead record's when that record holds a
# replacement, else any member's. A record whose `after` is empty proposes a
# deletion, not a reword, and the lead record is often that one, so without the
# fallback a cluster with a usable rewrite on a sibling record reads as having
# none and its correction or reword cannot be planned.
def rewrite_record($c; $byId; $r):
  if $r.before != null and (($r.after // "") != "") then $r
  else (([($c.members // [])[] | $byId[.] // {} | select(.before != null and ((.after // "") != ""))] | first) // $r) end;

def item($byId; $clusters; $grades; $n):
  . as $c | ($byId[$c.chosen // ($c.members[0] // "")] // {}) as $r0
  | rewrite_record($c; $byId; $r0) as $rw
  | ($r0 + {before: $rw.before, after: $rw.after, delta: $rw.delta, band: $rw.band}) as $r
  | ($c.questions // [] | .[0] // {}) as $cq
  | (($r.related // []) | map({page: .page, line: .line, quote: .quote})) as $rel
  | (if ($rel | length) > 0 then $rel
     else (($c.related // [])[0]) as $rid
       | if $rid == null then []
         else (($clusters | map(select(.id == $rid)) | .[0]) // null) as $rc
           | if $rc == null then []
             else ($byId[$rc.chosen // ($rc.members[0] // "")] // {}) as $rr
               | if $rr.quote == null then [] else [{page: $rr.page, line: $rr.line, quote: $rr.quote}] end end end end) as $related
  | { n: $n, cluster: $c.id, category: ($c | category), page: $c.page, title: ($c.page | page_title), line: $c.anchorLine,
      severity: $c.severity, kind: ($r.kind // null), basis: ($r.basis // null), action: ($r.action // null),
      bearing: ($c.bearing // $r.bearing // null), removes: ($c.removes // $r.removes // null),
      point: ($r.point // null), defect: ($r.defect // null), quote: ($r.quote // null),
      before: ($r.before // null),
      after: (if $r.before == null then null else ($r.after // null) end),
      delta: (if $r.before == null then null else ($r.delta // 0) end),
      band: (if $r.before == null then null else ($r.band // null) end),
      question: ($r.question // $cq.text // $cq.question // null),
      owner: ($r.owner // $cq.owner // null),
      cites: ($r.cites // []), related: $related, relatedClusters: ($c.related // []), members: ($c.members // []) }
  | (offered) as $o
  | ($grades[$c.id] // null) as $g
  | default_move($o; $g) as $d
  | . + {moves: {offered: $o, default: $d.move, defaultSide: $d.side, defaultFrom: $d.from,
                 grade: (if $g == null then null else {move: $g.move, side: $g.side, file: $g.file} end),
                 equivalence: equivalence}};

def round_doc($triage; $findings; $grades; $prior; $targets; $size; $seed; $round):
  (($findings.records // []) | map({(.id): .}) | add // {}) as $byId
  | ($triage.clusters // []) as $clusters
  | sample($clusters; $prior; $targets; $size; $seed) as $s
  | $s.picked as $picked
  | { round: $round, seed: $seed, size: ($picked | length), requested: $size, targets: $s.targets,
      items: [range(0; $picked | length) as $i | $picked[$i] | item($byId; $clusters; $grades; $i + 1)] };

# render_round(triage; findings; grades; round doc) -> the round doc with its items rebuilt from
# the current state, same clusters in the same order; {errors} when a cluster is gone.
def render_round($triage; $findings; $grades; $rd):
  (($findings.records // []) | map({(.id): .}) | add // {}) as $byId
  | ($triage.clusters // []) as $clusters
  | ($clusters | map({(.id): .}) | add // {}) as $cById
  | ([$rd.items[] | .cluster | select($cById[.] == null)]) as $missing
  | if ($missing | length) > 0 then {errors: ["clusters not in triage.json: \($missing | join(", "))"]}
    else $rd + {items: [range(0; $rd.items | length) as $i | $cById[$rd.items[$i].cluster] | item($byId; $clusters; $grades; $i + 1)]} end;

# --- cards -------------------------------------------------------------------

def close_line:
  . as $it | $it.moves.default as $d
  | (" (" + (($it.delta // 0) | signed) + " words)") as $growth
  | [ $it.moves.offered[] | . as $m
      | (if $m == "R" then "[R] remove " + ($it | remove_span | q)
         elif $m == "C" then "[C] correct to " + ($it.after | q) + $growth
         elif $m == "W" then "[W] reword to " + ($it.after | q) + $growth
         elif $m == "K" then "[K] keep A " + ($it.quote | q) + " or B " + (($it.related[0].quote // "the other statement") | q)
         elif $m == "O" then "[O] record as open: "
              + (if $it.question then $it.question + " (" + ($it.owner // "owner unknown") + ")"
                 else ((($it.defect // "") | trim_ws) | if . == "" then "(no defect recorded)" else . end) + " (owner unknown)" end)
         elif $m == "I" then "[I] ignore for now"
         else "[T] tell me what to do" end)
        + (if $m == $d then (if $m == "K" and $it.moves.defaultSide then " (default: " + $it.moves.defaultSide + ")" else " (default)" end) else "" end) ]
  | "Close: " + join(" · ");

def card:
  . as $it
  | ([ "\($it.n). \($it.cluster)",
       (if $it.title == null then empty elif $it.line == null then $it.title else "\($it.title), line \($it.line)" end),
       ([$it.severity, $it.kind] | map(select(. != null)) | if length == 0 then empty else join(" ") end),
       "tool: \($it.category)" ] | join(" · ")) as $head
  | [ "### " + $head,
      (if $it.point then "Point: \($it.point)" else empty end),
      (if $it.defect then "Defect: \($it.defect)" else empty end),
      "Text: " + ((if $it.kind == "contradiction" and $it.quote != null then $it.quote
                   elif $it.before != null then $it.before elif ($it | removes_span) then $it.removes else $it.quote end) | q),
      close_line ]
  | join("\n");

def round_md($run):
  "# Calibration round \(.round): \($run)\n\n" + (.items | map(card) | join("\n\n"));

def mix: .items | group_by(.category) | map("\(.[0].category) \(length)") | join(", ");

# --- label -------------------------------------------------------------------

# parse_labels(string; cards in the round) -> {errors: [...], entries: [{n, move, side, note, entry}]}
def parse_labels($s; $size):
  [ $s | splits("[;\n]") | gsub("^[[:space:]]+"; "") | gsub("[[:space:]]+$"; "") | select(length > 0) ]
  | map(. as $e
      | (capture("^(?<n>[0-9]+)[[:space:]]+(?<m>[A-Za-z])(?::(?<side>[A-Za-z]))?(?:[[:space:]]+(?<note>.*))?$") // null) as $m
      | if $m == null then {error: "entry '\($e)' is not <n> <M> [note] (M is R C W K O I T; K may be K:A or K:B)"}
        else ($m.m | norm_move) as $mv | ($m.n | tonumber) as $n | ($m.side | norm_side) as $side
          | (if ($m.note // "") == "" then null else $m.note end) as $note
          | if $mv == null then {error: "unknown move '\($m.m)' in entry '\($e)' (\(move_words))"}
            elif $side == "?" then {error: "side '\($m.side)' in entry '\($e)' is not A or B"}
            elif $side != null and $mv != "K" then {error: "side ':\($side)' in entry '\($e)' applies to K only"}
            elif $mv == "T" and $note == null then {error: "T in entry '\($e)' needs a note saying what to decide"}
            elif $n < 1 or $n > $size then {error: "card \($n) in entry '\($e)' is outside the round (cards 1 to \($size))"}
            else {n: $n, move: $mv, side: $side, note: $note, entry: $e} end end)
  | . as $all
  | ($all | map(select(.error == null)) | group_by(.n) | map(select(length > 1)
      | "card \(.[0].n) appears more than once (entries '\(map(.entry) | join("', '"))')")) as $dups
  | {errors: ([$all[] | .error | select(. != null)] + $dups), entries: [$all[] | select(.error == null)]};

# label_apply(round doc; existing labels doc; string; round) -> {errors} or {labels, overwrote, recorded}
def label_apply($rd; $existing; $s; $round):
  parse_labels($s; ($rd.items | length)) as $p
  | if ($p.errors | length) > 0 then {errors: $p.errors}
    else ($rd.items | map({(.n | tostring): .cluster}) | add // {}) as $byN
      | reduce $p.entries[] as $e ({labels: ($existing.labels // {}), overwrote: []};
          $byN[$e.n | tostring] as $cl
          | (if .labels[$cl] != null then .overwrote += [$cl] else . end)
          | .labels[$cl] = {round: $round, n: $e.n, move: $e.move, side: $e.side, note: $e.note})
      | {labels: .labels, overwrote: .overwrote, recorded: ($p.entries | length)} end;

# label_cluster(triage; existing labels doc; cluster id; move; note; span)
# The plan form of a label: the user's decision on one named cluster, taken from
# the closing plan rather than from a calibration round. A label beats a grade,
# so this is how a K side, a T instruction or an overturned move survives the
# next plan run. `span` is optional and only meaningful for R.
def label_cluster($triage; $existing; $cl; $m; $note; $span):
  ($m | ltrimstr(" ") | rtrimstr(" ")) as $raw
  | ($raw | split(":")) as $parts
  | ($parts[0] | norm_move) as $mv
  | ($parts[1] // null | norm_side) as $side
  | (if ($note | trim_ws) == "" then null else $note end) as $n
  | (if ($span | trim_ws) == "" then null else $span end) as $sp
  | ([$triage.clusters[]? | .id]) as $ids
  | if ($ids | index($cl)) == null then {errors: ["cluster \($cl) is not in triage.json; check the id on the plan"]}
    elif $mv == null then {errors: ["move '\($raw)' is not one of \(move_words)"]}
    elif $side == "?" then {errors: ["side in '\($raw)' is not A or B"]}
    elif $side != null and $mv != "K" then {errors: ["a side applies to K only, not \($mv)"]}
    elif $mv == "T" and $n == null then {errors: ["T needs --note saying what to do"]}
    else ($existing.labels // {}) as $labels
      | {labels: ($labels + {($cl): {round: null, n: null, move: $mv, side: $side, note: $n, span: $sp}}),
         cluster: $cl, move: ($mv + (if $side then ":" + $side else "" end)),
         overwrote: (($labels[$cl] // null) != null)} end;

# --- grades ------------------------------------------------------------------

# grades_index: [{file, doc}] in name order -> {grades: {cluster: item + file, gradedBy, mode, round}, errors: [...]}
# A cluster graded in several files takes the later file by name.
def grades_index:
  reduce .[] as $f ({grades: {}, errors: []};
    ($f.file | split("/") | last) as $name
    | if ($f.doc.items | type) != "array" then .errors += ["\($name): items must be an array"]
      else reduce ($f.doc.items | to_entries[]) as $it (.;
        ($it.value.cluster) as $cl
        | ($it.value.move | norm_move) as $mv | ($it.value.side | norm_side) as $side
        | ($it.value.span // null) as $span
        | if ($cl | type) != "string" then .errors += ["\($name) item \($it.key + 1): cluster is missing"]
          elif $span != null and ($span | type) != "string" then .errors += ["\($name) \($cl): span must be a string"]
          elif $mv == null then .errors += ["\($name) \($cl): move '\($it.value.move // "")' is not one of \(move_words)"]
          elif $side == "?" then .errors += ["\($name) \($cl): side '\($it.value.side)' is not A or B"]
          else .grades[$cl] = ($it.value + {move: $mv, side: $side, file: $name, gradedBy: ($f.doc.gradedBy // null), mode: ($f.doc.mode // null), round: ($f.doc.round // null)}) end) end);

# --- agree -------------------------------------------------------------------

def agreement(f): length as $t | (map(select(f)) | length) as $a | {agree: $a, total: $t, rate: rate($a; $t)};

# Confusion counts: label rows, grade columns, over the moves.
def confusion($order; lf; gf):
  . as $rows
  | { rows: $order, cols: $order,
      counts: ($order | map(. as $r | {($r): ($order | map(. as $c | {($c): ([$rows[] | select((lf) == $r and (gf) == $c)] | length)}) | add // {})}) | add // {}) };

# compare(equivalence): a row {label, grade} -> the canonical forms, whether the moves agree
# (side aside) and whether the sides agree; equivalent marks a move agreement reached
# only through an equivalence (the moves as said differ).
def compare($eq):
  ((.label | {move, side}) | canon($eq)) as $lc
  | ((.grade | {move, side}) | canon($eq)) as $gc
  | {same: ($lc.move == $gc.move), sideSame: ($lc.side == $gc.side), lc: $lc, gc: $gc,
     equivalent: (($lc.move == $gc.move) and (.label.move != .grade.move))};
def both_keep: .cmp.lc.move == "K" and .cmp.gc.move == "K";
def is_disagreement: (.cmp.same | not) or (both_keep and (.cmp.sideSame | not));

def agree($round; $items; $labels; $grades):
  [ $items[] | . as $it | ($it | equivalence) as $eq
    | {n: $it.n, cluster: $it.cluster, category: $it.category, label: ($labels[$it.cluster] // null), grade: ($grades[$it.cluster] // null), eq: $eq}
    | if .label != null and .grade != null then . + {cmp: compare($eq)} else . end ] as $rows
  | ($rows | map(select(.label != null and .grade != null))) as $both
  | { round: $round,
      items: ($items | length),
      compared: ($both | length),
      missingLabel: [$rows[] | select(.label == null) | .cluster],
      missingGrade: [$rows[] | select(.grade == null) | .cluster],
      move: ($both | agreement(.cmp.same)),
      side: ($both | map(select(both_keep)) | agreement(.cmp.sideSame)),
      equivalent: { count: ([$both[] | select(.cmp.equivalent)] | length),
                    items: [$both[] | select(.cmp.equivalent) | {n, cluster, label: (.label | ms), grade: (.grade | ms), as: (.cmp.lc | ms)}] },
      byCategory: ($both | group_by(.category) | map({category: .[0].category, n: length, move: agreement(.cmp.same)})),
      confusion: ($both | confusion(move_order; .label.move; .grade.move)),
      disagreements: [ $both[] | select(is_disagreement)
        | {n, cluster, category, label: {move: .label.move, side: .label.side, note: .label.note},
           grade: {move: .grade.move, side: .grade.side, confidence: .grade.confidence, heuristic: .grade.heuristic, why: .grade.why, file: .grade.file}} ] };

def confusion_table:
  . as $c
  | ([[""] + $c.cols]
     + ($c.rows | map(. as $r | [$r] + ($c.cols | map(. as $col | $c.counts[$r][$col] | tostring)))))
  | pad_table;

def disagreement_line:
  "\(.n). \(.cluster) \(.category): user \(.label | ms)" + (if .label.note then " (\(.label.note))" else "" end)
  + " | grader \(.grade | ms)"
  + (([.grade.heuristic, .grade.why] | map(select(. != null and . != ""))) as $g | if ($g | length) == 0 then "" else " (\($g | join(": ")))" end);

def missing_text: [(if (.missingLabel | length) > 0 then "no label: \(.missingLabel | join(", "))" else empty end),
                   (if (.missingGrade | length) > 0 then "no grade: \(.missingGrade | join(", "))" else empty end)] | join("; ");

def agree_report:
  . as $a
  | [ "agree: round \($a.round), \($a.compared) of \($a.items) items compared" + (($a | missing_text) as $m | if $m == "" then "" else " (\($m))" end),
      "agree: move \($a.move | ratio_text); side where both chose K " + (if $a.side.total == 0 then "none" else ($a.side | ratio_text) end),
      "agree: equivalent moves: \($a.equivalent.count)" ]
    + ($a.equivalent.items | map("  \(.n). \(.cluster): user \(.label), grader \(.grade), both \(.as)"))
    + (([["category", "n", "move"]]
        + ($a.byCategory | map([.category, (.n | tostring), (.move | short_ratio)]))) | pad_table | map("  " + .))
    + ["agree: move confusion (user rows, grader columns, as said)"] + ($a.confusion | confusion_table | map("  " + .))
    + ["agree: disagreements" + (if ($a.disagreements | length) == 0 then ": none" else "" end)]
    + ($a.disagreements | map("  " + disagreement_line))
  | join("\n");

# --- score -------------------------------------------------------------------

# metrics over [{cluster, page, grade}]: counts per move and the rates.
def metrics:
  . as $rows | length as $n
  | ([$rows[] | select(.grade.move == "R" or .grade.move == "C" or .grade.move == "W")] | length) as $closed
  | ([$rows[] | select(.grade.move == "K" or .grade.move == "O" or .grade.move == "T")] | length) as $load
  | ([$rows[] | select(.grade.move == "I")] | length) as $ignored
  | { graded: $n,
      byMove: (move_order | map(. as $m | {($m): ([$rows[] | select(.grade.move == $m)] | length)}) | add),
      closedWithoutUser: rate($closed; $n),
      ignored: rate($ignored; $n),
      load: $load };

# score(clusters; records; grades; labels): records feed the equivalence of each labelled cluster.
def score($clusters; $records; $grades; $labels):
  ([$clusters[] | . as $c | ($grades[$c.id] // null) as $g | select($g != null) | {cluster: $c.id, page: $c.page, grade: $g}]) as $rows
  | ($clusters | map(.id)) as $ids
  | (($records // []) | map({(.id): .}) | add // {}) as $byId
  | ($clusters | map({(.id): .}) | add // {}) as $cById
  | ([$rows[] | select($labels[.cluster] != null) | . + {label: $labels[.cluster]}
      | ($cById[.cluster] | item($byId; $clusters; {}; 0) | equivalence) as $eq
      | . + {eq: $eq, cmp: compare($eq)}]) as $labelled
  | { clusters: ($clusters | length),
      graded: ($rows | length),
      coverage: rate(($rows | length); ($clusters | length)),
      overall: ($rows | metrics),
      pages: ($clusters | group_by(.page) | map(.[0].page as $pg | ($rows | map(select(.page == $pg))) as $pr
          | {page: $pg, clusters: length, coverage: rate(($pr | length); length)} + ($pr | metrics))),
      unknownGrades: [($grades | keys[]) | . as $k | select(($ids | index($k)) == null)],
      agreement: (if ($labelled | length) == 0 then null
          else {labelled: ($labelled | length),
                move: ($labelled | agreement(.cmp.same)),
                side: ($labelled | map(select(both_keep)) | agreement(.cmp.sideSame)),
                equivalent: ([$labelled[] | select(.cmp.equivalent)] | length)} end) };

def score_row:
  . as $r
  | [$r.scope, "\($r.graded)/\($r.clusters)"]
    + (move_order | map($r.byMove[.] | tostring))
    + [($r.closedWithoutUser | fmt_or_dash), ($r.ignored | fmt_or_dash), ($r.load | tostring)];

def score_report:
  . as $s
  | [ "score: \($s.graded) of \($s.clusters) clusters graded (coverage \($s.coverage | fmt_or_dash))" ]
    + (([["scope", "graded", "R", "C", "W", "K", "O", "I", "T", "closed", "ignored", "load"]]
        + [({scope: "overall", clusters: $s.clusters} + $s.overall) | score_row]
        + ($s.pages | map(({scope: .page} + .) | score_row))) | pad_table | map("  " + .))
    + (if ($s.unknownGrades | length) > 0 then ["score: \($s.unknownGrades | length) grade(s) name clusters not in triage.json: \($s.unknownGrades | join(", "))"] else [] end)
    + (if $s.agreement == null then ["score: no labelled cluster has a grade yet (run sample, then label, to measure agreement)"]
       else ["score: agreement on \($s.agreement.labelled) labelled clusters: move \($s.agreement.move | ratio_text); side where both chose K "
             + (if $s.agreement.side.total == 0 then "none" else ($s.agreement.side | ratio_text) end)
             + "; equivalent moves \($s.agreement.equivalent)"] end)
  | join("\n");

# --- plan --------------------------------------------------------------------
# The closing plan turns every cluster into the one move that closes it, with
# the text that move needs. The move comes from the user's label, else from the
# grader's grade; a label overrides a grade for the same cluster. R, C and W
# carry text the apply step edits into the page; K, O and T carry what the user
# has to decide, take to an owner or instruct; I carries nothing. A cluster the
# plan cannot close as it stands goes to problems with the reason.

# The span R removes: the removes span when it is a real span, else a rewrite
# whose after is empty (a deletion), else the anchor quote.
def r_span:
  if removes_span then .removes
  elif .before != null and ((.after // "") == "") then .before
  else (.quote // "") end;

# The move that closes a cluster, or null when neither the user nor the grader gave one.
# A label carries no confidence: it is the user's own move, not a prediction.
# An R may carry its own span: the whole sentence, bullet or paragraph the
# grader or the user names, which overrides the record's span when the record
# names only a fragment inside a surviving sentence (H-19).
def chosen_move($label; $grade):
  if $label != null then {move: $label.move, side: $label.side, note: $label.note, span: ($label.span // null), source: "label", confidence: null}
  elif $grade != null then {move: $grade.move, side: $grade.side, note: ($grade.note // null), span: ($grade.span // null), source: "grade", confidence: ($grade.confidence // null)}
  else null end;

# The one line an O entry records as open: the user's words when they gave them,
# else the question, else the defect, with the owner in brackets.
def open_note($m):
  [($m.note // null), (.question // null), (.defect // null)]
  | map(select(. != null) | trim_ws) | map(select(. != "")) | .[0] as $t
  | (if $t == null then "(no question recorded)" else $t end);

def plan_entry($m; $path):
  . as $it
  | { cluster: $it.cluster, page: $it.page, path: $path, line: $it.line,
      move: $m.move, side: null, before: null, after: null, span: null, sides: null,
      cites: ($it.cites // []), defect: $it.defect, note: $m.note,
      source: $m.source, confidence: $m.confidence }
  | if $m.move == "R" then .span = (($m.span // "") | if . == "" then ($it | r_span) else . end) | .after = ""
    elif $m.move == "C" or $m.move == "W" then .before = $it.before | .after = ($it.after // "")
    elif $m.move == "K" then .side = $m.side
      | .sides = {A: ($it.quote // null), B: (($it.related[0].quote) // null)}
      | .span = (if $m.side == "A" then (($it.related[0].quote) // null)
                 elif $m.side == "B" then $it.quote
                 else null end)
    elif $m.move == "O" then .note = (($it | open_note($m)) + " (" + ($it.owner // "owner unknown") + ")")
    else . end;

def plan_problem($m; $reason; $note):
  . as $it
  | {cluster: $it.cluster, page: $it.page, line: $it.line, move: ($m.move // null),
     source: ($m.source // null), reason: $reason, note: $note};

# True for the moves that change a page: R, C and W. Bind first, because the
# pipe into the list would otherwise rebind . to the list itself.
def edits_the_page: . as $m | (["R", "C", "W"] | index($m)) != null;

# plan_doc(triage; findings; grades; labels; manifest; run) -> the plan document.
# One entry or one problem per cluster, ordered by the manifest's page order,
# then the anchor line, then the cluster id.
def plan_doc($triage; $findings; $grades; $labels; $manifest; $run):
  (($findings.records // []) | map({(.id): .}) | add // {}) as $byId
  | ($triage.clusters // []) as $clusters
  | (($manifest.pages // []) | map({(.page): (.path // null)}) | add // {}) as $pathByPage
  | (($manifest.pages // []) | to_entries | map({(.value.page): .key}) | add // {}) as $orderByPage
  | [ $clusters[] | . as $c
      | ($c | item($byId; $clusters; {}; 0) | del(.n, .moves)) as $it
      | chosen_move(($labels[$c.id] // null); ($grades[$c.id] // null)) as $m
      | (if $c.page == "set" then null else ($pathByPage[$c.page] // $c.path // null) end) as $path
      | (if $m == null then {problem: ($it | plan_problem({}; "ungraded"; "no label and no grade for this cluster"))}
         elif ($m.move == "C" or $m.move == "W") and (($it | has_rewrite) | not)
           then {problem: ($it | plan_problem($m; "no rewrite"; "the record carries no replacement text for \($m.move)"))}
         elif ($m.move | edits_the_page) and $path == null
           then {problem: ($it | plan_problem($m; "no page file";
                 (if $c.page == "set" then "the cluster is set-wide" else "page \($c.page) is not in the manifest" end)))}
         elif $m.move == "R" and ((($it | r_span) | trim_ws) == "")
           then {problem: ($it | plan_problem($m; "no span"; "the record names no text to remove"))}
         else {entry: ($it | plan_entry($m; $path))} end)
      + {_sort: [($orderByPage[$c.page] // 9999), ($c.anchorLine // 999999), $c.id]} ]
  | sort_by(._sort) | map(del(._sort)) as $rows
  | [$rows[] | .entry | select(. != null)] as $entries
  | [$rows[] | .problem | select(. != null)] as $problems
  | def n_move($m): [$entries[] | select(.move == $m)] | length;
    # A K, O or T entry the user has already labelled is decided: the answer is
    # in hand and only the edit remains. Only the entries still carrying the
    # grader's prediction are waiting on the user.
    def user_move: . as $e | (["K", "O", "T"] | index($e.move)) != null;
    { run: $run,
      clusters: ($clusters | length),
      counts: (move_order | map(. as $m | {($m): n_move($m)}) | add),
      closedWithoutUser: (n_move("R") + n_move("C") + n_move("W")),
      leftToUser: ([$entries[] | select(user_move and .source != "label")] | length),
      decided: ([$entries[] | select(user_move and .source == "label")] | length),
      ignored: n_move("I"),
      sources: {label: ([$entries[] | select(.source == "label")] | length),
                grade: ([$entries[] | select(.source == "grade")] | length)},
      entries: $entries,
      problems: $problems };

# --- plan report -------------------------------------------------------------

def at_line: .page + (if .line == null then "" else ":\(.line)" end);
def plural($n; $one; $many): "\($n) " + (if $n == 1 then $one else $many end);

def apply_line:
  "- \(.cluster) \(at_line) \(.move) "
  + (if .move == "R" then (.span | q) else (.before | q) + " to " + (.after | q) end);

def decide_line:
  if .move == "T" then "- \(.cluster) \(at_line) T \(.note // "(no instruction recorded)")"
  else . as $e | ($e.sides.A | q) as $a | ($e.sides.B | q) as $b
    | "- \($e.cluster) \($e | at_line) K "
      + (if $e.side == null then "no default side: A \($a), B \($b)"
         elif $e.side == "A" then "keep A \($a), cut B \($b)"
         else "keep B \($b), cut A \($a)" end) end;

def plan_md($run):
  . as $p
  | [$p.entries[] | select(.move | edits_the_page)] as $apply
  | [$p.entries[] | select(.move == "K" and .source != "label")] as $keep
  | [$p.entries[] | select(.move == "T" and .source != "label")] as $tell
  | [$p.entries[] | select(.move == "O")] as $open
  | [$p.entries[] | . as $e | select((["K", "T"] | index($e.move)) != null and $e.source == "label")] as $decided
  | ([ "# Closing plan: \($run)",
       "",
       "Clusters \($p.clusters). Moves: " + (move_order | map("\(.) \($p.counts[.])") | join(", ")) + ".",
       "",
       "Closed without the user \($p.closedWithoutUser), decided by the user \($p.decided), still to decide \($p.leftToUser), ignored \($p.ignored), problems \($p.problems | length).",
       "",
       "## Apply",
       "",
       "R, C and W close without the user. The apply step edits these spans into the pages." ]
     + (if ($apply | length) == 0 then ["", "Nothing to apply."] else [""] + ($apply | map(apply_line)) end)
     + [ "", "## Decide", "",
         "K needs the side that survives; T needs the closing instruction." ]
     + (if (($keep | length) + ($tell | length)) == 0 then ["", "Nothing to decide."]
        else [""] + ($keep | map(decide_line)) + ($tell | map(decide_line)) end)
     + [ "", "## Decided, awaiting the edit", "",
         "The user has answered these. The apply step does not touch them, because the surviving side is a choice about meaning: enact each one by hand." ]
     + (if ($decided | length) == 0 then ["", "None."]
        else [""] + ($decided | map(decide_line)) end)
     + [ "", "## Open", "",
         "Open points the set cannot settle, one line each with an owner, for the user to take to that owner." ]
     + (if ($open | length) == 0 then ["", "Nothing open."]
        else [""] + ($open | map("- \(.cluster) \(at_line) \(.note)")) end)
     + [ "", "## Ignored", "",
         "\(plural($p.ignored; "cluster"; "clusters")), nothing to change." ]
     + [ "", "## Problems", "",
         "Clusters the plan cannot close as they stand." ]
     + (if ($p.problems | length) == 0 then ["", "None."]
        else [""] + ($p.problems | map("- \(.cluster) \(at_line)"
              + (if .move == null then "" else " \(.move)" end) + ": \(.reason)"
              + (if .note == null then "" else " (\(.note))" end))) end))
  | join("\n") + "\n";

# --- spot check --------------------------------------------------------------
# n apply entries drawn with the same reproducible hash the sample draws with,
# so the same seed over the same plan always shows the same entries.

# rhash is a rolling polynomial, so two ids that differ only in their last
# character hash to adjacent values and a sort by that key returns a run of
# neighbouring clusters. sample dilutes that by drawing per category; a spot
# check draws from one pool, so it remixes the hash with Knuth's golden-ratio
# multiplier first. The product stays below 2^53, so the arithmetic is exact.
def draw_key($seed): ("\($seed):\(.)" | rhash) * 2654435761 % 1000003;

def spot_check($plan; $n; $seed):
  [$plan.entries[] | select(.move | edits_the_page)] as $apply
  | ($apply | sort_by([(.cluster | draw_key($seed)), .cluster]) | .[0:$n]) as $drawn
  | { seed: $seed, requested: $n, size: ($drawn | length), of: ($apply | length),
      items: [range(0; $drawn | length) as $i | $drawn[$i]
              | {n: ($i + 1), cluster, page, line, move,
                 before: (if .move == "R" then .span else .before end),
                 after: (if .move == "R" then "" else .after end)}] };

def spot_md:
  . as $s
  | [ "## Spot check", "",
      "\($s.size) of \($s.of) apply " + (if $s.of == 1 then "entry" else "entries" end)
      + ", drawn with seed \($s.seed)." ]
    + ($s.items | map(["", "\(.n). \(at_line) \(.move)", "   before \(.before | q)", "   after \(.after | q)"]) | add // [])
  | join("\n") + "\n";

# --- apply -------------------------------------------------------------------
# The apply step edits the plan's R, C and W entries into the page files by
# verbatim replacement. An entry applies only when its phrase occurs exactly
# once in the page, so a moved or already-edited page skips rather than
# guesses. R removes its span and tidies what the removal leaves behind.
#
# A removal deletes a whole unit: a sentence, a bullet, a table row or a
# paragraph. Cutting a fragment out of a sentence that survives strands a
# subject, leaves a lowercase opening or breaks the style gate, so apply
# refuses such an entry instead of making the edit (grading-rubric.md, H-19).

def is_list_line: test("^[[:space:]]*([-*+]|[0-9]+[.)])[[:space:]]");

# The line without its list marker or table pipes and without outer space.
def unit_body: sub("^[[:space:]]*([-*+]|[0-9]+[.)])[[:space:]]*"; "") | trim_ws;

# Is the span at $at a whole unit of $line: the entire body, everything the
# line holds, a complete parenthetical aside, or a sentence that opens the body
# or follows a sentence end and closes on a full stop, question mark or
# exclamation mark.
#
# A complete parenthetical counts because deleting one leaves the sentence
# around it whole, which is what a pointer aside such as "(see Cookie design,
# in Cookies and token transport)" usually is.
def is_parenthetical: test("^\\([^()]*\\)$");

def whole_unit($line; $ph; $at):
  ($ph | trim_ws) as $s
  | ($line | unit_body) as $body
  | (($line[0:$at] + $line[($at + ($ph | length)):]) | unit_body) as $rest
  | if $s == "" then false
    elif $rest == "" then true
    elif $s == $body then true
    elif ($s | is_parenthetical) then true
    else (($body | startswith($s)) or (($body | index(". " + $s)) != null))
         and ($s | test("[.?!]$")) end;

# The line a removal leaves: leading indent kept, doubled spaces collapsed,
# a doubled comma joined and a space before a comma or full stop closed up.
def tidy_removed:
  . as $l
  | ($l | sub("[^[:space:]].*$"; "")) as $ind
  | $ind + ($l[($ind | length):]
      | gsub("[[:space:]]{2,}"; " ")
      | gsub(",[[:space:]]*,"; ",")
      | gsub("[[:space:]]+(?<p>[,.])"; "\(.p)")
      | sub("[[:space:]]+$"; ""));

def phrase_of: if .move == "R" then (.span // "") else (.before // "") end;
def replacement_of: if .move == "R" then "" else (.after // "") end;

# A rewrite whose replacement contains the phrase it replaces is not idempotent:
# the phrase survives the edit, so a second apply run finds it again and adds the
# replacement's extra words a second time. Such an entry is applied only while the
# page does not already hold the replacement.
def grows_around_phrase:
  . as $e
  | $e.move != "R" and (($e.before // "") | length) > 0
    and (($e.after // "") | contains($e.before // ""));
def already_applied($lines; $e):
  ($e | grows_around_phrase)
  and (($e.after // "") as $a | any($lines[]; index($a) != null));

def skip($e; $status; $reason):
  .results += [{cluster: $e.cluster, move: $e.move, line: $e.line, at: null,
                status: $status, reason: $reason, dropped: false}];

# apply_page(lines; entries) -> {lines, results}: the entries in the order given.
def apply_page($lines0; $entries):
  reduce $entries[] as $e ({lines: $lines0, results: []};
    .lines as $ls
    | ($e | phrase_of) as $ph
    | if ($ph | length) == 0 then skip($e; "skipped-absent"; "the entry carries no text to find")
      elif already_applied($ls; $e) then skip($e; "skipped-applied"; "the replacement is already in the page, and it contains the phrase it replaces, so applying again would repeat the addition")
      else ([range(0; $ls | length) as $i | {i: $i, n: ($ls[$i] | indices($ph) | length)} | select(.n > 0)]) as $hits
        | ($hits | map(.n) | add // 0) as $total
        | if $total == 0 then skip($e; "skipped-absent"; "the phrase is not in the page")
          elif $total > 1 then skip($e; "skipped-multiple"; "the phrase occurs \($total) times in the page")
          else ($hits[0].i) as $i | ($ls[$i]) as $line | ($line | index($ph)) as $at
            | if $e.move == "R" and ((whole_unit($line; $ph; $at)) | not)
              then skip($e; "skipped-fragment"; "the span is not a whole sentence, bullet or paragraph; a removal deletes a whole unit, so this finding needs a reword instead")
              else
            ($line[0:$at] + ($e | replacement_of) + $line[($at + ($ph | length)):]) as $new0
            | (if $e.move == "R" then ($new0 | tidy_removed) else $new0 end) as $new
            | (($e.move == "R") and ($new | test("^[[:space:]]*$"))
               and ((($i > 0) and ($ls[$i - 1] | is_list_line))
                    or ((($i + 1) < ($ls | length)) and ($ls[$i + 1] | is_list_line)))) as $drop
            | .lines = (if $drop then ($ls | del(.[$i])) else ($ls | .[$i] = $new) end)
            | .results += [{cluster: $e.cluster, move: $e.move, line: $e.line, at: ($i + 1),
                            status: "applied", reason: null, dropped: $drop,
                            was: $line, now: (if $drop then null else $new end)}]
              end
          end
      end);

# apply_doc(plan; pages [{page, path, text}]; moves; run) -> the pages with their
# new text and one result per selected entry. Entries run per page in descending
# line order, so an earlier edit never moves a line a later one still has to find.
def apply_doc($plan; $pages; $moves; $run):
  ([$plan.entries[] | . as $e | select(($e.move | edits_the_page) and (($moves | index($e.move)) != null))]) as $sel
  | ($pages | map(.page)) as $known
  | [ $pages[] | . as $pg
      | ([$sel[] | select(.page == $pg.page)] | sort_by([(0 - (.line // -1)), .cluster])) as $es
      | ($pg.text | split("\n")) as $lines
      | (apply_page($lines; $es)) as $r
      | ([$r.results[] | select(.status == "applied")] | length) as $applied
      | {page: $pg.page, path: $pg.path, entries: ($es | length), applied: $applied,
         changed: ($applied > 0), gate: "none", failLines: [],
         results: $r.results, text: ($r.lines | join("\n"))} ] as $done
  | [$sel[] | . as $e | select(($known | index($e.page)) == null)
     | {cluster: $e.cluster, move: $e.move, line: $e.line, at: null, status: "skipped-absent",
        reason: "page \($e.page) is not in the manifest", dropped: false, page: $e.page}] as $orphans
  | {run: $run, moves: ($moves | join("")), selected: ($sel | length),
     pages: $done, orphans: $orphans};

# gate_merge(gate results {page: {gate, failLines}}) -> the pages carrying their
# gate result, and every entry applied to a failing page marked gate-fail.
def gate_merge($gates):
  .pages |= map(. as $pg | ($gates[$pg.page] // null) as $g
    | if $g == null then . else . + {gate: $g.gate, failLines: ($g.failLines // [])} end
    | . as $p2 | .results |= map(if .status == "applied" and $p2.gate == "fail" then .status = "gate-fail" else . end));

def applied_doc($dryRun):
  . as $a
  | [$a.pages[] | .page as $pg | .results[] | . + {page: $pg}] as $rows
  | ($rows + $a.orphans) as $all
  | def n_status($s): [$all[] | select(.status == $s)] | length;
    { run: $a.run, dryRun: $dryRun, moves: $a.moves, selected: $a.selected,
      pages: [$a.pages[] | {page, path, entries, applied, changed, gate, failLines}],
      entries: [$all[] | {cluster, page, move, line, at, status, reason, dropped}],
      summary: {selected: $a.selected,
                applied: (n_status("applied") + n_status("gate-fail")),
                skipped: (n_status("skipped-absent") + n_status("skipped-multiple") + n_status("skipped-fragment") + n_status("skipped-applied")),
                fragments: n_status("skipped-fragment"),
                alreadyApplied: n_status("skipped-applied"),
                gateFail: n_status("gate-fail")} };

def apply_report($dryRun; $diff):
  . as $a
  | ($a.summary) as $s
  | (if $dryRun then "would apply" else "applied" end) as $verb
  | ([ (if $dryRun then "apply: dry run, no page written" else empty end),
       "apply: \(plural($a.selected; "entry"; "entries")) selected (moves \($a.moves)): \($verb) \($s.applied), skipped \($s.skipped), gate FAIL \($s.gateFail)" ]
     + ([$a.pages[] | . as $pg
         | ["apply: \($pg.page): \($verb) \($pg.applied) of \(plural($pg.entries; "entry"; "entries"))"
            + (if $pg.gate == "fail" then ", gate FAIL" elif $pg.gate == "pass" then ", gate pass" else "" end)]
           + ([$a.entries[] | select(.page == $pg.page and (.status | startswith("skipped")))
               | "apply:   \(.cluster) \(.move) \(.status): \(.reason)"])
           + ($pg.failLines | map("apply:   " + .))] | add // [])
     + ([$a.entries[] | select(.at == null and ((.reason // "") | test("not in the manifest")))
         | "apply: \(.cluster) \(.move) \(.status): \(.reason)"])
     + [$diff])
  | join("\n");
