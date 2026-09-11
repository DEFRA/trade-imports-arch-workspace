# normalize-legacy.jq - turn a pre-v2 editorial-review result into records.
#
# Input:  the workflow result {units, structural, editorPass}.
# Args:   $pages - array of {page, path, no} built by build-triage.sh.
# Output: {"records": [record, ...]} with reviewer-set v2 fields null
#         (a LEGACY_CLASSIFIER fills them later) and legacy: true.
#
# Contract: ../../../skills/editorial-triage/assets/editorial-triage-schema.md

def basename: split("/") | last;

def page_by_no($n):
  ([$pages[] | select(.no == $n)] | first) // null;

# All "NN:LL" references (editor pass style).
def refs_colon:
  [match("(?<p>[0-9]{2}):(?<l>[0-9]+)"; "g")
   | {page: .captures[0].string, line: (.captures[1].string | tonumber)}];

# All "NN Lxx" references (structural pass style).
def refs_l:
  [match("(?<p>[0-9]{2}) L(?<l>[0-9]+)"; "g")
   | {page: .captures[0].string, line: (.captures[1].string | tonumber)}];

# A leading "NN:" or "NN " page marker with no line.
def ref_lead:
  (capture("^[-*[:space:]]*(?<p>[0-9]{2})(:|[[:space:]])") | {page: .p, line: null}) // null;

def first_dquoted:
  (capture("\"(?<q>[^\"]{6,})\"") | .q) // null;

def first_squoted:
  (capture("(^|[[:space:](])'(?<q>[^']{6,})'") | .q) // null;

# Bare "Lxx" line references, used when a leading page marker names the page
# but the line references carry no page prefix (structural style "03: ... (L10-108)").
def refs_bare_l:
  [match("\\bL(?<l>[0-9]+)"; "g") | {line: (.captures[0].string | tonumber)}];

def title_bold:
  (capture("\\*\\*(?<t>[^*]+)\\*\\*") | .t) // null;

# Split the cold editor's prose into numbered items; headings reset the
# current item so a heading line never joins an item body.
def editor_items:
  (split("\n")
   | reduce .[] as $ln ({items: [], cur: null};
       if ($ln | test("^[0-9]+\\. ")) then
         .items += (if .cur then [.cur] else [] end)
         | .cur = {n: ($ln | capture("^(?<n>[0-9]+)\\.") | .n | tonumber), text: $ln}
       elif ($ln | test("^#")) then
         .items += (if .cur then [.cur] else [] end) | .cur = null
       elif .cur then .cur.text += "\n" + $ln
       else . end)
   | .items + (if .cur then [.cur] else [] end));

def blank_v2:
  {line: null, kind: null, severity: null, action: null, basis: null, cites: null,
   point: null, bearing: null, removes: null, before: null, after: null, loss: null,
   owner: null, moveTo: null, related: []};

def anchor_from_refs($refs):
  if ($refs | length) > 0 then
    (page_by_no($refs[0].page)) as $pg
    | {page: ($pg.page // "set"), path: ($pg.path // null), line: $refs[0].line,
       related: ([$refs[1:][] | {page: ((page_by_no(.page) | .page) // "set"), line: .line, quote: null}]
                 | map(select(.page != ($pg.page // "set") or .line != $refs[0].line)) | unique)}
  else {page: "set", path: null, line: null, related: []} end;

# Drill findings: one record per finding, page from the unit path.
def drill_records:
  [ (.units // [])[] as $u
    | ($u.path | basename) as $pg
    | (($u.findings // []) | to_entries[])
    | blank_v2 + {
        source: "drill", reviewer: ("drill:" + $pg), page: $pg, path: $u.path,
        legacyRef: {unit: $u.unit, index: .key},
        quote: .value.location, category: .value.category, defect: .value.defect,
        proposal: (.value.proposal // null), question: (.value.question // null),
        legacy: true } ];

# Cold editor items: page and line from the first NN:LL reference.
def editor_records:
  if (.editorPass | type) != "string" then [] else
  [ (.editorPass | editor_items)[] as $it
    | ($it.text | refs_colon) as $refs
    | anchor_from_refs($refs) as $a
    | blank_v2 + {
        source: "editor", reviewer: "editor", page: $a.page, path: $a.path,
        legacyRef: {section: "editorPass", index: $it.n},
        line: $a.line, related: $a.related,
        quote: (($it.text | first_dquoted) // ($it.text | title_bold) // ($it.text[0:80])),
        category: null, defect: $it.text, proposal: null, question: null, legacy: true } ]
  end;

def structural_string_record($section; $i; $s):
  ( ($s | refs_l) + ($s | refs_colon)
    + ( ($s | ref_lead) as $lead
        | if $lead then
            (($s | refs_bare_l) as $bare
             | if ($bare | length) > 0 then [{page: $lead.page, line: $bare[0].line}] else [$lead] end)
          else [] end ) ) as $refs
  | anchor_from_refs($refs) as $a
  | blank_v2 + {
      source: "structural", reviewer: ("structural:" + $section), page: $a.page, path: $a.path,
      legacyRef: {section: $section, index: $i},
      line: $a.line, related: $a.related,
      quote: (($s | first_squoted) // ($s | first_dquoted) // ($s[0:80])),
      category: null, defect: $s, proposal: null, question: null, legacy: true };

def structural_records:
  ( [ ((.structural.redundancies // []) | to_entries[])
      | (.value.homes | refs_l) as $refs
      | anchor_from_refs($refs) as $a
      | blank_v2 + {
          source: "structural", reviewer: "structural:redundancies", page: $a.page, path: $a.path,
          legacyRef: {section: "redundancies", index: .key},
          line: $a.line, related: $a.related,
          quote: .value.fact, category: "repetition",
          defect: (.value.judgment + " Homes: " + .value.homes),
          proposal: .value.proposal, question: null, legacy: true } ]
  + [ ((.structural.structure // []) | to_entries[]) | structural_string_record("structure"; .key; .value) ]
  + [ ((.structural.crossReferences // []) | to_entries[]) | structural_string_record("crossReferences"; .key; .value) ]
  + [ ((.structural.shapes // []) | to_entries[]) | structural_string_record("shapes"; .key; .value) ] );

{records: (drill_records + editor_records + structural_records)}
