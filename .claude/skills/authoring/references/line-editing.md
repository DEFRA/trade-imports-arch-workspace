# Line Editing

A line edit improves how each point of an existing page is said and changes no claim. An edit that changes a claim is a rewrite, and only the author rewrites. Read this file only when line editing, after you have read the page and its agreed line-edit plan. Without the plan's reader, purpose and section points, you cannot tell a defect from the author's choice.

Wording that reads better can still carry a different claim. Check every candidate against the claims of its source before you judge how the candidate reads.

## Order of Work

1. State each paragraph's point in one sentence, from the paragraph and the plan's section point.
2. Run the tests below on every paragraph and sentence, and list each defect with its place. Change nothing yet.
3. Repair each listed defect with the repair rules. Leave every paragraph with no defect as the author wrote the paragraph.
4. Run the tests again over each changed paragraph and the paragraphs beside the change. Stop when a pass finds nothing new.

## Recognition Tests

These tests recognise defects in finished prose. They are not drafting rules, and `writing.md` holds the drafting rules.

### Paragraph Tests

Ask these in order, with each exception in view:

1. A judgement stands in for a fact, except a comparison the passage grounds in a stated fact.
2. An actor or a mechanism is hidden, except where the actor is unknown or irrelevant and the passive puts the thing the reader tracks in the subject.
3. A term needs private context the reader frame lacks, except a registered workspace name.
4. The paragraph restates its heading or conclusion, or justifies a decision a second time, except the sentence that states the page's scope.
5. The paragraph holds two jobs the reader needs to tell apart, except a long paragraph on one job.
6. A sentence carries discrete facts whose order carries no meaning, or an ordered mechanism whose every step names its actor, and a list would expose them. A connected argument, a causal explanation or a qualification stays prose.
7. The reader meets a condition after the action the condition governs and has to re-read, except a contrast or emphasis that already works.
8. The reverse outline in `SKILL.md` finds a sentence with no job.

### Compression

Compression saves the writer words and makes the reader reconstruct the meaning. The test is whether a colleague could read the sentence aloud once and restate the sentence accurately. The patterns:

- **Ledger voice:** document bookkeeping as system prose, such as `held open under X` or `points back to`.
- **Aside stacking:** two or more asides inside one sentence, separating the subject from its verb.
- **Contact clause:** a dropped relative pronoun that gives agency to a thing, as in `a store only the front door reaches`.
- **Abstraction swap:** a noun such as `the posture` or `their standing` in place of the concrete fact.
- **Inverted relation:** the main verb buried in a trailing relative clause, as in `the tenant INS is calling into`.
- **Trailing vagueness:** a sentence ending on an abstract noun with no named referent, as in `The design is settled`.
- **Trailing pronoun:** a sentence or line ending on `it`.
- **Leading demonstrative:** a bare `This` or `That` before a verb, as in `This adds a deployable`. A demonstrative before a noun, as in `This page explains`, stays.
- **Dangling-preposition relative:** `the session API that the journeys resolve sessions against`.
- **Figurative mechanism:** a metaphor the reader has to decode before the system makes sense.
- **Condensed rule:** a principle as a quotable formula, with an abstraction as subject (`the estate distils`) or a passive with no actor and no object (`the loss is named`).
- **FAQ voice:** a heading, label or sentence that opens on a question or half-question, as in `What a journey backend checks`. A sentence opening on When or Where that states a condition passes.

### Framing That Carries a Judgement

A sentence fails this test when its framing obscures the behaviour or introduces a judgement the passage does not support. The forms are an opener such as `the second difference is the one a user will notice`, a figurative pivot such as `that silence has an edge`, and a ranking the passage does not ground, such as `a nuisance` or `more serious`. A sentence that states the passage's scope, or carries the reader between points, is not a defect for framing its material.

### Unclear Reference

A pronoun or demonstrative fails when the reader cannot recover its referent at once and without error: `it` for a verdict, `that design` where the design has a name, `the former`. A pronoun whose referent is the one thing the previous clause named passes.

### Noise

Each of these goes by default, and the removal is the whole fix:

- a judgement standing in for a fact (`cheap`, `easy`, `safe`, `simple`) or an ungrounded ranking
- a pointer or cross-reference, unless the reader could not find the reason behind a rule without the pointer
- the document's own tallies, such as how many rows or decisions the page holds
- a sentence that narrates the document, such as `that detail is not repeated here`
- revision narrative, a resolution log or a dated annotation
- a tangent: text that invites a question whose answer would not strengthen the point
- a second justification for a decision the passage already justifies
- filler words, which the checks report

### Suspect Claims and Undecided Choices

