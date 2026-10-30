---
paths:
  - "README.md"
  - "AGENTS.md"
  - "CLAUDE.md"
  - ".claude/**/*.md"
  - "hedy/*.md"
  - "analysis/**/*.md"
  - "trade-imports-documentation*/docs/**/*.md"
gate-exclude:
  - "analysis/**"
---

# Authoring Voice

This rule loads when a file in its `paths` list is read or written. It is a drafting procedure digested from `~/trade-imports-arch-workspace/.claude/best-practices/writing/language.md`, which stays the authority: read it in full before drafting a whole document. The `paths` list is the one place that configures where the voice loads and where the write-time check runs, and `gate-exclude` keeps the check away from the drafting corpus. language.md is this workspace's style guide in the sense of the british-technical-writing skill's working method, so where that skill differs, language.md decides.

## The Register

Technical text exists so that someone can act on what it says. Write formally, explanatorily and deliberately: facts, mechanisms and consequences, with the comparison carrying the judgement ("Voice and tone"). No enthusiasm, idiom, humour or chat. Software runs and people decide. A human document names the actor or the reader's role and never addresses the reader as `you`. An instruction written for an AI agent, such as this rule, may.

## Before the First Word

1. Name the reader and what they do after reading. A document set's `editorial-profile.md` holds that reader with the set's defaults, run notes and preferred names: read it first.
2. Pick the document mode in document-types.md and keep to it: tutorial, how-to, reference or explanation ("Document types and structure"), or one of the "Document Shapes".
3. For a new page, read one neighbouring page first, so the set's terms and this rule are in context before the first sentence.

## While Drafting Each Paragraph

- Lead with the point. Put established context before new information, and a condition before the action it governs ("Sentences and paragraphs").
- Write it forward: the actor first, the relation in the verb, one relative clause per sentence, the reader's own term ("Write it forward").
- Let a paragraph move from claim to mechanism to consequence when the material supports that order. One claim per sentence. A sentence over 25 words is a prompt to check, never a defect by itself.
- Choose the requirement word by meaning: `must`, `should`, `may` (permitted), `can` (capable), `will` (a commitment or the future, never a requirement) ("Technical usage").
- Write behaviour in the present tense and an unbuilt option in the conditional. Keep `will` for a commitment.
- Name the actor. Repeat the noun where a pronoun could point at two things, and never end a sentence on `it` ("References and pronouns").
- Write the verb that names the operation, not the slang: runs, creates, connects, is served by ("Verbs and noun stacks").
- A position attributed to another team carries its document and date, or a placeholder in square brackets, never an invented fact. The author's own judgement is labelled as one. An absolute states its limit. A timebound word gives way to the version or the date ("Evidence and attribution").
- `still`, `only`, `merely` and `even` colour a claim: state the fact instead. `only` before a noun is a restriction and stays ("Register").
- Then say the paragraph back once without looking, and remove each sentence the restatement dropped ("Paragraph Restatement Test"). An addition carries the burden of proof ("Just Enough").

## Structure as a Choice

Prose carries a connected argument or a causal explanation. A numbered list carries reader actions and ordered mechanisms. Bullets carry discrete criteria, options or facts whose order carries no meaning. A table serves a reader who compares several items across the same fields. A diagram serves a sequence or causal chain between named components, with its conditions, that is easier to follow drawn: a sequence diagram for ordered exchanges, a flow diagram for decisions, a state diagram for one entity's lifecycle. The prose beside a diagram states consequences and limits, never the arrows ("Structural forms"). Before adding any heading, list, table or diagram, name what this reader gains that prose does not give ("Headings, lists and tables"). A heading is a title-case noun phrase, never a question.

## Two Exemplars

Compressed requirements, before: `A tenant can use the application only through a local service principal residing in that tenant, and that principal holds the tenant's grants.` After: `Using the application in a tenant requires a local service principal residing there. Access to the tenant's resources requires grants held by that principal.` The move: separate independent requirements before checking each one ("Separate compressed requirements").

Actor and object, before: `The gateway gets a short-lived token and presents it as the assertion. The same access token comes back.` After: `The gateway presents the Cognito token as the client assertion. Entra validates the assertion against the federated credential and returns an access token, which the gateway sends to Service Bus.` The move: introduce the term, replace the shorthand with the exact noun, name the actor at each step ("Name the actor and the object").

## Known Habits

The gate catches these most on first drafts, so avoid them while writing: the spaced hyphen as a sentence break, a semicolon in body text, `you` in a human document, `will` for behaviour, a negative contraction, the hype words (`leverage`, `seamless`, `robust`) and a sentence that ends on a pronoun ("Punctuation and formatting", "Words to avoid or examine"). Everything else in the word table and the heading rules is the gate's job: the write-time check reports the FAIL lines a write introduces. Fix those and do not chase WARNs. This rule enters context on the first read or write of a matching file, so a new file's first draft is written before the voice arrives unless a page was read first.
