# scenario.jq - reprice a measured run under "what if" changes.
# Input: {tables (summarise.sh tables.json), rates (rates.json), scenarios}.
# Each scenario is {name, note, ops: [...]}; ops apply in order to the
# run's role x model rows. Role selectors are regexes matched against role.
#
#   {op: "model", roles, to}               reprice the rows on another model
#   {op: "reads", roles, classes, keep}    keep this fraction of what the
#       roles read from these file classes: cache writes fall by the read
#       tokens dropped, cache reads by the turns that carried them
#   {op: "fixed", roles, saved}            each agent starts with `saved`
#       fewer tokens (number, or "first_context" for the role's measured
#       first-turn context): writes fall once, reads on every later turn
#   {op: "scale", roles, factor}           scale every token count (fewer
#       agents, fewer pages, fewer turns)
#   {op: "remove", roles}                  drop the rows
#   {op: "expiry", roles, keep}            keep this fraction of the cache
#       rewrites caused by cache expiry (turns slower than the cache
#       lifetime); the rest is read from cache instead of written again
#
# Token effects are first-order: a changed agent is assumed to run the same
# number of turns and write the same output. Output: {baseline, scenarios}.

def price($m): .rates.models[$m] // null;
def cost($r): $r as $x
  | ($x.rates.models[$x.row.model] // null) as $p
  | if $p == null then 0 else
      (($x.row.input * $p.input) + (($x.row.cache_write - $x.row.cache_write_1h) * $p.cache_write_5m)
       + ($x.row.cache_write_1h * $p.cache_write_1h) + ($x.row.cache_read * $p.cache_read)
       + ($x.row.output * $p.output)) / 1e6 end;
def r2: . * 100 | round / 100;
def pos: if . < 0 then 0 else . end;

.rates as $rates | .tables as $t
# Read and carry tokens per role and file class, from the file table.
| ($t.files | group_by([.role, .class]) | map({key: "\(.[0].role)|\(.[0].class)",
    value: {res: (map(.result_tokens_est) | add), carry: (map(.carry_tokens_est) | add)}}) | from_entries) as $rc
| ($t.agents | group_by(.role) | map({key: .[0].role, value: ((map(.first_context) | add) / length)}) | from_entries) as $first
| ($t.roles | group_by(.role) | map({key: .[0].role, value: (map(.responses) | add)}) | from_entries) as $role_resp
| ([$t.misses[]? | select(.cause == "cache-expiry")] | group_by(.role)
   | map({key: .[0].role, value: (map(.tokens_rewritten) | add)}) | from_entries) as $expiry
| [$t.roles[] | . + {share: (.responses / ($role_resp[.role] // 1))}] as $rows0
| def rowcost($rows): [$rows[] | cost({rates: $rates, row: .})] | add // 0;
  def apply($op):
    if $op.op == "model" then map(if (.role | test($op.roles)) then .model = $op.to else . end)
    elif $op.op == "remove" then map(select(.role | test($op.roles) | not))
    elif $op.op == "scale" then map(if (.role | test($op.roles)) then
        (.input, .cache_read, .cache_write, .cache_write_1h, .output, .responses) |= (. * $op.factor) else . end)
    elif $op.op == "reads" then map(if (.role | test($op.roles)) then
        . as $row
        | ([$op.classes[] | $rc["\($row.role)|\(.)"] // {res: 0, carry: 0}]
           | {res: (map(.res) | add), carry: (map(.carry) | add)}) as $d
        | ($d.res * (1 - $op.keep) * $row.share) as $dw
        | ($d.carry * (1 - $op.keep) * $row.share) as $dr
        | (if $row.cache_write > 0 then $row.cache_write_1h / $row.cache_write else 0 end) as $h
        | .cache_write = (.cache_write - $dw | pos)
        | .cache_write_1h = (.cache_write_1h - $dw * $h | pos)
        | .cache_read = (.cache_read - $dr | pos)
      else . end)
    elif $op.op == "fixed" then map(if (.role | test($op.roles)) then
        . as $row
        | (if $op.saved == "first_context" then ($first[$row.role] // 0) else $op.saved end) as $s
        | (if $row.cache_write > 0 then $row.cache_write_1h / $row.cache_write else 0 end) as $h
        | .cache_write = (.cache_write - $s * $row.agents * $row.share | pos)
        | .cache_write_1h = (.cache_write_1h - $s * $row.agents * $row.share * $h | pos)
        | .cache_read = (.cache_read - $s * ($row.responses - $row.agents * $row.share) | pos)
      else . end)
    elif $op.op == "expiry" then map(if (.role | test($op.roles)) then
        . as $row
        | (($expiry[$row.role] // 0) * (1 - $op.keep) * $row.share) as $d
        | (if $row.cache_write > 0 then $row.cache_write_1h / $row.cache_write else 0 end) as $h
        | .cache_write = (.cache_write - $d | pos)
        | .cache_write_1h = (.cache_write_1h - $d * $h | pos)
        | .cache_read = (.cache_read + $d)
      else . end)
    else error("unknown op: \($op.op)") end;
  (rowcost($rows0)) as $base
| {baseline: {cost_usd: ($base | r2),
    by_role: ($rows0 | group_by(.role) | map({role: .[0].role, cost_usd: (rowcost(.) | r2)}) | sort_by(-.cost_usd))},
   scenarios: [.scenarios[] | . as $s
     | (reduce $s.ops[] as $op ($rows0; apply($op))) as $rows
     | rowcost($rows) as $c
     | {name: $s.name, note: ($s.note // ""), cost_usd: ($c | r2), saving_usd: ($base - $c | r2),
        saving_pct: (if $base > 0 then (($base - $c) / $base * 100 | round) else 0 end),
        by_role: ($rows | group_by(.role) | map({role: .[0].role, models: (map(.model) | unique | join("|")), cost_usd: (rowcost(.) | r2)}) | sort_by(-.cost_usd))}]}
