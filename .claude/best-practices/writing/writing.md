# House Writing Standard

Technical text in this workspace is written so that a reader can act on it after one reading. This standard holds the rules that make a draft read that way. The words, phrases and sentence shapes ruled out, each with its repair, are listed in [language.md](../../skills/authoring/references/language.md), which the authoring skill reads with this standard.

What a document contains is decided before writing, from the source analysis and an agreed structure. The planning path of the authoring skill produces that plan. Without a plan, the rules here apply to every sentence an agent writes.

## Tone of Voice

Technical text exists so that someone can act on it: run a command, make a decision, operate the service. Write in a formal register that explains and takes its time, in simple and clear language. Leave out subjective judgements, idiom, humour and chat. Write each point as a complete sentence that names who or what acts, never as a shorthand phrase the reader has to expand for themselves.

**Claims.** State the facts about the thing: why it exists, how it works, what follows from it, and what follows from that. Then let the reader judge.

**Judgement words.** Where a draft calls something safe, or calls a change simple when the change is not, remove the word and state the fact instead, such as the number of steps or the cost. `easy` and `cheap` are banned, and `language.md` gives their repairs. Remove a ranking the text does not support, such as `a nuisance` or `more serious`. Remove an adverb that adds attitude rather than meaning, such as `still`, `merely` or `even`. Keep `only` before a noun, because there it restricts the claim. Replace a slogan, a contrast written for effect or a list of three written for rhythm with a plain statement of how the thing works.

**Attribution.** State another team's position as a fact, then name the document, version and date that record the position. Where the only source is a conversation, say so and give the date, or leave a placeholder in square brackets for the author to fill. Never write reported speech such as `X confirmed`. Label the author's own judgement as a judgement: "The architecture team's position is".

**Absolutes and time.** Where a draft uses an absolute such as `secure`, `always`, `never` or `fastest`, state the property and the limit at which it stops holding. Replace a word tied to the time of writing, such as `currently`, `now`, `new`, `soon` or `latest`, with the version or the date, which still hold when the page is read a year later.

**Standard patterns.** Where a passage follows a published pattern, open with plain framing such as "The following is the standard authorisation code flow", and then describe only the part that is specific to the system. Do not scatter section numbers of standards through the text.

**Worst case.** State the worst case, not the typical case. Write each assumption with what follows if the assumption is false, and put both before the mechanism that depends on the assumption. Where a correct statement invites a likely false inference, state what does not happen.

**Actors and readers.** Software runs and people decide. Never write that a service, pipeline or repository chooses, wants, asks or waits for anything. Where one name means both a team and a service, write "the TDS team" when people act and "the TDS service" when software acts. In a document for people, name the actor or the reader's role, and never address the reader as `you`. Write a how-to step in the imperative: "Run the migration". Instructions written for an AI agent may address the agent as `you`.

### Before and After: Tone of Voice

Before:

> The platform team said they do not provide integration.

After:

> Integration between source systems and the data catalogue is outside the platform team's remit [version and date].

The move: write the position as a statement with its source, and leave a placeholder where the source is unknown.

Before:

> INS sends, TDS receives, nobody owns the middle.

After:

> INS owns the sending workflow, TDS the receiving API.

The move: replace the slogan with the mechanism it stood for.

Before:

> The API is fully secure and renewal is seamless.

After:

> The API encrypts data in transit with TLS 1.3. If the provider session is live, the session renewal happens without a user prompt. If the provider session has lapsed, the user signs in again.

The move: give the absolute its limit, and write the worst case beside the typical one.

## Paragraphs

**One job.** Give each paragraph one job, which may take several related ideas to do. When a paragraph passes about five sentences, check whether it has taken on a second job. Where the reader needs to tell two jobs apart, break the paragraph at the point where the second job starts. Leave a long paragraph that does one job long.

**The claim first.** Open the paragraph with the claim the rest of it supports, and use the later sentences for the mechanism, the evidence or the conditions. The same holds at every level. The governing thought, the one claim the whole document supports, opens the document and the sections support that thought. Each section's point, the one sentence the section establishes, opens the section and its paragraphs support that. A reader who stops at any level then holds a true picture with less detail.

**Order.** In a paragraph that explains, move from the claim to the mechanism to the consequence, where the material supports that order. In a reference entry or a procedural step, keep the order the subject itself has.

**Joins.** Begin each paragraph where the previous paragraph left the reader. A sentence whose job is to carry the reader from one point to the next is part of the argument, so keep the sentence.

