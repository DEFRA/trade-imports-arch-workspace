# House Writing Standard

A plan settles what a document says, and this standard settles how the document says each point. The standard has five parts: tone of voice, paragraphs, sentences, document types and forms. Each part states the drafting rules and closes with before-and-after pairs. A rule here stays general, and a rule that serves one document set belongs in that set's plan.

## Tone of Voice

Technical text exists so that someone can act on the text: run the command, make the decision, operate the service. The register is formal, explanatory and deliberate. A document carries no enthusiasm on the organisation's behalf, no idiom, no humour and no chat. Natural prose is preferred over compressed idiom: each point is a complete sentence with a named actor, never a shorthand phrase the reader has to expand.

**Claims.** A document states facts, mechanisms and consequences, and the comparison carries the judgement. A judgement of ease, cost or safety (`easy`, `cheap`, `safe`, `simple`) gives way to the fact behind the judgement, and a ranking the text does not ground (`a nuisance`, `more serious`) goes. A colouring adverb (`still`, `merely`, `even`) gives way to the plain fact. `only` before a noun is a restriction and stays. A slogan, an antithesis or a tricolon built for effect becomes the statement of the mechanism.

**Attribution.** A position held by another team is written as a statement, followed by the document, version and date that record the position. Where the only source is a conversation, the text says so and gives the date, or carries a placeholder in square brackets for the author, never reported speech such as `X confirmed`. The author's own judgement is labelled as a judgement: "The architecture team's position is".

**Absolutes and time.** An absolute (`secure`, `always`, `never`, `fastest`) states the property and its limit. A timebound word (`currently`, `now`, `new`, `soon`, `latest`) gives way to the version or the date, which still hold when the page is read a year later.

**Standard patterns.** A passage that follows a standard pattern opens with plain framing, such as "The following is the standard authorisation code flow", and then names the part specific to the system. Section numbers of standards are not scattered through the text.

**Worst case.** A document states the worst case, not the typical case. Each assumption is written with its consequence if the assumption is false, before the mechanism that depends on the assumption. Where a correct statement invites a likely false inference, the text states what does not happen.

**Actors and readers.** Software runs and people decide. A service, pipeline or repository cannot choose, want, ask or wait for anything. Where one name means both a team and a service, the text writes "the TDS team" when people act and "the TDS service" when software acts. A human document names the actor or the reader's role and never addresses the reader as `you`. A how-to step takes the imperative: "Run the migration". Instructions written for an AI agent may address the agent as `you`.

### Before and After: Tone of Voice

Before:

> The platform team said they do not provide integration.

After:

> Integration between source systems and the data catalogue is outside the platform team's remit, as the team's service definition records [version and date].

The move: write the position as a statement with its source, and leave a placeholder where the source is unknown.

Before:

> INS sends, TDS receives, nobody owns the middle.

After:

> INS would own the sending workflow and TDS the receiving API. No team would own the integration between them.

The move: replace the slogan with the mechanism it gestured at.

Before:

> The API is fully secure and renewal is seamless.

After:

> The API encrypts data in transit with TLS 1.3. Renewal passes without a prompt while the provider session is live. If the provider session has lapsed, the user signs in again.

The move: give the absolute its limit, and write the worst case beside the typical one.

## Paragraphs

**One job.** A paragraph has one identifiable job, which may involve several related ideas. A paragraph of more than about five sentences is a prompt to check for a second job. Where the reader needs to tell two jobs apart, the paragraph breaks at the seam between them. A long paragraph on one job stays long.

**The claim first.** The first sentence states the claim the rest of the paragraph supports, and the later sentences give the mechanism, the evidence or the conditions. The governing thought does the same for the sections and each section's point for its paragraphs, so a reader who stops at any level holds a true picture with less detail.

**Order.** An explanatory paragraph moves from claim to mechanism to consequence when the material supports that order. A reference entry or a procedural step keeps the order its subject sets.

**Joins.** Each paragraph begins where the previous paragraph left the reader. A sentence that carries the reader between points is part of the argument and stays.

**Qualifications.** A rule stays beside its necessary qualification. Exceptions are never scattered across later sections, where a reader who stops early takes the rule as unqualified.

**One home.** A rule or fact with a home elsewhere in the document is not restated where an instance of the rule occurs. A one-line fact may repeat where a sentence needs the fact.

**Finished.** A paragraph is finished when its point is conveyed in a series of simple, direct sentences. Adding more would not improve the point, and taking anything away would remove useful meaning. Clarity comes from simple language, never from simplifying the content, and every claim keeps its precision.

### Before and After: Paragraphs

Before:

> The consumer reads each event from the queue. The broker may deliver an event more than once after a timeout. The consumer stores each event ID with its result in one database transaction. As a result, a redelivered event does not repeat the work.

After:

> A redelivered event does not repeat the consumer's work. The broker may deliver an event more than once after a timeout, so the consumer stores each event ID with the event's result in one database transaction. A redelivered event finds its ID already stored, and the consumer acknowledges the duplicate without processing the event again.

