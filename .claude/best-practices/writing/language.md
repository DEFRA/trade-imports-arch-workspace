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

### Register

A sentence whose framing obscures the behaviour, or introduces a judgement the passage does not support, is rewritten as the consequence the passage supports, or removed when no supported consequence remains. A sentence that states the passage's scope, or carries the reader between points, is not a defect for framing its material. Take the opener of a comparison of two session designs: "The second difference is renewal, and it is the one a user will notice". The passage supports a consequence, so the opener is rewritten around that consequence, and every condition the passage puts on that consequence is kept in the rewrite. Here the passage says that a renewal redirect passes without a prompt while a session in the provider's chain is live, and that a user returning after a longer pause meets a lapsed provider session, which the provider re-establishes without a prompt; because that re-establishment is a fresh provider session, a user who holds more than one organisation sees the organisation picker. The rewrite therefore reads along the lines of "In the session-service design the user sees nothing of renewal. In the cookie design a renewal redirect passes silently while the provider's session is live. When that session has lapsed, the provider re-establishes the user in a fresh provider session, so a user who holds more than one organisation meets the organisation picker again" (an illustration built from the passage, not a wording the author adopted). Dropping the lapse and the fresh session would turn a conditional outcome into one the reader expects at every renewal, which is the failure this rule exists to prevent. A figurative pivot such as "That silence has an edge" is removed and the limit the pivot gestured at is stated directly. A ranking the passage does not ground ("a nuisance", "more serious", "for the worse") is a judgement standing in for a fact and goes under "Concentrate and distil" below; a comparison the passage grounds in a stated fact stays. For a pronoun or demonstrative standing for a named thing, see "References and pronouns". Gate: judgement; the gate reports no register pattern yet.

## Sentences and paragraphs

A sentence over 25 words is a prompt to check whether the reader can follow the sentence. Length is never the defect on its own, and a 30-word sentence a colleague can restate after one reading stays as written. Keep related clauses together when splitting them would hide their relationship.

- Give each sentence one clear job, but vary sentence length and opening structure so the prose does not become mechanical.
- Front-load important information.
- Put established context before new information. Begin where the previous sentence left the reader, then advance the point.
- Keep the grammatical subject stable while describing one mechanism. Change it when the focus changes.
- Name cause, sequence and dependency with words such as "because", "when", "so" and "therefore" when they express the actual relationship.
- Let an explanatory paragraph move from claim to mechanism to consequence when the material supports that progression. Do not force it on reference entries or procedural steps.
- Keep prose paragraphs focused. If a paragraph needs more than about 5 sentences, check whether it contains more than one topic. A paragraph has one identifiable job, which may involve several related ideas; where the reader needs to distinguish two jobs, break at the seam and change no word. A long paragraph on one job stays: length alone is never the defect, and a boundary-only edit that leaves the reader's difficulty in place is not a repair. In the calibration rounds on the INS trade-offs pages, six long paragraphs split at their topic seams were accepted as readability improvements, including three whose wording was rejected on other grounds.
- Put a condition before the action or information it governs, so that a reader the condition excludes can stop reading; reorder when the reader would otherwise miss the applicability or have to re-read to find what the condition binds. Keep `if`, `only if`, `unless` and `after` distinct: they are not interchangeable, and a moved condition governs exactly what it governed before. A clear contrast or an emphasis that already works stays where it is. When the text does not settle which action a trailing condition governs, the scope is a question for the author, not a guess. Example from the rounds: a condition moved before the table row it governs, accepted from both reviewers.
- Read the paragraph aloud once. A colleague should be able to restate it accurately after one reading.

### Actors and voice

Name the actor when the document has one and the reader needs to know which actor:

| Passive | Active |
| --- | --- |
| The form was submitted by the user | The user submitted the form |
| Errors were found | The validator found errors |

When the actor is unknown, irrelevant, or is whichever component happens to handle the request, use the passive and put the thing the reader is tracking in the subject. Never invent an actor to make a sentence active.

### References and pronouns

Repeat the precise noun when `it`, `this`, `that`, `they`, "the former", "the latter" or "the same" could refer to more than one thing. Repetition is cheaper than ambiguity.

