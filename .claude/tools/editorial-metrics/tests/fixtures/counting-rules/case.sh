# One API response split over three lines (m1) counts once, with its usage
# taken once; a synthetic response carries no usage; a sweep naming three
# files is split three ways; Read with offset is ranged, `cat | head` is
# filtered; script calls and the classes of page, context page, reference,
# run state and scratch; prompt kinds (human, teammate, limit reset); main
# phases from marker calls (verify spawn, plan); request start times, the
# model-switch cache miss and turn durations; a fork that replays its
# parent's message (v1) counts only its own response (f1).
bash "$TOOL_DIR/extract-run.sh" --projects-root "$WORK/projects" --session S1 --workflow wf_x --out "$WORK/out"
bash "$TOOL_DIR/summarise.sh" "$WORK/out" --manifest "$WORK/manifest.json" --doc-pattern '^0[0-9][a-d]?-.*\.md$'
jq -r '.roles[] | "role \(.role) \(.model) responses=\(.responses) cache_write=\(.cache_write) cache_read=\(.cache_read) output=\(.output) cost=\(.cost_usd)"' "$WORK/out/tables.json"
jq -r '.pages[] | "page \(.file) \(.class) \(.role) full=\(.full_reads) ranged=\(.ranged_reads) searches=\(.searches) sweep_share=\(.sweep_share) edits=\(.edits)"' "$WORK/out/tables.json"
jq -r '.timeline[] | "phase \(.phase) \(.scope) responses=\(.responses) synthetic=\(.synthetic) human=\(.human_prompts) wakeups=\(.wakeups) resets=\(.limit_resets)"' "$WORK/out/tables.json"
jq -r '"calls " + ([.tool, .kind, (.targets | join("+"))] | join(" "))' "$WORK/out/calls.jsonl"
jq -r '.misses[] | "miss \(.role) \(.cause) n=\(.misses) tokens=\(.tokens_rewritten)"' "$WORK/out/tables.json"
jq -r '.turns[] | "turn \(.role) n=\(.responses) median=\(.median_turn_s)s max=\(.max_turn_s)s"' "$WORK/out/tables.json"
jq -r '"fork responses: " + ([.[] | select(.phase == "fork") | .id] | join(",")) + "; v1 rows: " + ([.[] | select(.id == "v1")] | length | tostring)' <(jq -s . "$WORK/out/responses.jsonl")