A missing explanation is first a suspect claim. Before you ask for the explanation, ask whether the passage should make the claim at all, and whether a later caveat withdraws the claim. Wording that asserts a choice the page or plan does not record as decided, such as `the corporate tenant` where no tenant is chosen, raises a question for the author.

## Repair Rules

- **Remove whole units.** Remove the sentence, bullet, table row, paragraph or complete bracketed aside that carries the defect. Never cut a fragment out of a sentence that stays, because the cut strands a subject or breaks the line. When the unit has to stay, reword the sentence so the defective part is gone.
- **Never condense what stays.** Rewriting a passage shorter makes you the author of wording the page never had. Removal is always available, and compression is never a repair.
- **Unpack compression** with explain and rewrite in `SKILL.md`, naming the actor and the relation.
- **Split at the seam.** A paragraph with two jobs breaks at the seam between them, with no word changed.
- **List with the same words.** A list keeps the words of the sentence in the same order.
- **Move a condition whole.** A condition moved before what the condition governs keeps every word and its scope, and `if`, `only if`, `unless` and `after` stay distinct. When the text does not settle which action a condition governs, the scope is a question.
- **Restate framing as its consequence.** Rewrite a framing sentence as the consequence the passage supports, with every condition the passage puts on that consequence, or remove the sentence when no supported consequence remains. Never qualify the judgement.
- **Name the referent.** Replace an unclear reference with the name the page establishes. When the page does not settle the antecedent, ask the author.
- **Remove a tangent.** Remove the text that invites the question, and never answer the question.
- **Give every change its reason.** Each addition says what the addition makes clear that the paragraph did not. Each removal gives a one-line reason in the hand-over report: the job the unit lacked, or the noise the unit carried. Add no technical detail the page and plan do not hold.
- **Turn a guess into a question.** A mechanism, reason or fact the page and plan do not state is never written in, even by one inference. Put a bracketed placeholder in the page and the point in the batch of questions.
- **Send a claim to the author.** A sentence with no job, or a suspect claim, that still carries a claim goes to the author as a question. Only the author cuts a claim.

## Threshold and Stop

Change a passage only when the change makes the text easier for the plan's reader to understand or verify. Never change wording for preference or for a synonym. A paragraph with no defect stays as written. Leaving a passage unchanged is a real outcome, and the existence of a better version is no reason to change acceptable text. A synonym, a reordering the reader does not need and a second split of a paragraph already on one job are churn. The edit stops when a pass over the page finds nothing new.

## Exemptions

Fenced and inline code, quotations, blockquotes, URLs and front matter are exempt from the wording rules. Check a code example or a quotation against the page, and keep its wording.

## The Author's Rights

- **Supplied wording is final.** Wording the author supplied stays as supplied. Put any suggestion in the hand-over report, never in the page.
- **Cuts stay cut.** Content the author deleted is never restored. Repair the joins the cut left with the seam checks of the closing pass.
- **Headings stand.** The author's headings keep their wording, and the checks still apply. Title case is fixed automatically. A heading in FAQ voice is a Change hit, so reword the heading to a noun phrase and list the renamed heading in the hand-over report, because its anchor changes.

## Before and After

| Before | After | Move |
| --- | --- | --- |
| `The second difference is renewal, and it is the one a user will notice.` | `In the session-service design the user sees nothing of renewal. In the cookie design a renewal redirect passes silently while the provider's session is live. When that session has lapsed, the provider signs the user in to a fresh session, so a user who holds more than one organisation meets the organisation picker again.` | framing restated as the consequence the passage supports, with every condition kept |
| `Sign-in is unchanged: the front door remains the only component that contacts the provider, the same checks run on the assertion, and the return path is checked against the allowlist.` | `Sign-in is unchanged. In both designs:` followed by three bullets holding the same three clauses in the same order | parallel facts whose order carries no meaning become a list of the same words |
| `This adds a deployable to every request path.` | `Running a programme-owned proxy adds a deployable to every request path.` | the bare demonstrative replaced by the thing the page names |
| `a store only the front door reaches` | `a store that only the front door can access` | the relative pronoun and the capability verb restored |
| `That detail is not repeated here. The token expires after 15 minutes.` | `The token expires after 15 minutes.` | a sentence that narrates the document removed as a whole unit |
| `The service deletes the record after 30 days unless the case is open.` | `Unless the case is open, the service deletes the record after 30 days.` | the condition moved first, every word kept |
| `The gateway retries only failed requests.` | `Only the gateway retries failed requests.` | rejected: the same words make a different claim, so the source stays |
| `The proxy forwards the header and logs the request if the session is valid.` | the source, unchanged, and a question to the author on whether the condition governs only the logging or the forwarding as well | a condition whose scope the text does not settle becomes a question, never a guessed edit |
