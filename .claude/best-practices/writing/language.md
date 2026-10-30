# Workspace language and editorial style

This guide is the authority for prose voice, grammar, terminology and formatting in human-facing technical documents. It takes the rules the international technical writing standards and [GOV.UK clear-language guidance](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/writing-guidelines/clear-language/) share, resolved in favour of British English, and adds the workspace's own rules. The Gate notes show which rules `check-prose.sh` enforces mechanically. The rest are judgement, applied while drafting and checked in review.

## Voice and tone

Technical text exists so that someone can act on it: run the command, make the decision, operate the service, pass the audit. Every rule in this guide serves that purpose. The register is formal, explanatory and deliberate. A document states facts, mechanisms and consequences and lets the comparison carry the judgement. It carries no enthusiasm on the organisation's behalf, no idiom, no humour and no chat.

- Lead with the point.
- Use plain English in the reader's vocabulary. A technical term is correct when it is the exact term for the concept. Jargon is a word used because it sounds expert where a plain word would do.
- State facts rather than praising or judging them.
- Name concrete actors, mechanisms, properties and values.
- Introduce an unfamiliar term before the text relies on the term.
- Match the person and mode to the document mode in the editorial skill's [document-types.md](../../skills/editorial/references/document-types.md).
- Name the reader's role or the actor instead of addressing the reader as `you`. A how-to or tutorial step takes the imperative: "Run the migration", not `You should run the migration`. Instructions written for an AI agent may address the agent as `you`, and the gate exempts files under `.claude/` and files named `CLAUDE.md` or `AGENTS.md` from that row.
- Software runs and people decide. A team can decide, build, own and agree. A service, pipeline, repository or estate cannot choose, want, ask, wait for or get confused. Where a name such as "TDS" means both the team and the service, write "the TDS team" when people act and "the TDS service" when software does.

### Register

A sentence whose framing obscures the behaviour, or introduces a judgement the passage does not support, is rewritten as the consequence the passage supports, or removed when no supported consequence remains. A sentence that states the passage's scope, or carries the reader between points, is not a defect for framing its material. Take the opener of a comparison of two session designs: "The second difference is renewal, and it is the one a user will notice". The passage supports a consequence, so the opener is rewritten around that consequence, and every condition the passage puts on that consequence is kept in the rewrite. Here the passage says that a renewal redirect passes without a prompt while a session in the provider's chain is live, and that a user returning after a longer pause meets a lapsed provider session, which the provider re-establishes without a prompt. Because that re-establishment is a fresh provider session, a user who holds more than one organisation sees the organisation picker. The rewrite therefore reads along the lines of "In the session-service design the user sees nothing of renewal. In the cookie design a renewal redirect passes silently while the provider's session is live. When that session has lapsed, the provider re-establishes the user in a fresh provider session, so a user who holds more than one organisation meets the organisation picker again" (an illustration built from the passage, not a wording the author adopted). Dropping the lapse and the fresh session would turn a conditional outcome into one the reader expects at every renewal, which is the failure this rule exists to prevent. A figurative pivot such as "That silence has an edge" is removed and the limit the pivot gestured at is stated directly. A ranking the passage does not ground ("a nuisance", "more serious", "for the worse") is a judgement standing in for a fact and goes under "Just Enough" below. A comparison the passage grounds in a stated fact stays. For a pronoun or demonstrative standing for a named thing, see "References and pronouns".

Loaded adverbs and editorial asides that argue rather than describe go the same way. `still`, `only`, `merely` and `even` used to colour a claim (`INS still builds a receiver`, `TDS merely polls the queue`) are removed or replaced by the fact ("INS also builds a receiver", "TDS polls the queue"). The restriction before a noun is a different use and stays: "only the front door holds the signing key". A slogan, an antithesis or a tricolon built for effect (`INS sends, TDS receives, nobody owns the middle`) becomes the statement of the mechanism: "INS would own the sending workflow and TDS the receiving API. No team would own the integration between them." Gate: judgement. The gate reports no register pattern yet.

## Sentences and paragraphs

A sentence over 25 words is a prompt to check whether the reader can follow the sentence. Length is never the defect on its own, and a 30-word sentence a colleague can restate after one reading stays as written. Keep related clauses together when splitting them would hide their relationship.