**Qualifications.** Keep a rule beside the qualification it needs. Never put an exception in a later section, because a reader who stops early takes the rule as unqualified.

**One home.** Give each rule or fact one home in the document, and do not restate it where an instance of it occurs. A one-line fact may be repeated where a sentence needs the fact.

**Finished.** A paragraph is finished when a series of simple, direct sentences conveys its point, so that adding a sentence would not improve the point and removing one would lose useful meaning. Make the language simple, never the content: every claim keeps its precision.

### Before and After: Paragraphs

Before:

> The consumer reads each event from the queue. The broker may deliver an event more than once after a timeout. The consumer stores each event ID with its result in one database transaction. As a result, a redelivered event does not repeat the work.

After:

> Consumers are free to decide whether to reprocess a redelivered event. An event's eventId never changes, enabling consumers to store which events they have processed. If the broker redelivers an event more than once, consumers can determine which events they have 'seen' and decide whether to reprocess them or not.

The move: open on the claim the paragraph supports, then give the mechanism that makes the claim true.

Before:

> A session lasts eight hours. The session record holds the tokens and the active organisation. The front door reads the record on every request. A session also ends after 30 minutes without a request.

After:

> A session can last a maximum of eight hours, and will end automatically after 30 minutes of user inactivity. The session record stores the tokens and the active organisation, and the front door reads the record on every request.

The move: keep the qualification beside the rule the qualification limits.

## Sentences

**Actor and verb.** Make the actor the subject and the action the verb: "TIG validates the message", not "message validation takes place in TIG". Where the actor is unknown, irrelevant or whichever component happens to handle the request, use the passive so that the thing the reader is following stays in the subject, and invent no actor. Name the operation with a plain verb such as runs, creates, connects or sends a request to, never a slang verb. Unpack a stack of nouns into a clause that names the relation between them: "configuration that controls access between tenants", not "cross-tenant access control configuration".

**Known before new.** Begin each sentence with what the previous sentence left the reader holding, then advance the point. 

**Condition first.** Put a condition before the action or information it governs, so that a reader the condition excludes can stop reading. Treat `if`, `only if`, `unless` and `after` as different words, because each sets a different condition.

**One claim.** Give each sentence one claim. When a sentence passes 25 words, check whether a colleague could restate it after one reading, and leave a longer sentence that passes the check as written. Vary sentence length and openings, so the prose does not read as mechanical. Keep the same subject while the text describes one mechanism, and change the subject when the topic changes. Name cause, sequence and dependency with the words that carry them, such as `because`, `when`, `so` and `therefore`.

**Write it forward.** Write each sentence as it would be said to a colleague who asked what was meant. Put the relation between two things in the verb, as in "A replaces B" or "A causes B", and not in a chain of prepositions and participles such as "the replacement of B by means of A". Use at most one relative clause in a sentence, and never put one inside another. Where the reader has a word for a thing, use the reader's word. Prefer a possessive, "the journey's catalogue", to an `of` phrase, "the catalogue of a journey".

**Pronouns.** Use a pronoun wherever the reader can tell at once what it refers to, because repeating a clear noun makes the prose heavy. Repeat the precise noun wherever `it`, `this`, `that` or `they` could refer to more than one thing, or to an idea instead of a noun. Never end a sentence on the pronoun `it`.

**Requirement words.** Use each requirement word in one meaning, and never swap in a synonym for variety:

| Word               | Meaning                                                                                                   |
|--------------------|-----------------------------------------------------------------------------------------------------------|
| must, must not     | a mandatory requirement or prohibition: law, policy, or a condition without which the thing does not work |
| should, should not | recommended, where a justified exception is possible and the text gives the reason                        |
| may                | permitted                                                                                                 |
| can, cannot        | possible or capable, a statement of fact                                                                  |
| will               | the future or a commitment, never a requirement                                                           |

Use `shall` only in a standard or contract that defines the word. To forbid, write `must not`, never `may not`. For a prediction, write "is designed to" or give the test result, never `should`.

**Tense.** Describe behaviour in the present tense: "the service returns 404". Describe an option that is not built in the conditional: "the cookie design would hold the roles". Keep `will` for a commitment or a future event: "the team will migrate in March".

**Terms.** Introduce an unfamiliar term before the text relies on the term. Expand an abbreviation on first use, unless the named reader knows the abbreviation. Leave a registered workspace name unexpanded, and never invent an expansion. Give one thing one name throughout a document and the documents that go with it: a "consignment" in the first paragraph is not a "shipment" in the third. Keep internal labels such as "Path A" and working codes such as "A-01" out of prose the reader sees, and state the assumption or option in words where the text needs one. Write "for example", "that is" and "and so on" in place of `e.g.`, `i.e.` and `etc.` Spell in British English, and keep the spelling of code and product names in code font. Use no negative contraction anywhere, and no contraction at all in a formal document. Write a range with "to".

