# extract.jq - one transcript (raw JSONL lines, read with -R) to the
# responses and calls of one agent. Args: $agent, $label, $phase, $since, $until.
# Output: {responses: [...], calls: [...], prompts: [...]}.
#
# One API response spans several JSONL lines that repeat its usage block, so
# responses are grouped by message.id and each usage field takes its max.
# Lines with model "<synthetic>" are harness stubs (credit or error notices):
# kept as responses with zero usage and synthetic: true.

include "classify";

def in_window: (. >= $since) and ($until == "" or . <= $until);

def text_len:
  if type == "string" then length
  elif type == "array" then (map(if type == "object" then (.text // "" | length) else 0 end) | add // 0)
  else 0 end;

[inputs | fromjson? | select(type == "object") | select((.timestamp // "") | in_window)] as $lines
| ($label | role_of) as $r
# A response's request started at the last non-assistant line before its
# first line (the tool result or prompt it answers); line timestamps mark
# when a response finished. The cache lifetime runs from request start.
| ([range(0; $lines | length) as $i | $lines[$i] | select(.type == "assistant") | {id: .message.id?, i: $i}]
   | group_by(.id) | map({key: (.[0].id // ""), value: (map(.i) | min)}) | from_entries) as $first_line
| def started($id): ($first_line[$id] // 0) as $f
    | ([$lines[0:$f][] | select(.type != "assistant") | .timestamp] | last) // null;
($lines | map(select(.type == "assistant" and (.message | type) == "object"))) as $a
| ($lines | map(select(.type == "user" and (.message | type) == "object"))) as $u
| ([$u[] | .timestamp as $ts | .message.content | select(type == "array") | .[]
    | select(type == "object" and .type == "tool_result")
    | {key: .tool_use_id, value: {len: (.content | text_len), err: (.is_error // false), ts: $ts}}] | from_entries) as $results
| ($a | group_by(.message.id)
    | map(. as $g
      | ($g | map(.message.usage // {})) as $us
      | def mx(f): ($us | map(f // 0) | max // 0);
      {agent: $agent, label: $label, role: $r.role, unit: $r.unit, phase: $phase,
       id: $g[0].message.id, ts: ($g | map(.timestamp) | min), started: started($g[0].message.id),
       model: $g[0].message.model,
       synthetic: ($g[0].message.model == "<synthetic>"),
       input: mx(.input_tokens), cache_read: mx(.cache_read_input_tokens),
       cache_write: mx(.cache_creation_input_tokens),
       cache_write_1h: mx(.cache_creation.ephemeral_1h_input_tokens),
       output: mx(.output_tokens),
       tools: [$g[] | .message.content[]? | select(type == "object" and .type == "tool_use") | {id, name, input}] | unique_by(.id)})
    | sort_by(.ts) | to_entries | map(.value + {seq: .key})) as $resp
| ($resp | length) as $n
| {responses: [$resp[] | del(.tools)],
   calls: [$resp[] | . as $p | .tools[]
     | (classify_call) as $c
     | ($results[.id] // {len: 0, err: false}) as $res
     | {agent: $agent, role: $r.role, unit: $r.unit, phase: $phase, model: $p.model, ts: $p.ts, seq: $p.seq,
        id: .id, tool: .name, kind: $c.kind, targets: $c.targets, sweep: $c.sweep,
        detail: (if .name == "Bash" then (.input.command // "" | .[0:300])
                 elif .name == "Agent" then ((.input.name // .input.description // "") | tostring)
                 elif .name == "Skill" then (.input.skill // "")
                 else (.input.file_path // .input.pattern // "" | tostring) end),
        result_chars: $res.len, error: $res.err,
        carry_turns: ($n - $p.seq - 1)}],
   prompts: (if $agent != "main" then [] else
     [$u[] | select((.isSidechain // false) | not)
     | select(.message.content | type == "string" or (type == "array" and all(.[]; type != "object" or .type != "tool_result")))
     | (.message.content | if type == "string" then . else (map(.text? // "") | join(" ")) end) as $t
     | select(((.isMeta // false) | not) or ($t | test("usage limit|session limit")))
     | {ts: .timestamp,
        kind: (if ($t | test("usage limit has reset|limit has reset")) then "limit-reset"
               elif ($t | test("<teammate-message")) then "teammate"
               elif ($t | test("<task-notification")) then "notification"
               elif ($t | test("^\\s*<(command-|local-command|bash-)")) then "command"
               elif ($t | test("^\\s*<system-reminder>")) or ($t | test("^\\s*$")) then "system"
               else "human" end)}] end)}