- Give each sentence one clear job, but vary sentence length and opening structure so the prose does not become mechanical.
- Front-load important information.
- Put established context before new information. Begin where the previous sentence left the reader, then advance the point.
- Keep the grammatical subject stable while describing one mechanism. Change it when the focus changes.
- Name cause, sequence and dependency with words such as "because", "when", "so" and "therefore" when they express the actual relationship.
- Write behaviour in the present tense: "the service returns 404", not "the service will return 404". Describe an option that is not built in the conditional ("the cookie design would hold the roles"), so the reader knows which design is proposed and which is hypothetical. Keep "will" for a commitment or a future event: "the team will migrate in March". Gate: judgement.
- Let an explanatory paragraph move from claim to mechanism to consequence when the material supports that progression. Do not force it on reference entries or procedural steps.
- Keep prose paragraphs focused. If a paragraph needs more than about 5 sentences, check whether it contains more than one topic. A paragraph has one identifiable job, which may involve several related ideas. Where the reader needs to distinguish two jobs, break at the seam and change no word. A long paragraph on one job stays: length alone is never the defect, and a boundary-only edit that leaves the reader's difficulty in place is not a repair. In the calibration rounds on the INS trade-offs pages, six long paragraphs split at their topic seams were accepted as readability improvements, including three whose wording was rejected on other grounds.
- Put a condition before the action or information it governs, so that a reader the condition excludes can stop reading. Reorder when the reader would otherwise miss the applicability or have to re-read to find what the condition binds. Keep `if`, `only if`, `unless` and `after` distinct: they are not interchangeable, and a moved condition governs exactly what it governed before. A clear contrast or an emphasis that already works stays where it is. When the text does not settle which action a trailing condition governs, the scope is a question for the author, not a guess. Example from the rounds: a condition moved before the table row it governs, accepted from both reviewers.
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

The same rule applies when a pronoun refers to an idea rather than a nearby noun. In `The front door handles it`, the reader must work out what `it` means. Write "The front door handles session management".

The test is the reader's recovery. Replace a pronoun or demonstrative standing for a named component ("that design", "it" for a verdict or a mechanism) with the name when the reader cannot recover the referent at once and without error. A pronoun whose referent is the one thing the previous clause named needs no change. Write the name only when the text establishes which thing is meant. When the text does not settle the antecedent, the antecedent is a question for the author, never a guessed name. In the calibration rounds the author rejected "that design" where the design had a name, and "it" for a thing. Gate: FAIL on a sentence that ends on "it".

### Verbs and noun stacks

Prefer a concrete actor plus verb to an abstract noun plus weak verb: "TIG validates the message", not "message validation takes place in TIG".

Words ending in `-ion` and `-ment` often turn an action into a nominalisation. Treat the ending as a prompt to check the sentence, not as a ban. Keep the noun when it names a real concept. Restore the actor and verb when it hides what happens.

Operational slang hides the operation and does not translate: `fires`, `kicks off`, `spins up`, `wires up`, `sits behind`, `hits an endpoint`, `picks up`, `goes down`. Write the verb that names what the system does: runs, starts, creates, connects, is served by, sends a request to, reads, is unavailable. Gate: FAIL or WARN on the common forms.

Unpack dense noun stacks into clauses that name the relationship: "configuration that controls access between tenants", not "cross-tenant access control configuration". A run of such nouns standing for a page's contents is the inventory opener ("Headings, lists and tables"). The repair is a sentence per job, each with a verb.

## Reader-pays compression

Reader-pays compression saves the writer words but makes the reader reconstruct the meaning. The test is whether a colleague can read the sentence aloud once and restate it accurately. If they need private context or have to reverse the grammar, unpack the sentence.

### Write it forward

These 4 rules are for drafting. Write each sentence as it would be said aloud to a reader who asked what was meant.

- Put the actor first when the document has one and the reader needs to know which actor. Where the actor is whichever component happens to handle the request, use the passive and start on the thing the reader is tracking.
- Carry the relation in the verb. Where the fact is "A comes from B", "A replaces B" or "A causes B", write that verb. Do not assemble the relation out of stacked prepositions and participles.
- Use one relative clause per sentence, and never one inside another.
- Use the reader's own term where the reader brief says they know the term. Walking through an example is the long path when the term is the short one.

The named compression patterns live in [review-brief.md](../../skills/editorial/references/review-brief.md), "Compression patterns". They are recognition tests for finished prose. A writer who holds them while drafting produces defensive sentences.

The metaphor candidates the gate warns on are rows in "Words to avoid or examine". A literal technical use may stay. A figurative use must be rewritten around the mechanism, not swapped for another metaphor.

## Just Enough

The editorial process aims for technical writing that is concise, precise and clear. Clarity comes from simple language: plain words, and short direct sentences that each carry one claim. Clarity never comes from simplifying the content, and every claim keeps its precision. Good editing removes noise as much as it adds signal. Clarifying and distilling pull against each other: unpacking a dense sentence into simple ones adds words, and distilling removes them.

A paragraph is finished when its point is conveyed in a series of simple, direct sentences. Adding more would not improve the point, and taking anything away would remove useful meaning. Editing is the pursuit of just enough.

