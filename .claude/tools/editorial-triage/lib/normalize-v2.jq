# normalize-v2.jq - turn a v2 editorial-review result into records.
#
# Input:  the workflow result {version, units, structural, editorPass}, or the
#         {units, extra} form build-triage.sh assembles from a review directory.
# Args:   $pages - array of {page, path, no} built by build-triage.sh.
# Output: {"records": [record, ...]}: the reviewer-set fields as the reviewers
#         returned them, legacy: false, plus source, reviewer, legacyRef (the
#         record's place in the raw result), path, related, cites and guess.
#
# Contract: ../../../skills/editorial-triage/assets/editorial-triage-schema.md
# Result shapes: ../../../workflows/editorial-review.js (FINDING, STRUCTURAL_SCHEMA, EDITOR_SCHEMA)

def basename: split("/") | last;
def path_of($pg): ([$pages[] | select(.page == $pg) | .path] | first) // null;
def known($pg): ([$pages[] | select(.page == $pg)] | length) > 0;
def anchor: {page: .page, line: (.line // null), quote: (.quote // null)};

# The provenance every record carries and the defaults for the optional
# reviewer fields. A page the run does not know becomes "set": a set-wide
# item with no path, anchored by its quote alone.
def base($source; $reviewer; $ref):
  . + {source: $source, reviewer: $reviewer, legacyRef: $ref, legacy: false,
       related: ((.related // []) | map(select(type == "object")) | map(anchor) | unique),
       cites: (.cites // null), guess: (.guess // false)}
  | .page = (if (.page | type) == "string" and known(.page) then .page else "set" end)
  | .path = path_of(.page);

# Drill findings: one record per finding; the unit's page overrides the reviewer's.
def drill_records:
  [ (.units // [])[] as $u | ($u.path | basename) as $pg
    | (($u.findings // []) | to_entries[]) | .key as $i | .value
    | .page = $pg
    | base("drill"; "drill:" + $pg; {unit: $u.unit, index: $i}) ];

# Structural findings, plus one record per redundancy occurrence with the home
# as a related anchor and the repeated fact carried for the report.
def structural_records:
  if (.structural | type) != "object" then [] else
    [ ((.structural.findings // []) | to_entries[]) | .key as $i | .value
      | base("structural"; "structural:findings"; {section: "findings", index: $i}) ]
    + [ ((.structural.redundancies // []) | to_entries[]) | .key as $ri | .value as $red
        | (($red.occurrences // []) | to_entries[]) | .key as $oi | .value
        | .kind = (.kind // "repetition")
        | .related = ((.related // []) + (if ($red.home | type) == "object" then [$red.home] else [] end))
        | .fact = ($red.fact // null)
        | base("structural"; "structural:redundancies"; {section: "redundancies", index: ($ri * 100 + $oi)}) ]
  end;

# Cold editor: the page findings, the reading-order findings, and one record per
# set-wide pattern, anchored at the pattern's finding with every instance related.
def editor_records:
  if (.editorPass | type) != "object" then [] else
    [ ((.editorPass.pages // []) | to_entries[]) | .key as $pi | .value as $pg
      | (($pg.findings // []) | to_entries[]) | .key as $fi | .value
      | .page = (.page // $pg.page)
      | base("editor"; "editor:pages"; {section: "pages", index: ($pi * 100 + $fi)}) ]
    + [ ((.editorPass.order // []) | to_entries[]) | .key as $i | .value
        | base("editor"; "editor:order"; {section: "order", index: $i}) ]
    + [ ((.editorPass.patterns // []) | to_entries[]) | .key as $i | .value as $pat
        | (if ($pat.finding | type) == "object" then $pat.finding else {} end)
        | .pattern = ($pat.pattern // null)
        | .related = ((.related // []) + (($pat.instances // []) | map(select(type == "object"))))
        | base("editor"; "editor:patterns"; {section: "patterns", index: $i}) ]
  end;

# Review-directory form: each extra file holds one non-drill reviewer's items.
def extra_records:
  [ (.extra // [])[] as $x | (($x.items // []) | to_entries[]) | .key as $i | .value
    | .page = (.page // $x.page)
    | base((if (($x.reviewer // "") | startswith("editor")) then "editor" else "structural" end);
           ($x.reviewer // "structural"); {section: ($x.reviewer // "extra"), index: $i}) ];

{records: (drill_records + structural_records + editor_records + extra_records)}
