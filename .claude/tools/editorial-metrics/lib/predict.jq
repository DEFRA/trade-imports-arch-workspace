# predict.jq - predicted page visits and minimum context per role from the
# process model's formulas, set against the measured tables.
# Input: {params, tables}. params: {N, S, U, base_tokens, refs: {role: tokens},
# pages: [{page, tokens, C, K, changed}], grade_passes, verify_spawns}.
# tables: summarise.sh's tables.json.
# Formulas (process-model.json step ids): scope W2 = S; drill W3 = U;
# structural W4 = N; editor-pass W5 = 1; verify T3 = V (1 nominal);
# grade T4 = C_p ranged reads per pass; cold-reader T8 = 1 per changed page;
# main T8 = 1 diff view per changed page. Scripts (W1, T2, T5, T7) read
# pages at no LLM cost and are not predicted here.

def family:
  if test("^grade") then "grade"
  elif test("cold") then "cold-reader"
  elif test("^T[0-9]+-[0-9]+-apply") then "backlog-apply"
  else . end;

def r1: . * 10 | round / 10;

.params as $p | .tables as $t
| ($p.pages | map(.tokens) | add) as $set_tokens
| ([$t.pages[] | select(.class == "page") | . + {fam: (.role | family)}]
   | group_by([.file, .fam]) | map({key: "\(.[0].file)|\(.[0].fam)",
       value: {reads: (map(.full_reads + .ranged_reads) | add), full: (map(.full_reads) | add),
               searches: (map(.searches) | add), edits: (map(.edits) | add)}}) | from_entries) as $act
| ([$t.agents[] | . + {fam: (.role | family)}] | group_by(.fam)
   | map({key: .[0].fam, value: {n: length, peak_k: (map(.peak_context) | add / length / 1000 | r1),
                                  turns: (map(.responses) | add / length | r1)}}) | from_entries) as $ag
| {
  visits: [$p.pages[] as $pg
    | ({scope: $p.S, drill: $p.U, structural: $p.N, "editor-pass": 1,
        verify: 1, grade: $pg.C, "cold-reader": (if $pg.changed then 1 else 0 end),
        main: (if $pg.changed then 1 else 0 end)}) as $pred
    | (["scope", "drill", "structural", "editor-pass", "verify", "grade", "cold-reader", "main", "backlog-apply"])[] as $role
    | ($act["\($pg.page)|\($role)"] // {reads: 0, full: 0, searches: 0, edits: 0}) as $a
    | select(($pred[$role] // 0) > 0 or $a.reads > 0 or $a.searches > 0)
    | {page: $pg.page, role: $role, step: ({scope: "W2", drill: "W3", structural: "W4", "editor-pass": "W5", verify: "T3", grade: "T4", "cold-reader": "T8", main: "T8", "backlog-apply": "outside the model"}[$role]),
       predicted_reads: ($pred[$role] // 0), actual_reads: $a.reads, actual_full_reads: $a.full,
       actual_searches: $a.searches, actual_edits: $a.edits,
       delta: ($a.reads - ($pred[$role] // 0))}],
  context: [(["drill", "structural", "editor-pass", "verify", "grade", "cold-reader"])[] as $role
    | select($ag[$role] != null)
    | (if ($role | IN("drill", "structural", "editor-pass")) then $set_tokens
       elif $role == "cold-reader" then ($p.pages | map(select(.changed) | .tokens) | add // 0)
       else ($p.pages | map(.tokens) | add / length) end) as $page_tokens
    | ($p.base_tokens + ($p.refs[$role] // 0) + $page_tokens) as $min
    | {role: $role, agents: $ag[$role].n, avg_turns: $ag[$role].turns,
       predicted_min_context_k: ($min / 1000 | r1), base_k: ($p.base_tokens / 1000 | r1),
       refs_k: (($p.refs[$role] // 0) / 1000 | r1), pages_k: ($page_tokens / 1000 | r1),
       actual_avg_peak_k: $ag[$role].peak_k,
       peak_over_min: (if $min > 0 then ($ag[$role].peak_k * 1000 / $min * 100 | round / 100) else null end)}],
  params: ($p | del(.pages) + {set_tokens: $set_tokens})
}
