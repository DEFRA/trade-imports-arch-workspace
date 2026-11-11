# hedy prose check: Plan

Written 11 November 2026. This plan delivers `hedy prose check` as a minimum that proves itself in rounds, and stops at the first round whose findings Ben does not act on. Decision 26 in `decisions.md` settled that `language.md` is the one source of the banned words and the sentence shapes, and that a hedy check parses that file directly. This plan says what the check does, what it does not do, and how each round is judged.

## Purpose

Some rules of the house writing standard are mechanical: a listed word is present or absent, a line ends on `it` or does not, a curly quote is a curly quote. Where a rule is mechanical, a program finds every breach on every line without fatigue, and the agent's reading goes on the rules only a reader can judge. The check reports each finding with the repair the row gives, so the finding drives one action: reword, or decide that the sense is literal. The authoring skill runs the check in its closing pass and on every short artefact, and treats a failed check as a failed pass.

The check is not a review, not a score, and not evidence that a page is good. A clean run proves only that the listed words and the literal shapes are absent.

## What the File Can and Cannot Give the Code

`language.md` holds two kinds of content.

The two word tables are structured. Each form sits in backticks, a trailing `*` stands for any ending, and the repair is the next cell. The old gate parsed exactly that for three months with 41 golden cases. The prose beside a form, such as "as a verb" or "after a noun", is for the reader. The parser ignores that prose and matches the bare form, so `architect` fires on the noun too and the reader decides. That is the behaviour the old gate had.

The shapes table is not structured. Each row describes a pattern in English, and no code derives a check from a description. Code implements each shape by hand, and the table supplies only the repair text the finding prints. Five shapes are one character class each: an em dash, a spaced en dash, a curly quote, `N/A`, and a line ending on `it`. The other eight were regexes in the old gate with known false positives, and three rows in the word tables, the "as a verb" kind, are honoured only by a part-of-speech tagger. None of those is in round 1.

The collaboration is therefore fixed. Code finds every listed form and every literal shape. The agent decides, for each examine finding, whether the sense is literal, and reads for the shapes code does not check. When Ben adds a row, the parser proves the row is well formed and the agent reads the repair text the code printed.

## The Rounds and the Stop Rule

| Round | Delivers | Judged by |
| --- | --- | --- |
| 1 | `hedy prose check` over files and stdin: the two word tables, the old gate's masking and matching, the five literal shapes, findings with line, matched text and repair. Tests: the parser's contract on the real file, and the old fixture pages as tables of expected findings | the definition of done below |
| 2 | The check run over every markdown file in this repo and the docs repo and the last fifty commit messages, with the count per row and per shape, in a report under this workarea | Ben reads the counts. A row that fires on text Ben wrote and kept is a bad row or a bad repair, and the fix goes in `language.md`, not in code |
| 3, only if round 2 changed what Ben does | The old gate's eight regex shapes, one commit each with its old fixture, each dropped if the round 2 corpus shows the shape firing wrongly | the same counts, per shape |

Stop at the first round whose findings Ben does not act on. No syntax tree, no part-of-speech tagging, no retext or Vale, no labelled corpus, unless round 3 leaves a shape worth that cost, and that is a separate decision.

## Decisions for Ben Before Round 1

Each is put as a prompt at the start of the session that runs round 1, with the recommendation first. Round 1 does not start until both are answered.

1. **The outcome shape.** A run that finds banned words has a result, the findings, and a failed outcome. Options: (a) banned and shape findings make `ok: false` and exit 1 with one `PROSE` error naming the count, and `result` carries every finding, examine rows included, which fills a field that was `null` on failure until now; (b) the command always exits 0 with `{ passed, findings }` and a caller reads `passed`; (c) each banned finding is a `PROSE` error and examine findings go to stderr as notes, which loses the examine findings to a JSON caller on a failing page. Recommended: (a), because one JSON line then gives the agent everything and a person at a terminal sees a failure.
2. **How the file marks the two rows that need more than a form.** The `you` row applies to documents for people only, and the `portal` row matches lower case only. Options: (a) the parser recognises two fixed phrases in the Term cell, "documents for people only" and "in lower case", documented in the file's preface, which matches the file as it stands; (b) a third column on both tables. Recommended: (a), because the file already reads that way and no row changes.

## Round 1 Steps

Every step reads `hedy/CLAUDE.md`, `.claude/rules/hedy-code.md` and `.claude/rules/hedy-tests.md` first. The sibling-test hook is live, so each `<name>.test.js` is written before `<name>.js`, and the spy hook refuses `toHaveBeenCalled`. The bash guard denies every `hedy` call while `hedy/src` is dirty, so a worker verifies with `npm test` and never with `hedy`, and the orchestrator commits each step and then runs the `hedy` commands in its definition of done. Steps 1.1 and 1.2 share no files and run in parallel, each scoping its test runs to its own files. The file to model a command on is `hedy/src/commands/hello.js`, the one command with no credentials, and `commands/jira/index.js` for a group.