AI editors tend to add, so an addition carries the burden of proof. Each addition says what it makes clear that the paragraph did not. A removal needs no reason unless it takes away useful meaning. A detail that drowns the paragraph's point is noise and may go. The change record then says which information the reader no longer gets.

Under both intents, a dense sentence is first unpacked into simple sentences with explain and rewrite (`~/trade-imports-arch-workspace/.claude/skills/editorial/references/explain-and-rewrite.md`). Under distil, whole units are then removed, and each paragraph ends no longer than its source. Under clarify, a rewrite keeps every claim of the unit and may grow only in the two cases the review brief names (`~/trade-imports-arch-workspace/.claude/skills/editorial/references/review-brief.md`, "Rules for every reviewer"). Under either intent, a rewrite never adds technical detail the source does not hold.

Before adding to a passage, ask what the passage is trying to establish and whether the addition would materially strengthen that point. A question that is easy to raise ("who decides this?", "what is the process?") but whose answer would not strengthen the point is a tangent: answering the question adds text and dilutes the central material. Resolve a tangent by removing the text that invites the question, not by answering the question.

Removing a whole unit and compressing a unit that stays are different moves. Removal is always available. Compression is not a repair, and a sentence squeezed to save 2 words has been broken rather than shortened.

Remove the sentence, bullet or paragraph that carries the defect. When the unit has to stay, rewrite the sentence so the defective part is gone. Under clarify, the rewrite may run longer only in the two cases the review brief names, saying what each addition makes clear. Under distil, the paragraph never ends longer than its source. Do not cut a fragment out of a sentence and leave the rest standing, which strands a subject or breaks the line. Qualify or expand only when neither deletion nor rewording works, and then name what the reader would otherwise infer wrongly or be unable to verify. Keep the connective prose that carries the reader between points.

The following go by default, and the removal is the whole fix:

- A judgement standing in for a fact ("cheap", "easy", "safe", "simple"), and a ranking the passage does not ground ("a nuisance", "more serious", "for the worse"). State the fact when the passage needs one. Otherwise cut the judgement. Never qualify the judgement, and never restate a ranking in other words. A comparison the passage grounds in a stated fact stays.
- A description of a mechanism the design has not decided. Keep only the statement that the design must handle the consideration.
- A pointer or cross-reference. Pointers atrophy as their targets move, get renamed or vanish, so keep one only when the reader could not find the reason behind a rule without the pointer. A one-line fact may be restated in the pointer's place.
- The document's own tallies (how many families, rows, updates or decisions). The reader needs the things, not the count, and the count is what goes wrong when the things change.
- Filler that carries no information: `simply`, `easily`, `just`, `obviously`, `basically`, `actually`, `really`, `very`, `quite`, `of course`, `note that`, `it is worth noting`, `it is important to`, `please`. `simply` and `easily` also insult the reader who finds the step hard. Gate: WARN on the common forms.

### Paragraph Restatement Test

A paragraph earns its length by what the reader takes away. Read the paragraph once, then say the paragraph back without looking at the text. Whatever the restatement drops is a removal candidate, because the point survived without that material, which is the evidence the list above already uses for a tangent and for a second justification.

Apply the test to the paragraph rather than to the sentence. Sentence length is governed by "Sentences and paragraphs" above, where length is never the defect on its own. A paragraph is a different unit: the reader holds a paragraph whole, and a sentence the restatement drops was carrying nothing for that reader.

The repair is the removal of each sentence the restatement dropped, one whole sentence at a time. Rewriting the paragraph shorter is not the repair. A condensation restates the surviving material in new words, which makes the editor the author of wording the page never had, and the rule that removing a whole unit and compressing a unit that stays are different moves holds for a paragraph exactly as the rule holds for a sentence.

## The whole document

A document reads as if one author wrote it as a coherent whole. After substantive edits, read each changed paragraph with the paragraph before and after it, and with the page's opening, and check five things:

- every pronoun still resolves
- a fact repeated in the set has one home
- a removed unit stranded no transition
- a diagram and the prose beside it keep the distinct jobs [document-types.md](../../skills/editorial/references/document-types.md) gives them
- the page reads in one voice

The editorial skill's procedure says how a seam problem is handled. Gate: judgement.

## Evidence and attribution

A decision record, design document or specification cites documented positions. "The Data Strategy team said it does not provide integration" is reported speech: it names no document, meeting or date, and the reader cannot check the claim. Write the position as a statement ("integration between source systems and Purview is outside the Data Strategy team's remit"), followed by the document, version and date that record the position. Where the only source is a conversation, say so and date it ("agreed in discussion on 14 May 2026, minuted at [link]"), or leave a placeholder in square brackets for the author. Do not drop the claim and do not present it as established fact. The same applies to "the informal view is", "it was agreed", "we were told", "the general view is" and "X confirmed".