The move: open on the claim the paragraph supports, then give the mechanism that makes the claim true.

Before:

> A session lasts eight hours. The session record holds the tokens and the active organisation. The front door reads the record on every request. A session also ends after 30 minutes without a request.

After:

> A session lasts eight hours, and ends earlier after 30 minutes without a request. The session record holds the tokens and the active organisation, and the front door reads the record on every request.

The move: keep the qualification beside the rule the qualification limits.

## Sentences

**Actor and verb.** The actor is the subject and the action is the verb: "TIG validates the message", not "message validation takes place in TIG". Where the actor is unknown, irrelevant or whichever component handles the request, the passive puts the thing the reader tracks in the subject, and no actor is invented. The verb names the operation, such as runs, creates, connects or sends a request to, never a slang verb. A noun stack is unpacked into a clause that names the relation: "configuration that controls access between tenants", not "cross-tenant access control configuration".

**Known before new.** A sentence begins where the previous sentence left the reader, then advances the point.

**Condition first.** A condition comes before the action or information the condition governs, so a reader the condition excludes can stop reading. `if`, `only if`, `unless` and `after` are not interchangeable.

**One claim.** Each sentence carries one claim. A sentence over 25 words is a prompt to check whether a colleague could restate the sentence after one reading, and a longer sentence that passes stays as written. Sentence length and openings vary, so the prose does not read as mechanical. The subject stays the same while the text describes one mechanism, and changes when the topic changes. Cause, sequence and dependency take the words that name them, such as `because`, `when`, `so` and `therefore`.

**Write it forward.** Each sentence is written as the writer would say the sentence to a reader who asked what was meant. The relation goes in the verb, as in "A replaces B" or "A causes B", never in stacked prepositions and participles. A sentence holds one relative clause at most, never one inside another. The reader's own term is used where the reader knows the term. A possessive, such as "the journey's catalogue", is preferred to an `of` phrase, such as "the catalogue of a journey".

**Pronouns.** A pronoun is the default wherever the reader can recover its referent at once, because repeating a clear noun makes the prose heavy. The precise noun is repeated wherever `it`, `this`, `that` or `they` could refer to more than one thing, or to an idea instead of a noun. A sentence never ends on the pronoun `it`.

**Requirement words.** Each requirement word carries one meaning, and no synonym replaces the word for variety:

| Word | Meaning |
| --- | --- |
| must, must not | a mandatory requirement or prohibition: law, policy, or a condition without which the thing does not work |
| should, should not | recommended, where a justified exception is possible and the text gives the reason |
| may | permitted |
| can, cannot | possible or capable, a statement of fact |
| will | the future or a commitment, never a requirement |

`shall` appears only in a standard or contract that defines the word. `must not` forbids, never `may not`. A prediction takes "is designed to" or the test result, never `should`.

**Tense.** Behaviour takes the present tense: "the service returns 404". An option that is not built takes the conditional: "the cookie design would hold the roles". `will` is kept for a commitment or a future event: "the team will migrate in March".

**Terms.** An unfamiliar term is introduced before the text relies on the term. An abbreviation is expanded on first use unless the named reader knows the abbreviation. A registered workspace name stays unexpanded, and an expansion is never invented. One thing has one name throughout a document set: a "consignment" in the first paragraph is not a "shipment" in the third. Reader-facing prose carries no internal label such as "Path A" and no working code such as "A-01", and states the assumption or option in words where the text needs one. "For example", "that is" and "and so on" replace e.g., i.e. and etc. Spelling is British, while code and product names keep their own spelling in code font. No negative contraction appears anywhere, and a formal document has no contraction. A range takes "to".

**Capitals, numbers and dates.** Text is in sentence case except proper nouns and headings. One is a word, and 2 upwards are numerals, with commas above 999 and percentages as `50%`. Dates read `4 June 2017`. Technical content uses the 24-hour clock (`14:30 UTC`) and user-facing content the 12-hour form (`2:30pm`). Inclusive terms apply: "disabled people", and singular "they" where gender is unknown.

### Before and After: Sentences

Before:

> A tenant can use the application only through a local service principal residing in that tenant, and that principal holds the tenant's grants.

After:

> Using the application in a tenant requires a local service principal residing there. Access to the tenant's resources requires grants held by that principal.

The move: separate two requirements that the compressed sentence made look like one.

Before:

> The gateway gets a short-lived token and presents it as the assertion. The same access token comes back.

After:

> The gateway presents the Cognito token as the client assertion. Entra validates the assertion against the federated credential and returns an access token, which the gateway sends to Service Bus.

The move: replace the shorthand with the exact noun and name the actor at each step.

Before:

> The gateway receives each event from the queue. The gateway checks the event against its schema, and the gateway forwards a valid event to Service Bus.

After:

> The gateway receives each event from the queue. It checks the event against its schema and forwards a valid event to Service Bus.

The move: use a pronoun where the reader recovers the referent at once, and keep the noun only where a pronoun could point at two things.

Before:

> The consumer receives an event. It reads the event ID. It checks the database. It processes the event. It stores the result.

After:

> When the consumer receives an event, it checks the database for the event ID. A matching ID means the event has already been processed, so the consumer acknowledges the duplicate. Otherwise, it processes the event and stores the result with the ID.

The move: put the condition first, name the relation between steps, and vary sentence length while the sequence stays easy to follow.

## Document Types

The document type follows the reader's job, and each self-contained section has one job.

| Type | Reader's Job | Person, Mode and Tense | Structure |
| --- | --- | --- | --- |
| A how-to | complete a task the reader already understands | the imperative for every step, assuming competence, present tense | prerequisites, then numbered steps towards the goal |
| A reference page | look up a fact | third person, neutral and declarative, present tense | tables and lists that mirror the subject, complete and predictable |
| An explanation | understand how or why | third person, discursive, present tense for behaviour and the conditional for options not built | connected prose under concrete headings, comparing alternatives and trade-offs |
| A decision record | learn what was decided, why, and with which consequences | third person, declarative, present tense for context and requirements, past tense for the decision taken, `will` only for a commitment | the repository's established headings, with status, context, decision and consequences |

Material that serves a different reader job stays out of the main flow, so an explanation moves runnable steps into a how-to.

**Decision records.** A decision record states the requirements the decision meets and the decision itself, not the design that follows. A data model or a backend mechanism belongs in the design document. A decision record is a point-in-time record: a new record supersedes the old one, and the status line records the lifecycle.

**Snapshots.** Every other document is a snapshot of current understanding, not a changelog. When a decision or correction arrives, the affected passage is rewritten as if the document had held that knowledge from the start. A document carries no dated annotation such as `**Update (May 2026):**`, no revision narrative, no corrective addendum, no version history, no note to a co-author and no status column. Commit messages, pull request bodies, changelogs and release notes record change as their content.

**Slides and explainers.** A slide deck or an explainer shows the intended design at release. Gaps in the present implementation belong in findings and tickets, not on a slide.

**Other kinds.** A design document gives purpose and scope, context and constraints, the design, decisions and trade-offs, operational concerns, security and data protection, and open questions. An API, configuration or CLI reference gives every item one structure: name, purpose, parameters with type and default, an example and errors. A README states what the thing is, who uses the thing and how to run the thing in the fewest steps. Release notes give one line per change, grouped as added, changed, fixed, removed and security, with any reader action first. A message about technical work gives the point first and the request plainly. A warning goes immediately before the step the warning governs.

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

**Choosing a form.** Prose carries a connected argument, a causal explanation or a qualification. A numbered list carries reader actions and ordered mechanisms in which every step names its actor. Bullets carry discrete criteria, options or facts whose order carries no meaning. A table serves a reader who compares several items across the same fields. A diagram serves a sequence or causal chain between named components, with its conditions: a sequence diagram for ordered exchanges, a flow diagram for decisions, a state diagram for one entity's lifecycle. A heading, list, table or diagram is added only when the writer can name what this reader gains over prose.

**Prose beside a table or diagram.** The prose states what the reader cannot read off the table or the diagram: consequences, limits and open questions. The prose never restates rows or arrows. A diagram is drawn only from stated actors, steps and conditions. Diagram notes are numbered points keyed one line each in the markdown under the image, never a block of notes inside the image.

**Headings and labels.** A heading names its topic as a concrete noun phrase in title case, such as "Session Assertion Checks", never a generic word such as "Overview". The heading is the shortest plain noun label for the topic, such as "Consumer Contract", "INS Domain Boundaries" or "Limitations", with no articles, no -ing forms and no qualifiers such as "Known". A heading is never a question or a half-question opening on what, how, which, when, where, why, who or whether, a form called FAQ voice. The rule binds table headers, captions, bold lead-ins and list items that introduce content. A sentence never opens in FAQ voice either, while an embedded question as the object of a verb stays: "INS checks which organisation is active". A table header ends on a noun, such as "Source", never on a preposition. A bold lead-in is preferred to a deeper heading level, and structure stays in proportion to the page. A page opens on a sentence that states the point, never one that announces the material.

**Links.** A page holds at most two links. A pointer sentence, such as "as the session page sets out", is left out, and a one-line fact is restated where the sentence needs the fact. Every link resolves. A page never cites a gitignored file or local-only evidence, and states the supporting fact inline instead.

**Code.** Property names, code values, filenames, paths, types, commands, HTTP status codes and schema keywords take code font, and so does a word discussed as an example. JSON with `//` comments takes an unlabelled fence, and pure JSON a `json` fence. Where a schema definition and an instance property both matter, the text names both: `gbnAgTradeProduct` `$def` (property: `specifiedTradeProduct[]`).

**Line layout and punctuation.** Every file holds one line per paragraph. Hard wrapping at 72 columns is for commit message bodies only. Quotes are straight, and a full stop, comma or colon replaces an em dash, a spaced en dash or a spaced hyphen used as a sentence break. Body text holds no semicolon, and a colon introduces a list. `N/A` gives way to "not applicable", "no data" or "not used".

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

> `## Session Assertion Checks`

The move: name the topic as a noun phrase in title case.
