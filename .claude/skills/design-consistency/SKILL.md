---
name: design-consistency
description: 'Check a set of design pages for statements that cannot all hold: one extractor per page lists the page''s rules as structured facts, a script merges them into one register sorted by actor and object, one checker reads only the register and lists the contradictions, and each contradiction goes to the author as a question with both quotes. Never edits a page. Triggers: "check design consistency", "design consistency check", "check these pages for contradictions", "find contradictions across the pages", "do the pages contradict each other". NOT for prose, structure or wording (editorial), for closing editorial review findings (editorial-triage), or for checking a design against a vendor or standard (the register holds only what the pages say). Distinct from /init, which scaffolds CLAUDE.md, and from /decide, which puts questions to the user: this skill produces the contradictions that /decide then puts.'
---

Finds the places where design pages contradict each other and turns each one into a question for the author. Each page's rules are extracted as facts (who does what, to what, under which condition, with what force and value), the facts of every page are merged into one register, and one checker compares the register's facts with each other. The output is `questions.md` in the run's workarea; the author's rulings go to the work's own records, and no page changes here. On the INS Auth session pages (tests R2 and R2r, October 2026) one run found 23 to 25 of the 26 contradictions that about ten review runs raised together, for about $6.50 for four pages; a single review run found 6 to 13.

**Bash call hygiene** - one command per Bash call; paths in the literal `~/trade-imports-arch-workspace/...` form. Full rules: [`agent-skills.md`](../../best-practices/skills/agent-skills.md).

## Usage

| Trigger | Steps |
|---------|----------------|
| "check design consistency" | Steps 0 to 4 |
| "design consistency check" | Steps 0 to 4 |
| "check these pages for contradictions" | Steps 0 to 4 |
| "find contradictions across the pages" | Steps 0 to 4 |
| "do the pages contradict each other" | Steps 0 to 4 |

NOT for prose, structure or wording: that is `editorial`. NOT for closing the findings of an editorial review: `editorial-triage`. NOT for checking a design against a vendor's documentation or a standard: the register holds only what the pages say, and that check needs the external source.

## Worker references

| Persona | Step | Artifact |
|---|---|---|
| `references/FACT_EXTRACTOR.md` | Step 1, one per page to extract | `facts/<page stem>.json` |
| `references/CONSISTENCY_CHECKER.md` | Step 3, one per run | `contradictions.json` |

Spawn idiom - Agent tool, `subagent_type: general-purpose`, all extractors in one message, model unset so the workers inherit the session model. The prompt begins:

```
Follow the instructions in ~/trade-imports-arch-workspace/.claude/skills/design-consistency/references/<NAME>.md.

<per-spawn context>
```

## State

Run state is JSON under `~/trade-imports-arch-workspace/.claude/workareas/design-consistency/<run id>/` (gitignored): `manifest.json`, `facts/`, `register.json` and `register.tsv`, `contradictions.json`, and the `questions.md` view. Schema and field rules: `assets/design-consistency-schema.md`. Workers write only their own artifact; the scripts write the rest atomically.

## Step 0: Start

Choose a run id that names the page set, such as `ins-auth-session`, and reuse the run id when re-checking the set after edits.

```bash
~/trade-imports-arch-workspace/.claude/tools/design-consistency/start-design-consistency.sh --run-id <run id> <page.md> <page.md>...
```

The first stdout line is `MODE: EXTRACT` or `MODE: CHECK`. `MODE: CHECK` means every page's facts match its current text: go to Step 2.

## Step 1: Extract

Spawn one `FACT_EXTRACTOR` per `extract:` line, all in one message. Each spawn names the page, its path, its source hash and its facts file from that line. Give the same **Names** to every extractor: the preferred names of the actors and objects of the page set, from the set's glossary or register of terms when it has one, or from the user. Without shared names the register splits one actor across several spellings, and the checker misses pairs.

Wait for one return line per page. When an extractor fails, stop that agent before spawning its replacement: an agent that looks lost can still finish later and overwrite the replacement's file.

## Step 2: Build the Register

```bash
~/trade-imports-arch-workspace/.claude/tools/design-consistency/build-register.sh --run-id <run id>
```

It refuses while any page's facts are missing or older than the page, and names those pages; extract them and run it again.

## Step 3: Check

Spawn one `CONSISTENCY_CHECKER` with the run's `register.tsv` and `contradictions.json` paths, and one line per page on what the page is for, such as which page holds the rules the others share. Wait for its return line.

## Step 4: Report and Decide

```bash
~/trade-imports-arch-workspace/.claude/tools/design-consistency/render-design-consistency.sh --run-id <run id>
```

Read `questions.md`. A contradiction the renderer flags as citing fewer than two register facts is the checker's inference, not a pair of statements: check it before putting it to the user.

Put the S1 and S2 contradictions to the user as decisions with `/decide`, each with both quotes and the ways to settle it; offer the S3 ones as a list. When a contradiction turns on how an external system behaves, read that system's own documentation in the corpus before recommending an option, because the pages may quote it loosely. Record the rulings where the work keeps its decisions, such as its plan, and leave the pages to whoever edits them.

## Completion output

```
design-consistency complete for <run id>.

Pages <n> (extracted <e>, cached <c>); facts <f>.
Contradictions <k>: S1 <a>, S2 <b>, S3 <c>; citing fewer than two facts <u>.
Questions: ~/trade-imports-arch-workspace/.claude/workareas/design-consistency/<run id>/questions.md

Next: rule on the S1 and S2 questions; re-run with the same run id after editing the pages.
```

## Scripts cheat-sheet

All under `~/trade-imports-arch-workspace/.claude/tools/design-consistency/`:

| Script | Purpose |
|---|---|
| `start-design-consistency.sh` | Hash the pages, write the manifest, list the pages to extract (`MODE: EXTRACT`) or report every page current (`MODE: CHECK`) |
| `build-register.sh` | Merge the facts of every page into `register.json` and `register.tsv`, sorted by actor then object; refuses stale or malformed facts |
| `render-design-consistency.sh` | Write `questions.md` from the checker's contradictions, most severe first, and flag any that cite fewer than two facts |
