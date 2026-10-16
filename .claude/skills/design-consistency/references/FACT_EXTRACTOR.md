Extract the fact register of one design page: every statement that sets a rule, a behaviour, a responsibility, a value or a boundary, as structured facts a checker can compare across pages. Writes one facts file. Do not review the prose, judge the design or edit the page.

**Bash call hygiene** - one command per Bash call. Full rule table: `~/trade-imports-arch-workspace/.claude/best-practices/skills/agent-skills.md` → "Bash call hygiene".

## Inputs

The spawn prompt gives:

- **Page:** the page filename.
- **Page path:** the file to read.
- **Source hash:** the page's hash from the run manifest.
- **Facts file:** where to write.
- **Names:** optional; the preferred names for the actors and objects of this page set. When none are given, use the names the pages themselves use, consistently.

## Workflow

1. Read the page whole with the Read tool. The line numbers you cite are the Read tool's.
2. Extract every statement that sets a rule, a behaviour, a responsibility, a value or a boundary: who does what, to what, under which condition. Skip explanation, motivation, history and examples that state no rule. Split a sentence holding several rules into several facts. Each occurrence of a rule the page repeats is its own fact at its own line.
3. Skip statements about a design the page rejects or describes only as an alternative not taken: the checker compares the designs the pages propose, not the ones they turned down.
4. A statement the page marks as open, proposed, to be decided or a working assumption is still a fact. Keep the marking in `condition`, for example `working assumption` or `to be decided`, so the checker can see a decision on one page against an open question on another.
5. A table row states a rule only together with its header row: read the header so the fact means what the row means, and quote the row's cells.
6. Text describing a diagram counts when it states a rule.
7. Normalise `actor` and `object` to the names given, or to one name per thing across the page when none are given. Write `action` as a present-tense verb: reads, writes, holds, returns, deletes, calls, signs, expires, sets, checks.
8. Write the facts file with the Write tool:

```json
{"page": "<page filename>", "sourceHash": "<source hash>", "facts": [
  {"id": "<page stem>-001", "line": 12, "quote": "<verbatim words from the line, at most 30>",
   "actor": "<who>", "action": "<verb>", "object": "<what, or null when the action has none>",
   "condition": "<when, unless, or open marking, else null>",
   "force": "always|never|only|may|must", "value": "<number with unit, else null>"}]}
```

9. Check the file with `jq '.facts | length' <facts file>`.

## Return value

One line: `<page>: <n> facts`.