Where a position is the author's own judgement, say so: "EU DP Architecture's position is". A judgement presented as a fact is the commonest way a decision record misleads its readers.

Never invent a fact to fill a gap a rewrite exposes: who "we" are, which version, what "etc" stood for, how to test the change. Put a placeholder in square brackets ("[name the team]") and list the gaps in a short note after the text, or ask the author.

An absolute (`secure`, `guarantees`, `always`, `never`, `fastest`) states the property and its limit instead: "encrypts data in transit with TLS 1.3", not `fully secure`. A timebound word (`currently`, `now`, `new`, `soon`, `recently`, `latest`) gives way to the version or the date, which still hold when the page is read a year later. Gate: WARN on `secure`, `guarantee` and `shall`. The rest is judgement.

## Terms and abbreviations

Use the reader brief to decide which terms need introduction.

- Tokens in [ubiquitous-language.md](ubiquitous-language.md) are workspace proper nouns. Write them as names and leave them unexpanded unless the user explicitly asks for the recorded expansion.
- Explain other unfamiliar abbreviations on first use.
- Do not expand an abbreviation the intended technical audience already knows merely to satisfy a blanket rule.
- Never invent or hypothesise an expansion.
- Replace internal labels such as "Path A", "Phase 2" or "pattern 4" with the domain name of the thing, unless the label is itself part of the artefact being described.
- Use one name for one thing throughout a document set. If it is a "consignment" in the first paragraph it is not a "shipment" in the third.
- Write "for example", "that is", "and so on", "through" and "about" in place of e.g., i.e., etc., via and circa. A screen reader reads "eg" as "egg". Gate: guidance.
- British spelling throughout prose: -ise and -isation, -our, -re, -yse, licence and practice as nouns, double l in modelling and labelled, judgement, artefact. Code, commands, identifiers, API field names, HTTP headers, configuration keys, product names and file names keep their canonical spelling in code font ("set the `color` property to change the text colour"). Quoted text and proper nouns keep their own spelling. Gate: WARN on the American spellings the dry run found in the estate below its threshold; the -ize family is guidance, because the estate's identifiers and quoted standards use that spelling.

Common abbreviations that need no explanation for a general UK audience include BBC, NHS, UK, VAT, PDF and URL. The reader brief may treat technical terms such as API or HTTP as familiar to a particular audience.

## Words to avoid or examine

`~/trade-imports-arch-workspace/.claude/tools/editorial/check-prose.sh` reads the table below each time it runs. A FAIL row blocks the artefact, a WARN row asks the author to judge the actual meaning, and a Guidance row is not checked. Each hit prints its row's repair. A Gate of `FAIL docs` or `WARN docs` applies only to human-facing documents: the gate skips the row for files under a `.claude/` folder and for files named `CLAUDE.md` or `AGENTS.md`, because instructions written for an AI agent may address the agent directly.

To ban or flag a word or phrase, add a row. Put each form in backticks in the Term cell. A trailing `*` matches any ending, so `utilis*` covers every form. Text outside the backticks is a note and is not matched. Matching ignores case and stops at word boundaries. Generic lowercase `portal` also fails, but the script checks that word itself, because "CDP Portal" is a product name and the check depends on case. A rule about sentence shape, such as FAQ voice or the contact clause, is not a word list and lives in the script. Before a new row enters the table, `tier-candidates.sh` counts its hits over the tracked pages: a word with no hits and no literal use becomes FAIL, a word with a literal use or a low count becomes WARN, and a word the estate uses often stays guidance.

