# phases.jq - merge per-agent extracts and label the main transcript's
# responses and calls with the process phase they belong to. A phase starts
# at a marker call and runs until the next marker; rows before the first
# marker are "setup". Subagent and workflow rows keep the phase they carry.

def marker:
  if .tool == "Workflow" then "review"
  elif .tool == "Skill" then "skill:" + .detail
  elif .tool == "Agent" then
    (.detail | ascii_downcase) as $d
    | if ($d | test("verif")) then "verify"
      elif ($d | test("cold")) then "cold-read"
      elif ($d | test("grade|calibrat")) then "grade"
      else null end
  elif .tool == "Bash" then
    (.detail) as $c
    | if ($c | test("build-triage\\.sh\\s+--from")) then "build"
      elif ($c | test("grade-triage\\.sh\\s+score")) then "score"
      elif ($c | test("grade-triage\\.sh\\s+plan")) then "plan"
      elif ($c | test("grade-triage\\.sh\\s+apply")) then "apply"
      elif ($c | test("grade-triage\\.sh\\s+(sample|label|agree)")) then "calibrate"
      else null end
  else null end;

# A fork's transcript replays its parent's messages under the same ids:
# keep each response and each tool call once, in the agent that made it.
(map(.responses) | add // []) as $r0
| (map(.calls) | add // []) as $c0
| ([$r0[] | select(.phase != "fork") | .id] | map({key: ., value: true}) | from_entries) as $own_r
| ([$c0[] | select(.phase != "fork") | .id // empty] | map({key: ., value: true}) | from_entries) as $own_c
| [$r0[] | select(.phase != "fork" or ($own_r[.id] | not))] as $r
| [$c0[] | select(.phase != "fork" or ((.id // "") as $i | $own_c[$i] | not))] as $c
| ([$c[] | select(.agent == "main") | {ts, seq, phase: marker} | select(.phase != null)] | sort_by(.seq)) as $marks
| def phase_at($seq): ([$marks[] | select(.seq <= $seq) | .phase] | last) // "setup";
{responses: [$r[] | if .agent == "main" then .phase = phase_at(.seq) else . end],
 calls: [$c[] | if .agent == "main" then .phase = phase_at(.seq) else . end],
 prompts: (map(.prompts) | add // [] | sort_by(.ts))}
