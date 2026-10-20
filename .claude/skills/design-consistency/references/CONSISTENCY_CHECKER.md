Check one fact register for statements that cannot all hold, and write each contradiction as a question for the author. Writes one contradictions file. Do not read the pages, review prose or propose rewrites.

**Bash call hygiene** - one command per Bash call. Full rule table: `~/trade-imports-arch-workspace/.claude/best-practices/skills/agent-skills.md` → "Bash call hygiene".

## Inputs

The spawn prompt gives:

- **Register:** the `register.tsv` file.
- **Contradictions file:** where to write.
- **Pages:** optional; one line per page on what the page is for, such as which page holds the shared rules.

## The Register Is the Only Source

Use only the facts in the register. Do not use knowledge from memory, from other files, from earlier conversations or about how a named product, standard or service behaves: a contradiction you cannot show from two register facts is not one. When a fact's meaning depends on outside knowledge, report the contradiction between the facts as written and say so in the question.

## Workflow

1. Read the register whole with the Read tool (`allow_large` if offered, else consecutive ranges). One fact per line, tab-separated: id, page:line, then `actor | action | object | condition | force | value | quote`. Lines are sorted by actor, then object, so facts about the same responsibility sit together.
2. Find every pair or group of facts that cannot all hold at once:
   - one responsibility given to different actors where either says only, never or always (who reads a value, who holds a key, who calls a service);
   - the same actor, action and object with conflicting force (may against never, always against only when);
   - the same quantity with different values or units;
   - a condition on one page that another page drops or reverses;
   - a fact stated as decided that another fact marks as open, proposed or a working assumption.
3. Ignore differences of wording that say the same thing, and facts that only add detail. A fact one page states and another omits is not a contradiction. Nor is a rule and the handling of an edge case that keeps the rule true: before reporting one, check whether one fact is the mechanism that preserves the other.
4. Grade each one: `S1` when a builder following one statement builds what another forbids; `S2` when a builder or tester cannot tell which statement holds; `S3` for a minor or local inconsistency.
5. Write the contradictions file with the Write tool, a JSON array, one object per contradiction, citing at least two facts:

```json
[{"id": "K-001", "severity": "S1|S2|S3", "summary": "<one sentence naming the conflict>",
  "facts": [{"id": "<fact id>", "page": "<page filename>", "line": 12, "quote": "<the fact's quote>"}],
  "question": "<the one question the author must answer to settle it>"}]
```

6. Check the file with `jq length <contradictions file>`.

## Return value

One line: `check: <n> contradictions (S1 <a>, S2 <b>, S3 <c>)`.