| Term | Repair | Gate |
| --- | --- | --- |
| `leverage`, `leverages`, `leveraged`, `leveraging` | use, build on, or name what is reused | FAIL |
| `empower`, `empowers`, `empowered`, `empowering` | let or allow, or state the permission given | FAIL |
| `facilitate`, `facilitates`, `facilitated`, `facilitating` | help or make possible, or name the action | FAIL |
| `utilise`, `utilises`, `utilised`, `utilising`, `utilize`, `utilizes`, `utilized`, `utilizing` | use | FAIL |
| `seamless`, `seamlessly` | state which step the user no longer takes | FAIL |
| `user-friendly` | state what the user can do | FAIL |
| `streamline`, `streamlines`, `streamlined`, `streamlining` | state what was removed or shortened | FAIL |
| `load-bearing` | state what depends on the thing | FAIL |
| `you`, `your`, `yours` | name the actor or the reader's role, or write the step in the imperative | FAIL docs |
| `powerful`, `elegant`, `beautiful`, `effortless*`, `magic*`, `just works`, `cutting-edge`, `bleeding edge`, `state-of-the-art`, `next-generation`, `world-class`, `best-in-class`, `industry-leading`, `game-changing`, `game changer`, `transformative`, `revolutionary`, `revolutionis*`, `revolutioniz*`, `reimagin*`, `turnkey`, `silver bullet`, `blazing fast`, `lightning fast`, `dead simple`, `10x`, `level up`, `take it to the next level`, `unleash*`, `supercharge*`, `turbocharge*`, `delight*`, `a testament to`, `we're excited`, `we are excited`, `we're thrilled`, `we are thrilled`, `the power of`, `feature-rich`, `tapestry`, `vibrant`, `game plan`, `north star` | marketing language: delete, or state the measured fact and its source | FAIL |
| `combat*`, `pledge*`, `disincentivis*`, `incentivis*`, `incentiviz*`, `slim down`, `going forward`, `moving forward`, `one-stop shop`, `ring-fenc*` | state the action and who takes it: from now on, in future, reduce, reserve, name the service | FAIL |
| `touch base`, `sync up`, `catch up`, `circle back`, `loop back`, `low-hanging fruit`, `quick win*`, `boil the ocean`, `move the needle`, `ballpark`, `slam dunk`, `home run`, `in the weeds`, `punt`, `punts`, `punted`, `quarterback`, `heads up`, `heads-up`, `ping me`, `shoot an email`, `shoot me`, `socialis*`, `socializ*`, `productis*`, `productiz*`, `operationalis*`, `operationaliz*`, `dogfooding`, `figure out`, `figures out`, `figured out`, `figuring out`, `normalcy`, `obligate`, `skyrocket` | American workplace idiom: meet, return to, easy change, defer, notice, send an email, share, design, make into a product, internal use, work out, normality, oblige, rise sharply | FAIL |
| `on a daily basis`, `on a weekly basis`, `on a regular basis`, `at this point in time`, `at this time`, `presently`, `in excess of`, `commence*`, `ascertain*`, `per annum`, `it is recommended`, `in terms of` | padding: daily, now or the date, more than, start, find out, a year, we recommend or should, state the relation | FAIL |
| `cuts a tag`, `cuts a release`, `cut a release`, `wires up`, `wired up`, `plumbs in`, `plumbed in`, `bolts on`, `bolted on`, `hooks into`, `hooked into`, `tears down`, `torn down`, `tear down`, `navigate to`, `reboot*` | name the operation: creates a tag, publishes a release, connects, configures, subscribes to, deletes, go to, restart | FAIL |
| `whitelist*`, `blacklist*`, `slave`, `slaves`, `dummy`, `grandfathered`, `man-hours`, `man hours`, `chairman`, `crazy`, `insane`, `blind spot*` | allow list, block list, replica or worker, placeholder, legacy or exempt, work-hours, chair, unreasonable, gap | FAIL |
| `defense`, `offense`, `pretense`, `fill out`, `check a box`, `check the box`, `on the weekend`, `different than`, `gotten`, `cell phone`, `zip code`, `parking lot`, `elevator`, `vacation`, `math`, `cybersecurity`, `percent`, `specialty` | British usage: defence, offence, fill in, tick a box, at the weekend, different from, got, mobile phone, postcode, car park, lift, holiday, maths, cyber security, per cent, speciality | FAIL |
| `for the benefit of`, `has nothing to ask`, `have nothing to ask`, `falls away`, `fall away`, `on the merits`, `goes and fetches`, `go and fetch` | essay idiom: that only X would use, needs no further input from, no longer applies, for the reasons given, fetches | FAIL |
| `deliver`, `delivers`, `delivered`, `delivering` | keep for literal transport or message delivery; otherwise state the actual outcome | WARN |
| `bounds` | keep for mathematical limits or explicit boundary operations; otherwise use determines or constrains | WARN |
| `shape`, `shapes` | keep for literal geometry or data structure; otherwise name the design, proposal, pattern or layout | WARN |
| `robust`, `robustly` | state what withstands retries, redelivery or malformed input | WARN |
| `appropriate`, `appropriately` | state the criterion | WARN |
| `overarching` | name what the thing spans | WARN |
| `foster`, `fosters`, `fostered`, `fostering` | state the action taken | WARN |
| `alone` after a noun | where it restricts the subject ("the front door alone holds"), put only before the noun: "only the front door holds"; keep it for the by-itself sense ("expiry alone ends no provider session") or write "by itself" | WARN |
| `price`, `prices`, `priced`, `ride`, `rides`, `bite`, `bites`, `spend`, `spends`, `spent`, `buy`, `buys`, `kill`, `kills`, `hang on`, `hangs on`, `collapse`, `collapses`, `leak`, `leaks`, `land`, `lands`, `landed`, `foreclose`, `forecloses`, `soften`, `softens`, `softened`, `softening`, `bootstrap`, `bootstraps`, `bootstrapped`, `bootstrapping`, `axis`, `axes`, `posture`, `postures` | metaphor candidate: keep a literal use; rewrite a figurative use around the mechanism, not another metaphor | WARN |
| `held open under`, `argued under`, `its case is made`, `stated below the table`, `collected under`, `point back to`, `points back to` | ledger voice: state the status or pointer in plain words, "that is still an open question (see X)" | WARN |
| `frictionless`, `intuitive`, `mission-critical`, `enterprise-grade`, `future-proof`, `unlock*`, `harness*`, `elevate*`, `introducing`, `say hello to`, `meet the`, `comprehensive`, `best practice*`, `landscape`, `pivotal`, `crucial`, `vital` | hype: keep a literal use (a test harness, a raised privilege, a locked record); otherwise state the measured fact, list what is covered, or name the practice | WARN |
| `agenda`, `collaborate`, `collaborates`, `collaborated`, `collaborating`, `counter`, `counters`, `dialogue`, `focus`, `focuses`, `focused`, `initiate`, `initiates`, `initiated`, `initiating`, `liaise`, `liaises`, `liaising`, `promote`, `promotes`, `promoted`, `promoting`, `hub`, `hubs` | keep a literal use (a meeting agenda, a numeric counter, an input focus, a release promotion, a network hub); otherwise state the action and who takes it: work with, start, speak to | WARN |
| `reach out`, `reaches out`, `reached out`, `reaching out`, `at the end of the day`, `net-net`, `bottom line`, `deep dive`, `deep-dive`, `double-click on`, `drill down`, `drill into`, `dig into`, `bandwidth`, `the ask`, `learnings`, `sunset*`, `bake in`, `baked in`, `bakes in`, `gotcha*`, `a ton of`, `a bunch of`, `pretty much`, `kind of`, `sort of`, `super`, `awesome`, `real quick`, `you guys`, `folks`, `actionable`, `architect` as a verb, `ninja`, `rockstar`, `guru`, `wizard` | American workplace idiom: contact, in short, examine, time or capacity, request, lessons, retire, built in, pitfall, many, delete, specific, design, expert; keep a setup wizard and the job title | WARN |
| `under the hood`, `out of the box`, `out-of-the-box`, `drop-in replacement`, `plug and play`, `plug-and-play`, `go-live`, `big bang`, `pain point*`, `disruptive`, `agnostic`, `holistic`, `synergy`, `paradigm`, `silo`, `silos`, `siloed`, `stakeholder*`, `cadence`, `upcoming`, `ongoing`, `spin up`, `spins up`, `spun up`, `spinning up`, `stand up`, `stands up`, `stood up`, `standing up`, `check out` | internally, by default, compatible without changes (say with what), release date, problem, vendor-independent or whole-system or name the thing, the people it affects, frequency, forthcoming, continuing, create or start, see; keep a git checkout and a person standing | WARN |
| `prior to`, `subsequent to`, `in the event that`, `in respect of`, `with regard to`, `regarding`, `in relation to`, `in accordance with`, `currently`, `a number of`, `numerous`, `the majority of`, `terminate`, `terminates`, `terminated`, `discontinu*`, `assistance`, `modification*`, `the fact that`, `respectively`, `allows you to`, `enables you to`, `lets you`, `allow users to`, `allows users to`, `enable users to`, `enables users to` | padding: before, after, if, about, under, give the date or version, several or the number, most, stop or end (keep a TLS or process termination), help, change, rewrite as two sentences, make the reader the subject | WARN |
| `note that`, `it is worth noting`, `it's worth noting`, `it is important to note`, `importantly`, `notably`, `crucially`, `essentially`, `basically`, `ultimately`, `in summary`, `in conclusion`, `to summarise`, `to summarize`, `not only`, `simply`, `easily`, `obviously`, `very`, `quite`, `really`, `actually`, `of course` | filler: delete and keep the point | WARN |
| `secure`, `secured`, `guarantee`, `guarantees`, `guaranteed`, `shall` | an absolute states the property and its limit ("encrypts data in transit with TLS 1.3"); shall: must, or should, unless a standard defines the word | WARN |
| `stamps`, `stamped`, `pins to`, `pinned to`, `sits retrying`, `sits waiting`, `sits behind`, `sit behind`, `fronts`, `fires`, `fired`, `kicks off`, `kicked off`, `hits an endpoint`, `hits the`, `talks to`, `calls into`, `goes down`, `comes back`, `falls over`, `blows up`, `surfaces`, `surfaced`, `bubbles up`, `bubbled up`, `picks up`, `picked up`, `blocks on`, `hangs off`, `happy path`, `the box`, `the tin`, `the kit`, `chatty`, `noisy` | colloquial technical verb: name the operation (sets, fixes to, is served by, receives requests for, runs, starts, sends a request to, is unavailable, recovers, fails, shows, returns, reads, waits for, the successful case, the server, verbose); keep a timestamp, a pinned version, a physical surface and an event the code fires | WARN |
| `click on`, `click the`, `tap the`, `execute a test`, `perform a test`, `conduct a test`, `launch the`, `launches the`, `shows up`, `pops up` | select, run a test, open, appears; keep a touch screen and a product launch | WARN |
| `sanity check*`, `man-in-the-middle`, `guys` | check or confidence check, on-path attacker, people | WARN |
| `behavior`, `behaviors`, `color`, `colors`, `favor`, `favorite`, `honor`, `labor`, `neighbor`, `center`, `centers`, `centered`, `liter`, `fiber`, `modeling`, `modeled`, `labeled`, `labeling`, `canceled`, `canceling`, `traveling`, `signaling`, `leveled`, `totaling`, `fulfill`, `fulfills`, `enroll`, `enrolls`, `enrollment`, `installment`, `skillful`, `catalog`, `catalogs`, `analog`, `program`, `period`, `parentheses`, `parenthesis`, `whilst`, `amongst`, `roster`, `expiration` | British spelling and usage: behaviour, colour, centre, litre, fibre, modelling, labelled, cancelled, fulfil, enrol, catalogue, analogue, programme for a plan, full stop, round brackets, while, among, rota, expiry; keep a code identifier, a time period, a software program and the hedy roster command | WARN |
| `the receiving half`, `the sending half`, `the middle` as a partitive, `nobody owns`, `moves on`, `moved on`, `waits on`, `wait on` | essay idiom: name the component, name the owning team or say that no team owns the thing, state the next step, waits for | WARN |