**Capitals, numbers and dates.** Write text in sentence case, except proper nouns and headings. Write one as a word and 2 upwards as numerals, with a comma above 999 and percentages as `50%`. Write dates as `4 June 2017`. Use the 24-hour clock in technical content (`14:30 UTC`) and the 12-hour form in content for users (`2:30pm`). Use inclusive terms, such as "disabled people", and the singular "they" where gender is unknown.

### Before and After: Sentences

Before:

> A tenant can use the application only through a local service principal residing in that tenant, and that principal holds the tenant's grants.

After:

> Using the application in a tenant requires a local service principal for the application to be present within that tenant. Access to the tenant's resources requires grants to be assigned to the principal.

The move: separate two requirements that the compressed sentence made look like one.

Before:

> The gateway gets a short-lived token and presents it as the assertion. The same access token comes back.

After:

> The gateway presents the Cognito token as the client assertion. Entra validates the assertion against the federated credential and returns an access token, which the gateway can present as authentication in the request to the Azure Service Bus.

The move: replace the shorthand with the exact noun and name the actor at each step.

Before:

> The gateway receives each event from the queue. The gateway checks the event against its schema, and the gateway forwards a valid event to Service Bus.

After:

> The gateway receives each event from the queue. It checks the event against its schema and forwards a valid event to the Service Bus.

The move: use a pronoun where the reader can tell at once what it refers to, and keep the noun only where a pronoun could point at two things.

Before:

> The consumer receives an event. It reads the event ID. It checks the database. It processes the event. It stores the result.

After:

> When the consumer receives an event, it checks the database for the event ID. A matching ID means the event has already been processed, so the consumer acknowledges the duplicate. Otherwise, it processes the event and stores the result with the ID.

The move: put the condition first, name the relation between steps, and vary sentence length while the sequence stays clear.

## Document Types

Choose the document type from the reader's job, and give each self-contained section one job.

| Type | Reader's Job | Person, Mode and Tense | Structure |
| --- | --- | --- | --- |
| A how-to | complete a task the reader already understands | the imperative for every step, assuming competence, present tense | prerequisites, then numbered steps towards the goal |
| A reference page | look up a fact | third person, neutral and declarative, present tense | tables and lists that mirror the subject, complete and predictable |
| An explanation | understand how or why | third person, discursive, present tense for behaviour and the conditional for options not built | connected prose under concrete headings, comparing alternatives and trade-offs |
| A decision record | learn what was decided, why, and with which consequences | third person, declarative, present tense for context and requirements, past tense for the decision taken, `will` only for a commitment | the repository's established headings, with status, context, decision and consequences |

Keep material that serves a different reader job out of the main flow: an explanation moves its runnable steps into a how-to.

**Decision records.** In a decision record, state the requirements the decision meets and the decision itself, not the design that follows from the decision. Put a data model or a backend mechanism in the design document. A decision record describes one point in time: write a new record to supersede an old one, and record the lifecycle in the status line.

**Snapshots.** Write every other document as a snapshot of current understanding, not as a changelog. When a decision or correction arrives, rewrite the affected passage as if the document had held that knowledge from the start. Put no dated annotation such as `**Update (May 2026):**` in a document, and no revision narrative, corrective addendum, version history, note to a co-author or status column. Commit messages, pull request bodies, changelogs and release notes are the places that record change.

**Slides and explainers.** Show the design as intended at release in a slide deck or an explainer. Put gaps in the present implementation in findings and tickets, not on a slide.

**Other kinds.** Each of these kinds has a fixed content:

| Kind | Contents |
| --- | --- |
| Design document | purpose and scope, context and constraints, the design, decisions and trade-offs, operational concerns, security and data protection, and open questions |
| API, configuration or CLI reference | one structure for every item: name, purpose, parameters with type and default, an example and errors |
| README | the thing, its users, and the fewest steps to run it |
| Release notes | one line per change, grouped as added, changed, fixed, removed and security, with any reader action first |
| Message about technical work | the point first, then the request stated plainly |
| Warning | placed immediately before the step it governs |

### Before and After: Document Types

Before, in a how-to:

> Credential rotation is the process by which an old credential is replaced. You should first create a new credential. After that, update the service and check it before deleting the old credential.