The same rule applies when a pronoun refers to an idea rather than a nearby noun. In `Session management sits behind it`, the reader must work out what `it` means. Write "Session management sits behind the front door".

The test is the reader's recovery: replace a pronoun or demonstrative standing for a named component ("that design", "it" for a verdict or a mechanism) with the name when the reader cannot recover the referent at once and without error; a pronoun whose referent is the one thing the previous clause named needs no change. Write the name only when the text establishes which thing is meant; when the text does not settle the antecedent, the antecedent is a question for the author, never a guessed name. In the calibration rounds the author rejected "that design" where the design had a name, and "it" for a thing.

### Verbs and noun stacks

Prefer a concrete actor plus verb to an abstract noun plus weak verb: "TIG validates the message", not "message validation takes place in TIG".

Words ending in `-ion` and `-ment` often turn an action into a nominalisation. Treat the ending as a prompt to check the sentence, not as a ban. Keep the noun when it names a real concept; restore the actor and verb when it hides what happens.

Unpack dense noun stacks into clauses that name the relationship: "configuration that controls access between tenants", not "cross-tenant access control configuration".

## Reader-pays compression

Reader-pays compression saves the writer words but makes the reader reconstruct the meaning. The test is whether a colleague can read the sentence aloud once and restate it accurately. If they need private context or have to reverse the grammar, unpack the sentence.

### Write it forward

These 4 rules are for drafting. Write each sentence as you would say it if the reader asked "what do you mean?".

- Put the actor first when the document has one and the reader needs to know which actor. Where the actor is whichever component happens to handle the request, use the passive and start on the thing the reader is tracking.
- Carry the relation in the verb. Where the fact is "A comes from B", "A replaces B" or "A causes B", write that verb. Do not assemble the relation out of stacked prepositions and participles.
- Use one relative clause per sentence, and never one inside another.
- Use the reader's own term where the reader brief says they know the term. Walking through an example is the long path when the term is the short one.

The named compression patterns live in [review-brief.md](../../skills/editorial/references/review-brief.md), "Compression patterns". They are recognition tests for finished prose. A writer who holds them while drafting produces defensive sentences.

The gate reports the following metaphor candidates as WARNs: `prices`, `priced`, `rides`, `rides in`, `bites`, `spends`, `spent`, `buys`, `kills`, `hangs on`, `collapses`, `leaks`, `lands`, `forecloses`, `softens`, `bootstraps`, `axis` and `posture`. A literal technical use may stay. A figurative use must be rewritten around the mechanism, not swapped for another metaphor.

## Concentrate and distil

Growth is a cost. "Left to their own devices AIs keep adding more, rather than distilling and getting more focused." Two rules follow, by the review intent. Under distil, no rewrite is longer than its source and the removal of whole units is the first move. Under clarify, a rewrite keeps every claim of the unit, may grow only in the two cases the review brief names (`~/trade-imports-arch-workspace/.claude/skills/editorial/references/review-brief.md`, "Rules for every reviewer"), each with the loss named, and never adds technical detail the source does not hold. Under either intent, noise may be removed at the cost of information when the noise is drowning the central point, and the loss is named.

Before adding to a passage, ask what the passage is trying to establish and whether the addition would materially strengthen that point. A question that is easy to raise ("who decides this?", "what is the process?") but whose answer would not strengthen the point is a tangent: answering the question adds text and dilutes the central material. Resolve a tangent by removing the text that invites the question, not by answering the question.

Removing a whole unit and compressing a unit that stays are different moves. Removal is always available. Compression is not a repair, and a sentence squeezed to save 2 words has been broken rather than shortened.

Remove the sentence, bullet or paragraph that carries the defect. When the unit has to stay, rewrite the sentence so the defective part is gone, and, under clarify, let the rewrite run longer only in the two cases the review brief names, with the loss named; under distil the rewrite never grows. Do not cut a fragment out of a sentence and leave the rest standing, which strands a subject or breaks the line. Qualify or expand only when neither deletion nor rewording works, and then name what the reader would otherwise infer wrongly or be unable to verify. Keep the connective prose that carries the reader between points.

The following go by default, and the removal is the whole fix:

- A judgement standing in for a fact ("cheap", "easy", "safe", "simple"), and a ranking the passage does not ground ("a nuisance", "more serious", "for the worse"). State the fact when the passage needs one; otherwise cut the judgement. Never qualify the judgement, and never restate a ranking in other words; a comparison the passage grounds in a stated fact stays.
- A description of a mechanism the design has not decided. Keep only the statement that the design must handle the consideration.
- A pointer or cross-reference. Pointers atrophy as their targets move, get renamed or vanish, so keep one only when the reader could not find the reason behind a rule without the pointer. A one-line fact may be restated in the pointer's place.
- The document's own tallies (how many families, rows, updates or decisions). The reader needs the things, not the count, and the count is what goes wrong when the things change.

### What a paragraph carries

A paragraph earns its length by what the reader takes away. Read the paragraph once, then say the paragraph back without looking at the text. Whatever the restatement drops is a removal candidate, because the point survived without that material, which is the evidence the list above already uses for a tangent and for a second justification.

Apply the test to the paragraph rather than to the sentence. Sentence length is governed by "Sentences and paragraphs" above, where length is never the defect on its own. A paragraph is a different unit: the reader holds a paragraph whole, and a sentence the restatement drops was carrying nothing for that reader.

The repair is the removal of each sentence the restatement dropped, one whole sentence at a time. Rewriting the paragraph shorter is not the repair. A condensation restates the surviving material in new words, which makes the editor the author of wording the page never had, and the rule that removing a whole unit and compressing a unit that stays are different moves holds for a paragraph exactly as the rule holds for a sentence.

## The whole document

A document reads as if one author wrote it as a coherent whole. After substantive edits, read each changed paragraph with the paragraph before and after it, and with the page's opening, and check that every pronoun still resolves; that a fact repeated in the set has one home; that a removed unit stranded no transition; that a diagram and the prose beside it keep the distinct jobs [document-types.md](../../skills/editorial/references/document-types.md) gives them; and that the page reads in one voice. What to do with a seam problem is the editorial skill's procedure. Gate: judgement.

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

The gate fails 9 marketing words outright and names the repair for each, so do not hold them while writing: `leverage`, `empower`, `facilitate`, `utilise`, `seamless`, `user-friendly`, `streamline`, `load-bearing` and generic lowercase `portal`. The table below holds the terms that need a judgement the script cannot make.

| Term                       | Repair                                                       | Gate     |
|----------------------------|--------------------------------------------------------------|----------|
| `deliver`                  | keep for literal transport or message delivery; otherwise state the actual outcome | WARN |
| `stands-upon`              | state the assumption directly                                | Guidance |
| `bounds`                   | keep for mathematical limits or explicit boundary operations; otherwise use determines or constrains | WARN |
| `shape`                    | keep for literal geometry or data structure; otherwise name the design, proposal, pattern or layout | WARN |
| `robust`                   | state what withstands retries, redelivery or malformed input | WARN     |
| `appropriate`              | state the criterion                                          | WARN     |
| `overarching`              | name what the thing spans                                    | WARN     |
| `foster`                   | state the action taken                                       | WARN     |
| `tackle`                   | state the action taken                                       | Guidance |
| `strengthen`               | state the change                                             | Guidance |
| `alone` after a noun       | where it restricts the subject ("the front door alone holds"), put only before the noun: "only the front door holds"; keep it for the by-itself sense ("expiry alone ends no provider session") or write "by itself" | WARN |

`transform` remains available for literal data transformation. Challenge it only when it means vague improvement.

`alone` after a noun has two senses, and the postpositive form reads first as the wrong one. "The front door alone holds the signing key" means only the front door holds that key, but a reader first parses "the front door alone" as the front door unaided and has to re-read. Put the restriction before the noun, where English readers expect it: "Only the front door holds the signing key." Keep `alone` where the sense is by itself, as in "expiry alone ends no provider session", or write "by itself".

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

Keep structure in proportion. Before adding a heading, table or list, name what this reader gains, at this length and in this document mode, that prose does not give; a table or list that only formats what a sentence already says is structure for its own sake. An opener that only announces the material ("This page covers what happens, how long, and how to spot it") is replaced by a first sentence that states the point; a scope or route sentence that does a job for the reader stays. Paragraph breaks at job boundaries are not the structure this test guards against.

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
