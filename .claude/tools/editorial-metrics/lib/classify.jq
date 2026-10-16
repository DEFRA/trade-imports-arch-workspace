# classify.jq - shared helpers for editorial-metrics: role from an agent
# label, file keys from paths and Bash commands, and the access kind of
# one tool call. Included by extract.jq and summarise.jq.

# Basenames that recur across directories are keyed with their parent.
def ambiguous: ["SKILL.md", "README.md", "AGENTS.md", "CLAUDE.md", "index.md", "run.json", "case.sh"];

def file_key:
  (split("/") | map(select(length > 0))) as $s
  | ($s[-1] // "") as $b
  | if (ambiguous | index($b)) != null and ($s | length) > 1 then "\($s[-2])/\($b)" else $b end;

# Role and unit from an agent label: "drill:States and clocks", "grade2-02a",
# "verify-s03", "editor-pass", "cold-reader-after-apply".
def role_of:
  if test(":") then {role: (split(":")[0]), unit: (split(":")[1:] | join(":"))}
  elif test("^.+-(s[0-9]{2}|set|0[0-9][a-d]?)(-[A-Za-z0-9-]+)?$") then
    capture("^(?<role>.+?)-(?<unit>(s[0-9]{2}|set|0[0-9][a-d]?)(-[A-Za-z0-9-]+)?)$")
  else {role: ., unit: ""} end;

def path_re: "(?:[A-Za-z0-9_.-]+/)?[A-Za-z0-9_.-]+\\.(?:md|json|jsonl|txt|sh|jq|js|csv|yaml|yml)\\b";

# Files a Bash command names, keyed; de-duplicated in order of appearance.
def bash_targets:
  [scan(path_re) | file_key] | reduce .[] as $k ([]; if index([$k]) then . else . + [$k] end);

# The first command word of a Bash command, past cd prefixes, env
# assignments and the command/time wrappers.
def first_verb:
  sub("^\\s+"; "")
  | gsub("^(cd [^;|&]*(;|&&)\\s*)+"; "")
  | gsub("^([A-Za-z_][A-Za-z0-9_]*=[^ ]* )+"; "")
  | gsub("^(command|time|builtin) +"; "")
  | (split(" ")[0] // "") | split("/")[-1];

def script_names: ["build-triage.sh", "grade-triage.sh", "check-prose.sh", "claim-diff.sh", "lint-skills.sh", "extract-run.sh", "summarise.sh"];

def bash_kind:
  . as $c
  | ($c | first_verb) as $v
  | ($c | test("\\|\\s*(head|tail|sed|grep|awk|cut|wc|jq)\\b")) as $piped
  | if any(script_names[]; . as $s | $c | contains($s)) then "script"
    elif ($v | IN("cat", "nl", "bat")) then (if $piped then "filtered-read" else "full-read" end)
    elif $v == "sed" then
      (if ($c | test("^\\S*sed\\s+(-[A-Za-z]*\\s+)*-i")) then "edit"
       elif ($c | test("\\bsed\\s+(-[A-Za-z]+\\s+)*-n\\b")) then "ranged-read" else "filtered-read" end)
    elif ($v | IN("head", "tail")) then "ranged-read"
    elif ($v | IN("grep", "rg", "egrep", "fgrep")) then "search"
    elif ($v | IN("awk", "cut")) then "filtered-read"
    elif $v == "jq" then "query"
    elif ($v | IN("bash", "sh", "python3", "python", "node")) or ($v | test("\\.sh$")) then "script"
    elif ($v | IN("wc", "ls", "stat", "find", "test", "[", "file", "du", "shasum", "openssl", "realpath", "mkdir", "rm", "mv", "cp", "touch", "date")) then "meta"
    elif $v == "git" then (if ($c | test("\\bgit\\b[^|]*\\b(diff|show|log -p)\\b")) then "diff" else "meta" end)
    else "other" end;

# One tool_use -> {kind, targets, sweep}.
def classify_call:
  .name as $n | (.input // {}) as $i
  | if $n == "Read" then
      {kind: (if ($i.offset // $i.limit) != null then "ranged-read" else "full-read" end), targets: [($i.file_path // "") | file_key]}
    elif $n == "Edit" or $n == "MultiEdit" then {kind: "edit", targets: [($i.file_path // "") | file_key]}
    elif $n == "Write" then {kind: "write", targets: [($i.file_path // "") | file_key]}
    elif $n == "Grep" then {kind: "search", targets: [($i.path // "") | select(test("\\.[a-z]+$")) | file_key]}
    elif $n == "Bash" then (($i.command // "") as $c | {kind: ($c | bash_kind), targets: ($c | bash_targets)})
    else {kind: "tool", targets: []} end
  | .sweep = (.kind == "search" and ((.targets | length) != 1));

# File class for a key. $pages is the list of page basenames under review;
# $docre matches documentation pages outside that set (read as context).
def file_class($pages; $docre):
  . as $k
  | if ($pages | index([$k])) != null then "page"
    elif ($docre != "" and test($docre)) then "context-page"
    elif test("^(drill|structural|editor-pass|verifier|grader)-") or test("\\.txt$") then "scratch"
    elif test("^claims-") or IN("findings.json", "triage.json", "manifest.json", "index.json", "review.json", "retains.json", "plan.json", "plan.md", "score.json", "spot-check.json", "applied.json", "labels.json") or test("^(round|agree-round|revised)-") then "run-state"
    elif test("\\.(sh|jq|js)$") then "tool"
    elif test("\\.md$") then "reference"
    else "other" end;