After:

> Create the replacement credential. Update the service to use the replacement, then confirm that authentication succeeds. Delete the old credential only after the check passes.

The move: drop background the reader knows, write each step in the imperative, and keep the safety condition beside its action.

Before, in a decision record:

> The team will store sessions in Redis under a `session:{id}` key holding the tokens, claims and active organisation, with a 30-minute expiry refreshed on each request.

After:

> Any instance of the service must be able to read a session within one request. Sign-out must end the session on every journey. An idle session must end after 30 minutes. The team chose a shared server-side session store.

The move: state the requirements and the decision, and leave the record layout to the design document.

Before, in a design page:

> The proxy forwards requests to the journeys. **Resolution (3 September 2026):** the platform router replaces the proxy.

After:

> The platform router forwards requests to the journeys.

The move: rewrite the passage as the current design and let version control hold the history.

## Forms

**Choosing a form.** Prose is the default. Use another form only when it gives this reader something prose does not, and be able to say what that is.

| Form             | Use                                                                                 |
|------------------|-------------------------------------------------------------------------------------|
| Prose            | a connected argument, an explanation of cause, or a rule with its qualification     |
| Numbered list    | steps the reader takes, or a mechanism in order, with the actor named in every step |
| Bullets          | criteria, options or facts whose order does not matter                              |
| Table            | several items the reader compares across the same fields                            |
| Sequence diagram | ordered exchanges between named components, with their conditions                   |
| Flow diagram     | decisions and their branches                                                        |
| State diagram    | one entity's lifecycle                                                              |

**Prose beside a table or diagram.** Use the prose beside a table or diagram for what the reader cannot read off it: consequences, limits and open questions. Never restate rows or arrows in the prose. Draw a diagram only from actors, steps and conditions the text states. Write diagram notes as numbered points, one line each, in the markdown under the image, never as a block of notes inside the image.

**Headings and labels.** Name a heading's topic as a concrete noun phrase in title case, such as "Session Assertion Checks", never as a generic word such as "Overview". Make the heading the shortest plain noun label for the topic, such as "Consumer Contract", "INS Domain Boundaries" or "Limitations", with no article, no -ing form and no qualifier such as "Known". Never write a heading as a question or a half-question that opens on what, how, which, when, where, why, who or whether. This standard calls that form FAQ voice. The same rules bind table headers, captions, bold lead-ins and list items that introduce content. Never open a sentence in FAQ voice either, though a question embedded as the object of a verb stays: "INS checks which organisation is active". End a table header on a noun, such as "Source", never on a preposition. Prefer a bold lead-in to a deeper heading level, and keep the structure in proportion to the page. Open a page on a sentence that states its point, never on one that announces the material.

**Links.** Put at most two links in a page. Leave out a pointer sentence such as "as the session page sets out", and restate the one-line fact where the sentence needs the fact. Check that every link resolves. Never cite a gitignored file or evidence that exists only on one machine, and state the supporting fact in the text instead.

**Code.** Put property names, code values, filenames, paths, types, commands, HTTP status codes and schema keywords in code font, and a word discussed as an example too. Put JSON with `//` comments in an unlabelled fence, and pure JSON in a `json` fence. Where a schema definition and an instance property both matter, name both: `gbnAgTradeProduct` `$def` (property: `specifiedTradeProduct[]`).

**Line layout and punctuation.** Write one line per paragraph in every file, and hard wrap at 72 columns only in a commit message body. Use straight quotes. Where a draft breaks a sentence with an em dash, a spaced en dash or a spaced hyphen, use a full stop, a comma or a colon instead. Use no semicolon in body text, and use a colon to introduce a list. Write "not applicable", "no data" or "not used" in place of `N/A`.

### Before and After: Forms

Before:

> The client tries a request 3 times. The client waits 2 seconds between attempts. Each request times out after 10 seconds.

After:

| Setting | Value |
| --- | --- |
| Maximum attempts | 3 |
| Delay between attempts | 2 seconds |
| Request timeout | 10 seconds |

The move: use a table when the reader compares several facts with the same fields.

Before, beside a sequence diagram of a page request:

> The frontend sends the request to the front door. The front door calls the session API. The session API returns the session to the front door.

After:

> A request without a live session never reaches a journey backend. If the session API is unavailable, the front door refuses every signed-in request until the API recovers.

The move: state the consequences and limits the diagram cannot show, and leave the arrows to the diagram.

Before:

> `## What a journey backend checks`

After:

> `## Session Assertions`

The move: name the topic as a noun phrase in title case.