The reference for every matching rule is the last version of the old gate, `git show 4d68719:.claude/tools/editorial/check-prose.sh`, not the copy at `63769b4^`, which predates the scope rule, the hyphen and semicolon shapes and the matched-text report.

### Design Points Fixed Here

- **The command.** `hedy prose check <file>...` and `hedy prose check --stdin --label <name>`. A group `prose` in `commands/prose/index.js` with the one subcommand `check` in `commands/prose/check.js`. No `--terms`, no profile discovery, no `--print-fail-lines`: the one profile left in the docs repo holds no word rows, and no hook diffs lines.
- **The rows.** `commands/prose/language-file.js` reads `<workspace>/.claude/skills/authoring/references/language.md` through `workspace-root.js` and returns `{ banned, examine, shapes }`. A word row is `{ forms, repair, scope: 'all' | 'documents', caseSensitive }`, read from the table under "## Banned Words and Phrases" or "## Words to Examine": every backticked form in the Term cell, the repair from the next cell, `scope` from the phrase "documents for people only" and `caseSensitive` from the phrase "in lower case" if decision 2 takes option (a). A form may hold only letters, digits, spaces, hyphens, apostrophes and a trailing `*`; any other character is `PARSE` naming the file and the form. A table that yields no rows is `PARSE` naming the heading. A shape row is `{ key, repair }` from the table under "## Sentence Shapes", where `key` is the row's position, because round 1 implements five shapes by matching the row's leading words, and a Key column is round 3's decision if round 3 happens.
- **Matching.** As the old gate: each form becomes one alternative, a trailing `*` matches any run of letters, digits and hyphens, a space matches any run of whitespace, the alternation sits inside word boundaries, and the match is case-insensitive unless the row is case-sensitive. Several forms in one row give one finding per matched line, naming every distinct matched text in lower case, in order, with runs of whitespace collapsed to one space.
- **Masking.** `commands/prose/masking.js` blanks, keeping the line count: fenced blocks opened by three backticks or three tildes, with the fence type ignored and the toggle per line as the old gate did; blockquote lines; double-backtick spans before single-backtick spans; URLs; and front matter, which the old gate blanked only for its punctuation shapes and the file's preface now exempts for every rule. A golden case that disagrees with the preface changes, and the change is recorded in the test.
- **The shapes in round 1.** Em dash; spaced en dash; the four curly quotes; `N/A` in any case; a sentence or line ending on lower-case `it`, with the old gate's pattern, which also finds a sentence that ends on `it` inside a line. Each is a code-held pattern keyed to its row in the table and prints that row's repair.
- **Scope.** A row scoped to documents is skipped when the file argument or the `--label` value holds a `.claude/` segment or is named `CLAUDE.md` or `AGENTS.md`, as the old gate did.
- **The result.** `{ passed, findings }`, where each finding is `{ label, line, kind: 'banned' | 'examine' | 'shape', term, text, repair }`, `term` is the matched text or the shape's name, `text` is the line as written, and `passed` is false when any banned or shape finding exists. Text mode prints one line per finding, `<label>:<line>: <kind> "<term>": <repair>`, then the line, then a last line `passed` or `<n> banned, <m> examine, <k> shape`. The outcome shape, exit code and envelope follow decision 1.
- **Errors.** A file argument that is not a regular file is `USAGE` naming the path, exit 2, where the old gate exited 1. A file whose real path matches the secret patterns the other readers refuse is `USAGE`. A missing or malformed `language.md` is `PARSE` naming the file.
- **No hook.** Round 1 wires nothing into the pre-commit. Round 2 decides whether the findings are worth gating on.

### Step 1.0, Fixtures

The orchestrator's step. Files: `hedy/src/commands/prose/__fixtures__/pages/`, the 27 fixture pages under `gate-data/prose-gate-cases/fixtures/` that take no `--terms` and use no profile, copied as they are; `__fixtures__/stdin/`, the three stdin texts; `__fixtures__/expected-findings.json`, one entry per case holding the findings the old gate reported, `{ line, kind, term }`, derived from the old expected files by a one-off script that reads each `FAIL` or `WARN` line and the message after that line, with FAIL word rows as `banned`, WARN word rows as `examine`, and the punctuation, `N/A`, trailing-`it` and other shape messages as `shape` with the shape's name; findings for shapes outside round 1 are kept in the file under `deferred` so round 3 has them; `__fixtures__/tables/`, three small language files for the parser tests: one well formed with both annotations, one with a bad form, one with an empty table. Done when the script's output is reviewed case by case against the old expected text, the review is recorded in `cases.md` as the mapping used, and no fixture holds a real name or site content.

### Step 1.1, The Language File

Files: `hedy/src/commands/prose/language-file.js` and its test. Done when `npm --prefix hedy run lint` exits 0, the test passes with `--coverage.include` of its source, and the tests prove: the well-formed table fixture gives the expected rows with forms, repairs, scope and case sensitivity; the bad-form fixture is `PARSE` naming the form; the empty-table fixture is `PARSE` naming the heading; and the real `language.md` in this checkout yields 20 banned rows, 22 examine rows and 13 shape rows with every form valid, which is the contract that fails the day a row breaks the layout. The counts in that test change with the file and are the only numbers the test pins.

