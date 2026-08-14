# GDS writing — short form for Jira tickets

Skill-facing summary of the GDS writing rules that apply when drafting
Jira ticket summaries, descriptions, and acceptance criteria. For the
full guide (vocabulary, capitalisation, numbers, dates, abbreviations,
inclusive language), see [`language.md`](language.md).

## The four rules

1. **Plain English.** Avoid jargon. Spell out what the user sees, does,
   or expects.
2. **Active voice.** "Remove the variables", not "the variables should
   be removed". "The user submitted the form", not "the form was
   submitted by the user".
3. **Short sentences.** Under 25 words. Front-load the important bit.
4. **Be concise.** One idea per sentence. Cut hedging ("perhaps",
   "might be helpful to").

## Applied to ticket fields

| Field | Apply |
|-------|-------|
| Summary (<80 chars) | Action-oriented, specific. "Validate commodity code length on submit", not "Commodity code issues". |
| Description | Plain English context. State the why before the how. |
| Acceptance criteria | Observable, measurable. "API returns 400 when commodity code <6 digits" beats "validation works". |

## Words to avoid

`deliver` → create, provide. `leverage` → use. `utilise` → use.
`facilitate` → help, allow. `quick`/`easy`/`simple` — demoralising
for users who struggle. See [`language.md`](language.md) for the full
list.
