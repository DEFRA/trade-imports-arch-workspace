---
name: editorial-help
description: 'On demand, help a user choose, run and customise the editorial tools (editorial, editorial-triage, design-consistency, the names and prose checks, /decide): look at the pages, ask what the user wants, print the exact command with its measured cost and next step, start the chosen tool on the user''s go, and say which file customises what at the three levels (workspace rules, document-set profile, one run). Invoked only as "/editorial-help". NOT for doing an editorial pass (editorial), closing findings (editorial-triage), finding contradictions (design-consistency) or asking open questions (/decide): this skill picks among them and starts the one chosen. Distinct from /init, which scaffolds CLAUDE.md.'
disable-model-invocation: true
---

Helps a user who does not know the editorial tools, or who wants to change how they behave. It looks at the pages the user names, asks what they want, and answers with the tool, the exact command, the measured cost and the next step, then starts the tool when the user says go. For customising, it names the level the change belongs at and the file that holds the change. Everything it says comes from [the editorial tools guide](references/editorial-guide.md), which also reads on its own, without Claude Code.

**Bash call hygiene** - one command per Bash call; paths in the literal `~/trade-imports-arch-workspace/...` form. Full rules: [`agent-skills.md`](../../best-practices/skills/agent-skills.md).

## Usage

| Trigger | Steps |
|---------|----------------|
| "/editorial-help" | Steps 0 to 3 |
| "/editorial-help" with pages | Steps 0 to 3, with the pages passed to Step 0 |

NOT for doing the work itself: the editorial pass is `editorial`, closing findings is `editorial-triage`, contradictions are `design-consistency`, and open questions are `/decide`. This skill starts one of them on the user's go and then hands over.

## Step 0: Start

Read [the editorial tools guide](references/editorial-guide.md), then:

```bash
~/trade-imports-arch-workspace/.claude/tools/editorial-help/start-editorial-help.sh [<page.md>...]
```

Pass the pages the user named, or none. The first stdout line is `MODE: PAGES` or `MODE: NO-PAGES`. Under `MODE: PAGES` the lines that follow give the page and word counts, prose FAIL lines per page, the document set's profile, the names check result, and the earlier reviews and triages of these very files. The script changes nothing.

## Step 1: Ask What the User Wants

When the user's own words already name the goal ("make this clearer", "check these pages agree", "ban this phrase"), take that goal, say which one you took, and skip the question. Otherwise put one question with the question tool, header "Goal". The tool takes at most four options, so choose the four goals below that best fit the facts, put the best fit first and label it "(Recommended)"; the tool's "Other" answer covers the rest, and the question names any goal left out:

| Goal | Fits when |
| --- | --- |
| Write or tidy a document | no pages, or one short page |
| Review a document set | several pages and no earlier review of these files |
| Close review findings | a review result with no triage after the review |
| Check edits made since a review | a triage with a plan, and the pages changed since |
| Check pages for contradictions | design pages that are meant to agree |
| Customise the tools | always offered, unless four goals fit the facts better |

With no pages, offer Write or tidy, Review a document set, Check pages for contradictions and Customise the tools: the other two need pages. When the chosen goal needs pages the user has not named, suggest document sets from the session's context (pages edited or discussed in the conversation, folders the user named, the working directory), say that the suggestions come from that context, and always leave Other for a set the context does not show; then run Step 0 again on the chosen pages. The helper never searches for document sets, because the sets a user may bring are open-ended. The facts can override the user's choice; say so before Step 2 when they do. A names check that reports replaced names comes first: the review refuses to start until they are renamed. A page set with no profile and more than one page gets an offer to create one, because the profile carries the reader frame, the context pages and the names into every later run.

## Step 2: Recommend

For a tool, answer with the row of "Choosing a Tool" in the guide that fits, filled in with the facts:

1. The tool and why it fits these pages.
2. The exact command, with the real paths, run id and profile.
3. The cost: the guide's measured figure scaled by these pages' words, stated as an estimate, with the guide's date. A free script says free.
4. The next step, and the user's part in that step.

For an editorial pass or a review, draft the run's brief so the user never writes one. Take each input from the user's words first, then from the document and its profile, and from "Starting an Editorial Pass" in the guide:

| Input | Source |
| --- | --- |
| Reader frame | who the document serves and what that reader must know or do after reading; the profile's Reader when one applies; otherwise inferred from the document's kind and audience (a PR body serves its reviewer) |
| Tone | the house voice in `best-practices/writing/language.md`, "Voice and tone": a knowledgeable colleague speaking directly to another colleague, matched to the document form; a different register only when the reader needs one |
| Mode | `revise` when the user wants the text changed; `review` when the user wants findings only |
| Intent | `clarify` when the complaint is clarity, structure, tone or sentences, because clarify may restructure and keeps every claim; `distil` when the complaint is length or noise |
| Document form | the dominant mode or fixed format from `skills/editorial/references/document-types.md` (a PR body keeps Change, Reason and Verification) |
| Restructuring | allowed when the user names structure as a problem; otherwise kept |
| Keep | the facts the edit must not lose: numbers, results, commands, names |

Then ask, in one call to the question tool, four questions. Each leads with the sensible default, labelled "(Recommended)", so the user confirms with one choice and describes only what differs through Other:

1. **Audience** (header "Audience"): the inferred reader frame first; one or two other readers the document could serve, drawn from its kind and the session's context.
2. **Tone** (header "Tone"): the house voice first; then a formal register for governance, assessment or external readers, and a plain register for readers outside the specialism.
3. **Edit** (header "Edit"): the inferred intent and restructuring first, among `clarify` with restructuring, `clarify` keeping the structure, and `distil`.
4. **Start** (header "Start"): "Start the pass with this brief (Recommended)", whose preview shows the whole brief with the answers above and the inferred form and keep list, against "Show me the brief first".

Say in the question text which inputs were inferred rather than stated by the user. The answers are the brief Step 3 passes on, and choosing Start is the user's go.

For customising, answer with the level the change belongs at (workspace, document set or one run), the file and the section from "Customising the Tools", and a one-line example of the edit. A rule that holds only for this document set goes in its profile, never in `language.md`. Offer to make the edit; a workspace file changes only through a commit, which the user asks for.

## Step 3: Start on the User's Go

Start nothing that costs money until the user says go. On go, invoke the chosen skill with the recommendation's arguments (for an editorial pass, the file and the confirmed brief), or run the free script, and hand over: that skill's own steps run from there. To create a profile, write `editorial-profile.md` beside the pages with the sections the user can fill now, then check it with `bash ~/trade-imports-arch-workspace/.claude/tools/editorial/read-profile.sh <profile>`, and tell the user which publishing configs need the exclusion the guide names.

## Completion output

```
editorial-help complete: <goal>.

Facts: <pages> pages, <words> words; profile <path or none>; names <clean or n replaced>.
Recommended: <tool> - <command>.
Cost: <estimate, or free>.
Next: <what happens next, or "started <tool>">.
```

## Scripts cheat-sheet

| Script | Purpose |
|---|---|
| `~/trade-imports-arch-workspace/.claude/tools/editorial-help/start-editorial-help.sh` | Facts about the pages: words, prose FAIL lines, the profile, the names check, and earlier reviews and triages of these files |
| `bash ~/trade-imports-arch-workspace/.claude/tools/editorial/read-profile.sh <profile>` | Read a document set's `editorial-profile.md` to JSON, to check a profile after writing it |
