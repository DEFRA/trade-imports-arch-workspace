# run-metrics.jq - one run's metrics from its summarised extract and its
# triage workarea. Input: {tables, calls, manifest, findings, triage, grades,
# plan, applied, exclude}. `exclude` is a regex of roles left out of the
# totals (the orchestrating session, when it also carries other work); their
# cost is reported apart. Output: metrics.json, every value a number, so runs
# compare field by field.

def stage: if test("^cold editor"; "i") or test("^(snapshot|scope|drill|structural|editor-pass|reviewer|loader|review|paragraph pass|page pass|set pass)"; "i") then "review"
  elif test("^(verify|grade|closer|cold)") then "triage"
  elif . == "main" then "main" else "other" end;
def r2: . * 100 | round / 100;
def r1: . * 10 | round / 10;
def sumf(f): map(f) | add // 0;

.exclude as $ex
| (.manifest.pages | map(.page)) as $pages
| ($pages | length) as $n
| [.tables.roles[] | select(.role | test($ex) | not)] as $roles
| [.tables.agents[] | select(.role | test($ex) | not)] as $agents
| [.calls[] | select(.role | test($ex) | not)] as $calls
| ([.tables.misses[]? | select(.role | test($ex) | not)]) as $misses
| ([.tables.turns[]? | select(.role | test($ex) | not)]) as $turns
# Orientation: turns an agent takes before its first page read.
| ([$calls | group_by(.agent)[] | . as $c
    | ([$c[] | select((.kind | IN("full-read", "ranged-read", "filtered-read")) and any(.targets[]; . as $t | $pages | index([$t]))) | .seq] | min) as $first
    | {role: $c[0].role, orient: ($first // null)}] | map(select(.orient != null))) as $orient
| (.grades | map({key: .cluster, value: .}) | from_entries) as $G
| (.findings.records | map({key: .id, value: .}) | from_entries) as $R
| (.triage.clusters) as $C
| {
  pages: $n,
  cost: {
    total: ($roles | sumf(.cost_usd) | r2),
    per_page: (if $n > 0 then (($roles | sumf(.cost_usd)) / $n | r2) else 0 end),
    cache_write: ($roles | sumf(.cost_cache_write) | r2),
    cache_read: ($roles | sumf(.cost_cache_read) | r2),
    output: ($roles | sumf(.cost_output) | r2),
    review: ([$roles[] | select(.role | stage == "review")] | sumf(.cost_usd) | r2),
    triage: ([$roles[] | select(.role | stage == "triage")] | sumf(.cost_usd) | r2),
    excluded: ([.tables.roles[] | select(.role | test($ex))] | sumf(.cost_usd) | r2)
  },
  effort: {
    agents: ($agents | length),
    review_agents: ([$agents[] | select(.role | stage == "review")] | length),
    triage_agents: ([$agents[] | select(.role | stage == "triage")] | length),
    turns: ($agents | sumf(.responses)),
    turns_per_agent: (if ($agents | length) > 0 then ($agents | sumf(.responses)) / ($agents | length) | r1 else 0 end),
    tool_calls: ($calls | length),
    orientation_turns_per_agent: (if ($orient | length) > 0 then ($orient | sumf(.orient)) / ($orient | length) | r1 else 0 end)
  },
  speed: {
    generation_min: ($turns | sumf(.generation_min) | r1),
    turns_over_5_min: ($turns | sumf(.turns_over_5_min)),
    review_span_min: ([$agents[] | select(.role | stage == "review")] | if length > 0 then
        (((map(.end) | max | sub("\\.[0-9]+Z$"; "Z") | fromdate) - (map(.start) | min | sub("\\.[0-9]+Z$"; "Z") | fromdate)) / 60 | r1) else 0 end),
    triage_span_min: ([$agents[] | select(.role | stage == "triage")] | if length > 0 then
        (((map(.end) | max | sub("\\.[0-9]+Z$"; "Z") | fromdate) - (map(.start) | min | sub("\\.[0-9]+Z$"; "Z") | fromdate)) / 60 | r1) else 0 end)
  },
  waste: {
    cache_rewrite_tokens: ($misses | sumf(.tokens_rewritten)),
    cache_rewrite_cost: ($misses | sumf(.cost_usd) | r2),
    page_full_reads_per_page: (if $n > 0 then ([$calls[] | select(.kind == "full-read") | .targets[] | select(. as $t | $pages | index([$t]))] | length) / $n | r1 else 0 end),
    gate_runs: ([$calls[] | select(.detail | test("check-prose"))] | length)
  },
  output: {
    records: (.findings.records | length),
    clusters: ($C | length),
    duplicate_clusters: ([$C[] | select([.members[] | $R[.].source] | unique | length > 1)] | length)
  },
  closing: {
    graded: ([$C[] | select($G[.id])] | length),
    remove: ([$C[] | select($G[.id].move == "R")] | length),
    correct: ([$C[] | select($G[.id].move == "C")] | length),
    reword: ([$C[] | select($G[.id].move == "W")] | length),
    ignore: ([$C[] | select($G[.id].move == "I")] | length),
    other_moves: ([$C[] | select($G[.id].move | IN("K", "O", "T"))] | length),
    ignore_rate: (if ($C | length) > 0 then ([$C[] | select($G[.id].move == "I")] | length) / ($C | length) | r2 else 0 end),
    h29_ignores: ([$C[] | select($G[.id].move == "I" and $G[.id].heuristic == "H-29")] | length),
    verdict_material: ([.findings.records[] | select(.claimShift == "material")] | length),
    verdict_unresolved: ([.findings.records[] | select(.claimShift == "unresolved")] | length),
    applied: (.applied.summary.applied // 0),
    skipped: (.applied.summary.skipped // 0),
    gate_fail_after_apply: (.applied.summary.gateFail // 0)
  }
}