Listed and not checked, because the estate uses them often or in a literal sense the gate cannot tell from the figurative one: journey (the INS journey components), key, new, recent, recently, soon, latest, now, will, always, never, via, ensure, additional, deploy, impact, progress as a verb, obtain, acquire, attempt, sufficient, in order to, as well as, whether or not, end-to-end, please, master, log in and login (write sign in), onboard, ecosystem, best, fastest, optimal, the negative contractions, the -ize spellings with artifact, judgment and toward, stands-upon, tackle and strengthen, and the forms the table cannot hold, e.g., i.e., etc. and and/or. Each is a judgement call under the rules above.

`transform` remains available for literal data transformation. Challenge it only when it means vague improvement.

`alone` after a noun has two senses, and the postpositive form reads first as the wrong one. "The front door alone holds the signing key" means only the front door holds that key, but a reader first parses "the front door alone" as the front door unaided and has to re-read. Put the restriction before the noun, where English readers expect it: "Only the front door holds the signing key." Keep `alone` where the sense is by itself, as in "expiry alone ends no provider session", or write "by itself".

Minimise `quick`, `easy` and `simple` when they judge how difficult work should feel. Literal names, a request for the simplest workable option, and "simple language" in the sense "Just Enough" defines are valid uses.

## Punctuation and formatting

