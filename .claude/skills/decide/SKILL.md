---
name: decide
description: 'Put every open decision of the current work to the user as question prompts: each prompt frames the problem, the evidence and the consequence of the choice, offers 2 to 4 options and leads with the recommendation; then record the answers where the work keeps its state and act only on answers that are explicit instructions. Triggers: "/decide", "present the decisions", "give me the decisions as prompts", "ask me the open questions", "what do I need to decide". NOT for a single clarifying question in the middle of a task (ask it directly), for closing editorial review findings (editorial-triage, whose Decide section and spot check own those inside a triage run), or for Jira tickets (jira). Distinct from /init, which scaffolds CLAUDE.md. Decides nothing itself and owns no domain state.'
---

Collects the decisions waiting on the user in the current work, from any domain, and puts each one to the user as a question prompt with enough context to decide without scrolling back: what is being decided, the evidence, what each choice leads to, and a recommendation. The answers are recorded in the work's own records, and only answers that instruct an action are acted on.

**Bash call hygiene** - one command per Bash call; paths in the literal `~/trade-imports-arch-workspace/...` form. Full rules: [`agent-skills.md`](../../best-practices/skills/agent-skills.md).

## Usage

| Trigger | Steps |
| --- | --- |
| "/decide" | Steps 1 to 4 |
| "present the decisions" | Steps 1 to 4 |
| "give me the decisions as prompts" | Steps 1 to 4 |
| "ask me the open questions" | Steps 1 to 4 |
| "what do I need to decide" | Steps 1 to 4 |

NOT for a single clarifying question in the middle of a task: ask it directly with the question tool. NOT for closing editorial review findings: `editorial-triage` owns those. NOT for Jira tickets: `jira`.

## Step 1: Gather the Open Decisions

1. Read back through the conversation for choices put to the user and not yet answered, recommendations awaiting approval, and actions waiting on the user's word.
2. Read the work's own records when they exist: a plan's decision list, a register's open items, an open-questions section, a `decisions.md`, a results document's "Decisions" section.
3. Keep only real decisions: a choice between options where the user's answer changes what happens next. Leave out facts that can be checked, choices with a conventional default, and requests for permission to continue.
4. Merge duplicates, and order the list by consequence, most consequential first.
5. When nothing is open, say so in one line and stop.

## Step 2: Write Each Question

One decision per question. Every question carries:

1. Its number as `n of N`, so the user sees the total.
2. The problem: what is being decided, in one or two sentences.
3. The evidence: the facts and numbers the choice rests on, with their source.
4. The consequence: what changes in the work, the cost or the risk, for the main options.

Options:

1. 2 to 4 options, mutually exclusive unless the decision is a pick-several, in which case set multi-select.
2. The recommended option first, its label ending in "(Recommended)". Recommend from the evidence; when the evidence does not favour one option, say so in the question and recommend none.
3. Each option's description says what choosing it means: what happens next and its trade-off.
4. Labels of 1 to 5 words; the header chip at most 12 characters.

## Step 3: Ask

Put every open decision to the user. The question tool takes a few questions per call, so continue in further calls until every decision has been asked; never drop or hold back a decision.

## Step 4: Record and Act

1. Read every answer and note literally. An answer chosen through "Other" may change the option, add a condition or decline the decision: follow what it says, and ask again only when it is ambiguous.
2. Record each decision, with its date, where the work keeps its state: the plan, the register or the decision list the decision came from. When the work keeps no such record, list the decisions in the reply.
3. Flag, before acting, any answer that conflicts with the evidence presented or with another decision, and say what the conflict changes.
4. Act only on answers that are explicit instructions, such as "commit the pin". An answer that chooses a direction ("build in stages") sets the plan; the work it implies starts when the user says so, or straight away when the user has already asked for autonomous work.

## Completion output

```
decide complete: <N> decisions asked, <N> answered.

Recorded in: <file or files>
Acting on now: <the explicit instructions, or none>
Flagged: <conflicts, or none>

Next: <the first piece of work the answers unlock>.
```

## Scripts cheat-sheet

None. The skill uses the question tool and the work's own records.
