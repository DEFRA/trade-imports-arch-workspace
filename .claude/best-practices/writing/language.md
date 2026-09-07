# Workspace language and editorial style

This guide is the authority for prose voice, grammar, terminology and formatting in human-facing technical documents. It combines [GOV.UK clear-language guidance](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/writing-guidelines/clear-language/) with workspace-specific rules. The Gate column below shows which rules are enforced mechanically.

## Voice and tone

Write as a knowledgeable colleague speaking directly and precisely to another colleague. Use a conversational tone that is brisk but not terse, human without becoming chatty, and serious without becoming pompous.

- Lead with the point.
- Use plain English in the reader's vocabulary.
- State facts rather than praising or judging them.
- Name concrete actors, mechanisms, properties and values.
- Use specialist language when it helps the named audience. Introduce unfamiliar terms before relying on them.
- Match the person and tone to the document mode in the editorial skill's [document-types.md](../../skills/editorial/references/document-types.md).
- Address the reader as "you" when describing an action they take. Do not force direct address into neutral reference material or architecture explanations.

## Sentences and paragraphs

Keep most sentences under 25 words. Treat that length as a prompt to check clarity, not a limit that overrides meaning. Keep related clauses together when splitting them would hide their relationship.

- Give each sentence one clear job, but vary sentence length and opening structure so the prose does not become mechanical.
- Front-load important information.
- Put established context before new information. Begin where the previous sentence left the reader, then advance the point.
- Keep the grammatical subject stable while describing one mechanism. Change it when the focus changes.
- Name cause, sequence and dependency with words such as "because", "when", "so" and "therefore" when they express the actual relationship.
- Let an explanatory paragraph move from claim to mechanism to consequence when the material supports that progression. Do not force it on reference entries or procedural steps.
- Keep prose paragraphs focused. If a paragraph needs more than about 5 sentences, check whether it contains more than one topic.
- Read the paragraph aloud once. A colleague should be able to restate it accurately after one reading.

### Actors and voice

Prefer active voice when the actor matters:

| Passive | Active |
| --- | --- |
| The form was submitted by the user | The user submitted the form |
| Errors were found | The validator found errors |

Passive voice is useful when the actor is unknown, irrelevant, or less important than the outcome. Do not invent an actor merely to make a sentence active.

### References and pronouns

Repeat the precise noun when `it`, `this`, `that`, `they`, "the former", "the latter" or "the same" could refer to more than one thing. Repetition is cheaper than ambiguity.

This also applies when a pronoun refers to an idea rather than a nearby noun. In `Session management sits behind it`, the reader must work out what `it` means. Write "Session management sits behind the front door".

### Verbs and noun stacks

Prefer a concrete actor plus verb to an abstract noun plus weak verb: "TIG validates the message", not "message validation takes place in TIG".

Words ending in `-ion` and `-ment` often turn an action into a nominalisation. Treat the ending as a prompt to check the sentence, not as a ban. Keep the noun when it names a real concept; restore the actor and verb when it hides what happens.

Unpack dense noun stacks into clauses that name the relationship: "configuration that controls access between tenants", not "cross-tenant access control configuration".

## Reader-pays compression

Reader-pays compression saves the writer words but makes the reader reconstruct the meaning. The test is whether a colleague can read the sentence aloud once and restate it accurately. If they need private context or have to reverse the grammar, unpack the sentence.

Common forms:

- **Ledger voice** turns document bookkeeping into system prose: `held open under X`, `argued under X`, `its case is made once`, `stated below the table`, `collected under`, `points back to`. State each fact, status or pointer directly. Separate them when one sentence would blur their relationship.
- **Aside stacking** places 2 or more asides inside one sentence and separates the subject from its verb. Keep at most one aside; move the rest into sentences of their own.
- **Contact-clause squeeze** removes the relative pronoun and gives agency to an inanimate thing: `a store only the front door reaches`. Restore the relation: "a store that only the front door can access".
- **Abstraction swap** uses a noun such as `the expected axis`, `the posture` or `their standing` instead of the concrete fact. Ask "meaning what, exactly?" and put the answer in the sentence.
- **Inverted relation** buries the important verb inside a trailing relative clause: `the tenant INS is calling into`, `the model the decision rests on`. Promote the relation: "For INS to call a target in a tenant...".
- **Trailing vagueness** ends a sentence on an abstract noun or an absolute claim with no named referent: `The shape is settled`, `it depends on one hostname and on nothing else`. End on the concrete claim instead: name what is settled; name the thing that depends.
- **Trailing pronoun** ends a sentence or a line on `it`: `the routing service provides it`, `only the single hostname keeps the cookie off it`. Name the noun the pronoun stands for. The subject the pronoun hides usually belongs at the front of the sentence, so `the routing service provides it` becomes "the routing service provides a single hostname in front of the journeys". The gate fails this pattern; `IT` as the abbreviation and words merely ending in those letters, such as `audit`, pass unchanged.
- **Dangling-preposition relative** buries the actor's verb in a relative clause that trails off on a preposition: `the session API that the journeys resolve sessions against`. Give the actor its own clause: "the journeys resolve sessions by calling the session API".
- **Figurative mechanism** makes the reader decode a metaphor before they can understand the system. State the literal behaviour instead.

The gate reports the following metaphor candidates as WARNs: `prices`, `priced`, `rides`, `rides in`, `bites`, `spends`, `spent`, `buys`, `kills`, `hangs on`, `collapses`, `leaks`, `lands`, `forecloses`, `softens`, `bootstraps`, `axis` and `posture`. A literal technical use may stay. A figurative use must be rewritten around the mechanism, not swapped for another metaphor.

## Terms and abbreviations

