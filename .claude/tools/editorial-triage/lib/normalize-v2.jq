# normalize-v2.jq - turn a version 3 editorial review result into records.
#
# Input:  the review result {version, mode, intent, sourceHashes, units,
#         structural, editorPass}, or the {units, extra} form build-triage.sh
#         assembles from a review directory.
# Args:   $pages - array of {page, path, no, key, hash} built by build-triage.sh.
# Output: {"records": [record, ...], "retains": [retain, ...]}: the reviewer-set
#         fields as the reviewers returned them, plus source, reviewer, path,
#         related, cites and guess; and every retain a reviewer recorded.
#
# Contract: ../../../skills/editorial-triage/assets/editorial-triage-schema.md
# Result shapes: ../../editorial/assemble-review.sh, which validates the findings and builds the result

def basename: split("/") | last;
def path_of($pg): ([$pages[] | select(.page == $pg) | .path] | first) // null;
def known($pg): ([$pages[] | select(.page == $pg)] | length) > 0;
def anchor: {page: .page, line: (.line // null), quote: (.quote // null)};

# The provenance every record carries and the defaults for the optional
# reviewer fields. A page the run does not know becomes "set": a set-wide
# item with no path, anchored by its quote alone.
def base($source; $reviewer):
  . + {source: $source, reviewer: $reviewer,
       related: ((.related // []) | map(select(type == "object")) | map(anchor) | unique),
       cites: (.cites // null), guess: (.guess // false)}
  | .page = (if (.page | type) == "string" and known(.page) then .page else "set" end)
  | .path = path_of(.page);

# Drill findings: one record per finding; the unit's page overrides the reviewer's.
def drill_records:
  [ (.units // [])[] as $u | ($u.path | basename) as $pg
    | ($u.findings // [])[]
    | .page = $pg
    | base("drill"; "drill:" + $pg) ];

# Structural findings, plus one record per redundancy occurrence with the home
# as a related anchor and the repeated fact carried for the report.
def structural_records:
  if (.structural | type) != "object" then [] else
    [ (.structural.findings // [])[] | base("structural"; "structural:findings") ]
    + [ (.structural.redundancies // [])[] as $red
        | ($red.occurrences // [])[]
        | .kind = (.kind // "repetition")
        | .related = ((.related // []) + (if ($red.home | type) == "object" then [$red.home] else [] end))
        | .fact = ($red.fact // null)
        | base("structural"; "structural:redundancies") ]
  end;

# Cold editor: the page findings, the reading-order findings, and one record per
# set-wide pattern, anchored at the pattern's finding with every instance related.
def editor_records:
  if (.editorPass | type) != "object" then [] else
    [ (.editorPass.pages // [])[] as $pg
      | ($pg.findings // [])[]
      | .page = (.page // $pg.page)
      | base("editor"; "editor:pages") ]
    + [ (.editorPass.order // [])[] | base("editor"; "editor:order") ]
    + [ (.editorPass.patterns // [])[] as $pat
        | (if ($pat.finding | type) == "object" then $pat.finding else {} end)
        | .pattern = ($pat.pattern // null)
        | .related = ((.related // []) + (($pat.instances // []) | map(select(type == "object"))))
        | base("editor"; "editor:patterns") ]
  end;

# Review-directory form: each extra file holds one non-drill reviewer's items.
def extra_records:
  [ (.extra // [])[] as $x | ($x.items // [])[]
    | .page = (.page // $x.page)
    | base((if (($x.reviewer // "") | startswith("editor")) then "editor" else "structural" end);
           ($x.reviewer // "structural")) ];

# Retains: passages a reviewer considered and found adequate. A drill unit and
# an editor page each may carry `retains`: [{line, quote, reason}].
def retains:
  [ (.units // [])[] as $u | ($u.path | basename) as $pg
    | ($u.retains // [])[]
    | {page: $pg, line: (.line // null), quote: .quote, reason: .reason, reviewer: ("drill:" + $pg)} ]
  + [ ((.editorPass // {}) | .pages // [])[] as $pg
      | ($pg.retains // [])[]
      | {page: $pg.page, line: (.line // null), quote: .quote, reason: .reason, reviewer: "editor:pages"} ];

{records: (drill_records + structural_records + editor_records + extra_records), retains: retains}
