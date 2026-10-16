# summarise.jq - tables from an extract. Input: {responses, calls, prompts}
# as arrays. Args: $prices (rates.json), $pages (page basenames under
# review), $docre (regex for other documentation pages).
# Output: {agents, roles, files, misses, turns, composition, pages, timeline}
# as arrays of row objects.

include "classify";

def price($m): $prices.models[$m] // null;
def cost:
  price(.model) as $p
  | if $p == null then 0 else
      ((.input * $p.input) + ((.cache_write - .cache_write_1h) * $p.cache_write_5m)
       + (.cache_write_1h * $p.cache_write_1h) + (.cache_read * $p.cache_read) + (.output * $p.output)) / 1e6
    end;
def r2: . * 100 | round / 100;
def r1: . * 10 | round / 10;
def mins($a; $b): (($b | sub("\\.[0-9]+Z$"; "Z") | fromdate) - ($a | sub("\\.[0-9]+Z$"; "Z") | fromdate)) / 60;
def sumf(f): map(f) | add // 0;

# Characters of tool result per token of context growth (rates.json).
($prices.context_chars_per_token // 4) as $cpt
| .responses as $resp | .calls as $calls | .prompts as $prompts
| ($resp | map(. + {cost: cost})) as $rc
| {
  agents: ($rc | group_by(.agent) | map(. as $g | ($calls | map(select(.agent == $g[0].agent))) as $cg
    | {agent: $g[0].agent, label: $g[0].label, role: $g[0].role, unit: $g[0].unit,
       phase: ($g | map(.phase) | unique | join("|")),
       models: ($g | map(.model) | unique | join("|")),
       responses: ($g | map(select(.synthetic | not)) | length), synthetic: ($g | map(select(.synthetic)) | length),
       input: sumf(.input), cache_read: sumf(.cache_read), cache_write: sumf(.cache_write),
       cache_write_1h: sumf(.cache_write_1h), output: sumf(.output), cost_usd: (sumf(.cost) | r2),
       tool_calls: ($cg | length),
       first_context: ($g | map(select(.synthetic | not)) | sort_by(.seq) | (.[0] // {cache_read: 0, cache_write: 0, input: 0}) | .cache_read + .cache_write + .input),
       peak_context: ($g | map(.cache_read + .cache_write + .input) | max),
       write_to_peak: (($g | map(.cache_read + .cache_write + .input) | max) as $pk
                       | if $pk > 0 then (sumf(.cache_write) / $pk | r2) else 0 end),
       start: ($g | map(.ts) | min), end: ($g | map(.ts) | max),
       active_min: (mins($g | map(.ts) | min; $g | map(.ts) | max) | r1)})
    | sort_by(.start)),
  roles: ($rc | map(select(.synthetic | not)) | group_by([.role, .model]) | map(. as $g
    | {role: $g[0].role, model: $g[0].model, agents: ($g | map(.agent) | unique | length),
       responses: length, input: sumf(.input), cache_read: sumf(.cache_read), cache_write: sumf(.cache_write), cache_write_1h: sumf(.cache_write_1h),
       output: sumf(.output), cost_usd: (sumf(.cost) | r2),
       cost_cache_write: (price($g[0].model) as $p | if $p then (sumf(.cache_write - .cache_write_1h) * $p.cache_write_5m + sumf(.cache_write_1h) * $p.cache_write_1h) / 1e6 | r2 else 0 end),
       cost_cache_read: (price($g[0].model) as $p | if $p then sumf(.cache_read) * $p.cache_read / 1e6 | r2 else 0 end),
       cost_output: (price($g[0].model) as $p | if $p then sumf(.output) * $p.output / 1e6 | r2 else 0 end),
       avg_context_k: ((sumf(.cache_read + .cache_write + .input) / length / 1000) | round)})
    | sort_by(-.cost_usd)),
  files: ([$calls[] | (.targets | length) as $n | . as $c | .targets[]
      | {file: ., role: $c.role, kind: $c.kind, sweep: $c.sweep, n: $n,
         chars: ($c.result_chars / $n), carry: ($c.result_chars / $n / $cpt * $c.carry_turns)}]
    | group_by([.file, .role, .kind]) | map(. as $g
      | {file: $g[0].file, class: ($g[0].file | file_class($pages; $docre)), role: $g[0].role, kind: $g[0].kind,
         calls: length, weighted: (sumf(1 / .n) | r2), sweep_calls: ($g | map(select(.sweep)) | length),
         result_tokens_est: (sumf(.chars) / $cpt | round), carry_tokens_est: (sumf(.carry) | round)})
    | sort_by(.file, .role, .kind)),
  # Each prompt (human or wake-up) belongs to the phase of the main response
  # that follows it; its wait is the gap since the main response before it.
  timeline: (
    ($rc | map(select(.agent == "main")) | sort_by(.ts)) as $m
    | ([$prompts[] | . as $p
        | ([$m[] | select(.ts > $p.ts)] | first) as $next
        | ([$m[] | select(.ts < $p.ts) | .ts] | last) as $prev
        | $p + {phase: ($next.phase // "end"), gap: (if $prev then mins($prev; $p.ts) else 0 end)}]) as $pp
    | ($m | group_by(.phase) | map(. as $g
      | ($g | map(.ts) | min) as $s | ($g | map(.ts) | max) as $e
      | ([$pp[] | select(.phase == $g[0].phase)]) as $ps
      | {phase: $g[0].phase, scope: "main", start: $s, end: $e, span_min: (mins($s; $e) | r1),
         responses: ($g | map(select(.synthetic | not)) | length), synthetic: ($g | map(select(.synthetic)) | length),
         human_prompts: ($ps | map(select(.kind == "human")) | length),
         wakeups: ($ps | map(select(.kind == "teammate" or .kind == "notification")) | length),
         limit_resets: ($ps | map(select(.kind == "limit-reset")) | length),
         human_wait_min: ($ps | map(select(.kind == "human") | .gap) | add // 0 | r1),
         idle_gaps_over_5_min: ([$g | sort_by(.ts) | .[1:] as $t | range(0; $t | length) as $i | mins($g[$i].ts; $t[$i].ts)
                                 | select(. > 5)] | add // 0 | r1),
         avg_context_k: ((sumf(.cache_read + .cache_write + .input) / ($g | length) / 1000) | round),
         cost_usd: (sumf(.cost) | r2)}))
    + ($rc | map(select(.agent != "main")) | group_by(.role) | map(. as $g
      | ($g | map(.ts) | min) as $s | ($g | map(.ts) | max) as $e
      | {phase: $g[0].phase, scope: ("agents:" + $g[0].role), start: $s, end: $e, span_min: (mins($s; $e) | r1),
         responses: ($g | map(select(.synthetic | not)) | length), synthetic: ($g | map(select(.synthetic)) | length),
         human_prompts: 0, wakeups: 0, limit_resets: 0, human_wait_min: 0, idle_gaps_over_5_min: 0,
         avg_context_k: ((sumf(.cache_read + .cache_write + .input) / ($g | length) / 1000) | round),
         cost_usd: (sumf(.cost) | r2)}))
    | sort_by(.start))
}
# Cache misses: a turn that reads less than 90% of the previous turn's
# context back from cache rewrites the rest. Cause: a model switch, the gap
# between request starts exceeding the cache lifetime (1 hour where the
# agent writes 1-hour entries, else 5 minutes), or other. Turn time is
# request start to response.
| .misses = ([$rc[] | select(.synthetic | not)] | group_by(.agent) | map(sort_by(.seq) | . as $g
      | ($g | map(.cache_write_1h) | add // 0) as $h
      | [range(1; $g | length) as $i | ($g[$i - 1].cache_read + $g[$i - 1].cache_write + $g[$i - 1].input) as $prev
         | select($prev > 20000 and $g[$i].cache_read < 0.9 * $prev)
         | (if $g[$i].started and $g[$i - 1].started then mins($g[$i - 1].started; $g[$i].started) * 60 else null end) as $gap
         | {role: $g[0].role, model: $g[$i].model, tokens: ($prev - $g[$i].cache_read), gap_s: $gap,
            cause: (if $g[$i].model != $g[$i - 1].model then "model-switch"
                    elif $gap != null and $gap > (if $h > 0 then 3600 else 300 end) then "cache-expiry"
                    else "other" end),
            rate: (price($g[$i].model) as $p | if $p then (if $h > 0 then $p.cache_write_1h else $p.cache_write_5m end) else 0 end)}])
    | flatten | group_by([.role, .cause]) | map({role: .[0].role, cause: .[0].cause, misses: length,
        tokens_rewritten: sumf(.tokens), cost_usd: (sumf(.tokens * .rate / 1e6) | r2),
        median_gap_s: (map(.gap_s // 0) | sort | .[length / 2 | floor] | round)})
    | sort_by(-.cost_usd))
| .turns = ([$rc[] | select((.synthetic | not) and .started != null) | . + {secs: (mins(.started; .ts) * 60)}]
    | group_by(.role) | map((map(.secs) | sort) as $s
      | {role: .[0].role, models: (map(.model) | unique | join("|")), responses: length,
         median_turn_s: ($s[length / 2 | floor] | round), p90_turn_s: ($s[(length * 0.9) | floor] | round),
         max_turn_s: ($s[-1] | round), turns_over_5_min: ($s | map(select(. > 300)) | length),
         generation_min: (($s | add) / 60 | r1)})
    | sort_by(-.generation_min))
# What fills each role's context: tool-result tokens (characters / $cpt) by the
# class of file the call named, or by tool kind when it named none.
| .composition = ([$calls[] | . as $c | (.targets | length) as $n
    | if $n == 0 then {role: .role, source: ("no-file:" + .kind), tok: (.result_chars / $cpt)}
      else .targets[] | {role: $c.role, source: (file_class($pages; $docre)), tok: ($c.result_chars / $cpt / $n)} end]
  | group_by(.role) | map(. as $g | (sumf(.tok)) as $tot
    | $g | group_by(.source) | map({role: $g[0].role, source: .[0].source, calls: length,
        result_tokens_est: (sumf(.tok) | round), share: (if $tot > 0 then (sumf(.tok) / $tot * 100 | round / 100) else 0 end)}))
  | flatten | sort_by(.role, -.result_tokens_est))
| .pages = ([.files[] | select(.class == "page" or .class == "context-page")] | group_by([.file, .role]) | map(. as $g
    | {file: $g[0].file, class: $g[0].class, role: $g[0].role,
       full_reads: ($g | map(select(.kind == "full-read") | .calls) | add // 0),
       ranged_reads: ($g | map(select(.kind == "ranged-read" or .kind == "filtered-read") | .calls) | add // 0),
       searches: ($g | map(select(.kind == "search") | .calls) | add // 0),
       sweep_share: ($g | map(select(.kind == "search") | .weighted) | add // 0),
       edits: ($g | map(select(.kind == "edit" or .kind == "write") | .calls) | add // 0),
       scripts: ($g | map(select(.kind == "script") | .calls) | add // 0),
       other: ($g | map(select(.kind | IN("full-read", "ranged-read", "filtered-read", "search", "edit", "write", "script") | not) | .calls) | add // 0),
       result_tokens_est: ($g | map(.result_tokens_est) | add), carry_tokens_est: ($g | map(.carry_tokens_est) | add)}
    | .visits = (.full_reads + .ranged_reads + .searches + .edits))
    | sort_by(.file, .role))