Use the reader brief to decide which terms need introduction.

- Tokens in [ubiquitous-language.md](ubiquitous-language.md) are workspace proper nouns. Write them as names and leave them unexpanded unless the user explicitly asks for the recorded expansion.
- Explain other unfamiliar abbreviations on first use.
- Do not expand an abbreviation the intended technical audience already knows merely to satisfy a blanket rule.
- Never invent or hypothesise an expansion.
- Replace internal labels such as "Path A", "Phase 2" or "pattern 4" with the domain name of the thing, unless the label is itself part of the artefact being described.
- Use one name for one thing throughout a document set.

Common abbreviations that need no explanation for a general UK audience include BBC, NHS, UK, VAT, PDF and URL. The reader brief may treat technical terms such as API or HTTP as familiar to a particular audience.

## Words to avoid or examine

The Gate column records how `~/trade-imports-arch-workspace/.claude/tools/editorial/check-prose.sh` treats each term. FAIL blocks the artefact. WARN asks the author to judge the actual meaning. "Guidance" is not checked mechanically.

| Term                       | Repair                                                       | Gate     |
|----------------------------|--------------------------------------------------------------|----------|
| `deliver`                  | keep for literal transport or message delivery; otherwise state the actual outcome | WARN |
| `leverage`                 | use                                                          | FAIL     |
| `empower`                  | allow, let                                                   | FAIL     |
| `facilitate`               | help, allow, or name the mechanism                           | FAIL     |
| `utilise`                  | use                                                          | FAIL     |
| `seamless`                 | state what the reader does not have to do                    | FAIL     |
| `user-friendly`            | state the behaviour that helps the user                      | FAIL     |
| `streamline`               | state what was removed or shortened                          | FAIL     |
| generic lowercase `portal` | website or service                                           | FAIL     |
| `bounds`                   | keep for mathematical limits or explicit boundary operations; otherwise use determines or constrains | WARN |
| `load-bearing`             | state what depends on it and what breaks if it changes       | FAIL     |
| `shape`                    | keep for literal geometry or data structure; otherwise name the design, proposal, pattern or layout | WARN |
| `stands-upon`              | state the assumption directly                                | FAIL     |
| `robust`                   | state what withstands retries, redelivery or malformed input | WARN     |
| `appropriate`              | state the criterion                                          | WARN     |
| `overarching`              | name what the thing spans                                    | WARN     |
| `foster`                   | state the action taken                                       | WARN     |
| `tackle`                   | state the action taken                                       | Guidance |
| `strengthen`               | state the change                                             | Guidance |

`transform` remains available for literal data transformation. Challenge it only when it means vague improvement.

Minimise `quick`, `easy` and `simple` when they judge how difficult work should feel. Literal names and a request for the simplest workable option are valid uses.

## Punctuation and formatting

These are deterministic house rules:

- Use straight `"` and `'` quotes.
- Do not use em dashes or spaced en dashes as sentence breaks. Use a full stop, comma, colon or plain spaced hyphen, whichever expresses the relationship.
- Use one space after a full stop.
- Use "to" in ranges.
- Do not put commas at the end of address lines.
- Do not use `N/A`. State "not applicable", "no data" or "not used".

### Code and identifiers

Use backticks for property names, scheme IDs, code values, filenames, paths, types, classes, methods, functions, commands, HTML elements, HTTP status codes and JSON Schema keywords.

Backticks also mark a prohibited word or punctuation mark discussed as an example. The gate masks inline backticks, fenced code, blockquotes and URLs. Ordinary quotation marks do not suppress the gate.

JSON containing `//` comments uses an unlabelled code fence. Pure JSON uses a `json` fence.

When a schema `$def` and an instance property both matter, name both: `gbnAgTradeProduct` `$def` (property: `specifiedTradeProduct[]`). Do not substitute a schema-internal name for the property a reader will find in instance data.

### Headings, lists and tables

Follow the structural rules in [document-types.md](../../skills/editorial/references/document-types.md). Use concrete headings rather than generic headings such as "Overview". Prefer a bold lead-in paragraph to unnecessary heading depth.

## Technical usage

| Prefer | Avoid |
| --- | --- |
| backend | back-end |
| frontend | front-end |
| filename | file name |
| folder | directory, when addressing a general reader |
| run a test | execute or perform a test |
| set up | instantiate, unless describing the programming operation |
| turn on or turn off | enable or disable, unless quoting an exact interface label or technical flag |

Use exact interface labels and code vocabulary when they differ from the general preference.

For requirements:

| Phrase | Meaning |
| --- | --- |
| You must | Mandatory |
| You should | Recommendation |
| You can | Option |

Use "select" rather than "click" for interface actions. Use "page" rather than "screen" for web content. Exact interface labels take precedence.

## Capitalisation, numbers, dates and inclusion

- Use sentence case except for proper nouns and official titles.
- Capitalise department names, a job title attached to a person's name, named benefits and "The Civil Service".
- Lowercase "government", "civil servants" and general job titles.
- Write out "one" and use numerals from 2 onwards. Use commas above 999 and write percentages as `50%`.
- Write dates as `4 June 2017`, ranges as `10 November to 21 December`, and times as `5:30pm` or `10am to 11am`. Use "midnight" and "midday".
- Use "disabled people", "women" and "men". Use singular "they" when gender is unknown or irrelevant.

## References and examples

- Do not cite gitignored files or local-only evidence. State the supporting fact inline when the source cannot be shared.
- Every internal link and cross-reference must resolve.
- In a Related or See-also list, write a sentence explaining what the reader will find and why it matters.
- A worked example opens with its reader frame and closes with the transferable move. Real examples are preferable when they can be shared safely.