These are deterministic house rules:

- Use straight `"` and `'` quotes.
- Do not use an em dash, a spaced en dash or a spaced hyphen as a sentence break. Use a full stop, comma or colon, or recast the two parts as two sentences. A hyphen joins a compound modifier before a noun (a read-only replica) and an established compound (sign-in as a noun, re-enter). Gate: FAIL on the dashes, WARN on the spaced hyphen between words outside code and tables.
- Do not use semicolons in body text. Split the sentence, or use a colon before a list. Gate: WARN outside code, tables and list items.
- Use no contractions in a formal document (a specification, decision record, reference page or policy). Never use a negative contraction anywhere, because readers skim past the "n't" and read the opposite. Gate: guidance, because the estate's agent instructions use them often.
- Use one space after a full stop.
- Use "to" in ranges.
- Do not put commas at the end of address lines.
- Do not use `N/A`. State "not applicable", "no data" or "not used". Gate: FAIL.

### Code and identifiers

Use backticks for property names, scheme IDs, code values, filenames, paths, types, classes, methods, functions, commands, HTML elements, HTTP status codes and JSON Schema keywords.

Backticks also mark a prohibited word or punctuation mark discussed as an example. The gate masks inline backticks, fenced code, blockquotes and URLs. Ordinary quotation marks do not suppress the gate.

JSON containing `//` comments uses an unlabelled code fence. Pure JSON uses a `json` fence.

When a schema `$def` and an instance property both matter, name both: `gbnAgTradeProduct` `$def` (property: `specifiedTradeProduct[]`). Do not substitute a schema-internal name for the property a reader will find in instance data.

### Headings, lists and tables

Follow the structural rules in [document-types.md](../../skills/editorial/references/document-types.md). Use concrete headings rather than generic headings such as "Overview". Prefer a bold lead-in paragraph to unnecessary heading depth.