### Step 1.2, Masking

Files: `hedy/src/commands/prose/masking.js` and its test. Done when lint exits 0, the test passes with `--coverage.include` of its source, and the tests prove: the line count is preserved for every input; a banned form inside a fenced block of either fence type, a blockquote line, a single-backtick span, a double-backtick span holding a backtick, a URL and front matter never survives masking; text outside those regions survives unchanged; and a fence that is never closed masks to the end of the file as the old gate did.

### Step 1.3, The Command

Files: `hedy/src/commands/prose/check.js` and its test, `commands/prose/index.js` and its test, `hedy/src/program.js` (register the group), `hedy/src/errors.js` and its test if decision 1 adds `PROSE`, `hedy/src/envelope.js`, `run-action.js` and their tests if decision 1 takes option (a). `runProseCheck({ texts, rows })` is pure over `[{ label, text }]` and the parsed rows, and the command reads the files, the stdin and the language file before calling that function. Done when `npm --prefix hedy test` exits 0 with coverage at the threshold, lint exits 0, and the tests prove: for every case in `expected-findings.json`, the findings from the fixture page equal the expected round 1 findings in line, kind and term, as an `it.each` table; a clean page gives `passed` true and no findings; a label under `.claude/` skips the documents-only row and a label outside does not; a case-sensitive row matches `the portal` and passes `CDP Portal`; the three stdin texts give their expected findings under their labels; a missing file is `USAGE` naming the path; a path that is a secrets file is `USAGE`; and the envelope and exit code for a failing page, a passing page and a missing file follow decision 1 through the spawned entry. The one golden the secret-path rule changes is none, because no fixture page is a secrets file.

### Step 1.4, The Rails and the Records

Files: `hedy/CLAUDE.md` (the layout lines for `commands/prose/`); `hedy/DECISIONS.md` (an entry "Prose check" under "Porting the Bash Tools": what the command keeps from the old gate, what it drops and why, the masking and matching rules, the two annotations the parser reads, the exit-code change for a missing file, and the outcome shape under decision 1, with the envelope change if any); `.claude/skills/authoring/references/language.md` (one sentence in the preface naming the two phrases the parser reads, if decision 2 takes option (a), and nothing else); `.claude/skills/authoring/SKILL.md` ("Checks": the closing pass and the short-artefact check run `hedy prose check --json` on the draft and a failing run is a failing pass; the hand-over line gains the check's result); `AGENTS.md` (the hedy command list gains `prose check`; the paragraph "No mechanical prose check runs" is rewritten to say what runs and that the reading covers the rest); `decisions.md` in this workarea (decision 27: the rounds, the stop rule and Ben's two answers); `delivery-plan.md` (step 5 marked done with PR #9, and a step 6 row for this plan); `gate-data/prose-gate-cases/cases.md` (the mapping used in step 1.0 and which cases retired). Done when `make -C <workspace> check` exits 0 and `hedy prose check <a fixture page>` and `hedy prose check --json --stdin --label title < <a stdin fixture>` print what the tests expect.

**Round 1 done when** every step's definition holds, the branch holds one commit per verified step, `/code-review high` on the branch finds nothing above the bar or the findings are fixed, and `hedy prose check` run on `writing.md` and on `language.md` reports only findings inside quoted examples, which are the author's own and exempt.

## Round 2

The orchestrator's step with Ben. Run `hedy prose check --json` over `git ls-files '*.md'` in this repo, over every `.md` under `docs/` in the docs repo, and over the last fifty commit messages through `--stdin`. Count findings per row and per shape, and list the ten lines each row fires on most. Write the report to `hedy-prose-check-round-2.md` in this workarea. Ben reads the counts and decides which rows and repairs change in `language.md` and whether the check is wired into the pre-commit hook, which is his owner step because agents cannot edit `.githooks/`. Code does not change in round 2.

## Environment Facts for the Session That Runs Round 1

- Two branches are in flight on 11 November 2026. `chore/language-and-writing` holds `language.md` and is PR #10 against `main`. `chore/no-location-workspace` is built on that commit and removes the canonical symlink: paths become root-relative, `make link` becomes `make install`, and `workspace-root.js` finds the workspace from the hedy checkout. Branch `hedy-prose-check` from `main` once both have merged, or from `chore/no-location-workspace` if the work cannot wait, because the language file path and the npm commands in this plan follow that branch's conventions.
- While `chore/no-location-workspace` has uncommitted changes in the shared checkout, do not switch branches in that checkout. Use a git worktree or wait.
- The hedy memory `hedy-cli-plan.md` holds the environment facts every increment needs: the npm shell function, the coverage flags for a single file, the vitest workers, the sibling and spy hooks, and the guard's refusal of `hedy` while `hedy/src` is dirty.
- The old gate's fixtures and expected outputs are under `gate-data/prose-gate-cases/` in this workarea, and the old script's last version is at commit `4d68719`.