A heading names its topic with a noun phrase in title case: "Session Assertion Checks", "Role Change Timing", "Database Privacy Rationale". A heading is never a clause. It is not a question, with or without a question mark ("How is a session started"). It is not a half-question that opens on what, how, which, when, where, why, who or whether ("What a journey backend checks", "Why the database is private"). It is not a sentence fragment led by a verb. The same rule applies to every label that stands in for a noun: table headers, captions, bold lead-ins, and list items that introduce content, such as a list of the questions a page answers. Questions and half-questions in these places are **FAQ voice**: writing as if answering a reader's question instead of stating the topic or the fact. A sentence, list item or table cell never opens in FAQ voice either ("What the frontend sends depends on the request", "- How a session ends"). The opening is a smell: it hides the actor behind a question and makes the reader wait for the content. Restructure the text so the actor and the content lead: "The frontend sends a redirect for a page load and a `401` for a script call". In running prose, an embedded question as the object of a verb is normal grammar and stays: "INS checks which organisation is active". A sentence that opens on "When" or "Where" usually states a condition, which this guide puts first on purpose. Gate: FAIL on a markdown heading, a table header cell or a bold lead-in that opens on a question word (what, how, which, when, where, why, who, whether) or ends on a question mark. WARN on a sentence, list item or table cell that opens on What, How, Which, Why, Whether or Who, and on a table header that trails off on a preposition ("Set by", "Used by"), which is a clause fragment where a noun ("Source", "Writer") belongs.

Keep structure in proportion. Before adding a heading, table or list, name what this reader gains, at this length and in this document mode, that prose does not give. A table or list that only formats what a sentence already says is structure for its own sake. An opener that only announces the material ("This page covers what happens, how long, and how to spot it") is replaced by a first sentence that states the point. An **inventory opener** is the same smell at scope-sentence length: the page's parts listed as nominalised noun phrases, after a colon or in a run of commas ("This page defines what the API gives its callers: the session assertion, the operations and their answers, the rules for sign-out, and what each component is responsible for"). The reader holds every abstraction before a verb lands, and being the scope sentence does not excuse the shape. Write one sentence per job of the page, each with an actor and a verb, in the order the reader meets the sections: "This page describes the session service API and the session assertion. It details each endpoint and what each returns. Other parts cover the behaviour at sign-out and at an organisation switch." A scope or route sentence written that way does a job for the reader and stays. Gate: WARN on an opener of the inventory shape with three or more items. Paragraph breaks at job boundaries are not the structure this test guards against.

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

Requirement words carry one meaning each. Do not substitute synonyms for variety:

| Word | Meaning |
| --- | --- |
| must, must not | mandatory requirement or prohibition: law, policy, or a condition without which the thing does not work |
| should, should not | recommended. A justified exception is possible and the reason belongs in the text |
| may | permitted, optional |
| can, cannot | possible or capable: a statement of fact, not permission |
| will | the future or a commitment, never a requirement |

Avoid `shall` except in a formal standard or contract that defines the word. Never write `may not` to forbid something: write "must not". Do not write `should` for a prediction (`the service should scale to 50,000`): write "is designed to", "is expected to", or give the test result.

Use "select" rather than "click" for interface actions. Use "page" rather than "screen" for web content. Exact interface labels take precedence.

## Capitalisation, numbers, dates and inclusion

- Use sentence case except for proper nouns, official titles and headings. Headings use title case: capitalise every word except articles, short conjunctions and short prepositions that are not the first word. Gate: WARN on a markdown heading with a lowercase word outside that list. The gate checks only the start of each word, so "Re-confirmation" passes.
- Capitalise department names, a job title attached to a person's name, named benefits and "The Civil Service".
- Lowercase "government", "civil servants" and general job titles.
- Write out "one" and use numerals from 2 onwards. Use commas above 999 and write percentages as `50%`.
- Write dates as `4 June 2017` and ranges as `10 November to 21 December`. Write times in the 24-hour clock in technical and operational content (`14:30`, `09:00`) and in the 12-hour form with am or pm in user-facing content (`2:30pm`, `9am`, "midday", "midnight"). Never `2:30 PM`. State the time zone where it matters: "14:30 UK time", "09:00 UTC". A machine-read timestamp or duration follows ISO 8601 (`2026-10-25T14:30:00Z`, `PT15M`).
- Use "disabled people", "women" and "men". Use singular "they" when gender is unknown or irrelevant.

## References and examples

- Do not cite gitignored files or local-only evidence. State the supporting fact inline when the source cannot be shared.
- Every internal link and cross-reference must resolve.
- In a Related or See-also list, write a sentence explaining what the reader will find and why it matters.
- A worked example opens with its reader frame and closes with the transferable move. Real examples are preferable when they can be shared safely.
