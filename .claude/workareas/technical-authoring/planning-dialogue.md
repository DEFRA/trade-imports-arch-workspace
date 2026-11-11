# Planning Dialogue

This file designs a planning dialogue with the AI as developmental editor, whose product is a plan in the shape `hedy plan check` parses, and tests the dialogue on the INS Event Design page.

## Source Findings

**The corpus.** `analysis/ins-events/` holds no raw source, only briefs, digests, prompts and results. The replay used the docs-repo records and EUDPA-267, and did not reach the code or the CDP documentation.

**Ben's planning.** The first brief listed content and questions, and produced service manuals. Brief-v2 added a reader outcome, a shared frame, a detail rule, a worked example and scope rules.

**The primary sources**, read on 5 November 2026. Redish's book was not reached, only her slides.

- Minto (partial copy, 1996 edition): a point "must raise a question in the reader's mind", and grouped ideas "must always be the same kind of idea". Both support the checks. MECE appears only for logic trees in problem solving, so the gap check extends Minto.
- Flower and Hayes 1981 (full): "people only solve the problems they define for themselves" (p. 369), and goals are revised throughout, so drafting can reopen the plan.
- Scardamalia (two papers, not the 1987 book): the prompting evidence comes from children and from prompts blind to the content, so the evidence does not cover an editor that reads the content.
- Redish (slides): the reader "starts the conversation". Secondary accounts say she lists the reader's questions first, which fits if the reader's question sets the governing thought and the points' questions take over below.
- Horn (1969 report): eight information types, with no principle type.
- STOP (1965 report, Tracey, Rugh and Starkey): the publication is "planned, reviewed, and revised before it is written", each module has an arguable thesis, and STOP allots length per module.
- Hayakawa (full): good writing moves "from higher to lower, from lower to higher" (p. 180), so a detail rule sets a highest and a lowest rung, never one rung.

## The Dialogue Design

The author talks and the AI plays back. Each AI turn returns the plan so far and puts its decisions as one batch of question prompts, each option with a preview sentence and the recommendation first. Four exchanges reach an agreed storyboard, and a question raised in drafting can reopen the plan.

| Turn | The Author Says | The AI Returns | Methods |
| --- | --- | --- | --- |
| 1 | the subject, the readers and their use of the page | the reader, the purpose as what the reader can do, the situation and complication, and two or three governing thoughts. A content-list purpose is named as the inventory risk | interview and play-back, SCQ |
| 2 | the chosen options | the question the governing thought raises, two or three key lines, the checks below, the parts every section shares, the derived questions and the scope | vertical and horizontal logic |
| 3 | the chosen options | one fact on each rung, the detail rule, one worked case on the lowest rung, and the storyboard: heading, point and form per section | ladder of abstraction, information types, storyboard |
| 4 | agreement or changed lines | the plan in the full form, checked, with items pending | none |

The checks:

- **Vertical.** The AI derives each question from the point that raises the question. A point that raises no question this reader asks goes to the author.
- **Horizontal.** The points at one level are one kind of thing. The gap check runs both ways: every point has material, and every duty or claim in the author's account or the sources maps to a point.
- **Prerequisite.** A term two sections use is introduced before both.
- **Challenge.** The author states each key point's consequence if false (Scardamalia's substantive prompts).

The detail rule names the highest and lowest rungs and the test a detail passes to descend. Minto's same-kind test applies to the points, and Horn's information type sets each form: a concept or process takes prose, a procedure a numbered list, compared facts a table, and a structure a diagram.

## The Plan's Parts

| Part | Turn | In the Template Today |
| --- | --- | --- |
| Reader | 1 | present |
| Purpose, as what the reader can do | 1 | present as "know or do", which admits a content list |
| Opening: situation and complication | 1 | missing |
| Governing thought | 1 | present |
| Key points | 2 | present as `Point` |
| Frame | 2 | missing |
| Derived questions | 2 | present, origin unstated |
| Exclusions | 2 | missing |
| Detail rule | 3 | missing |
| Storyboard | 3 | present as heading, `Point` and `Form`, never reviewed |

## The Skill Boundary

authoring does not plan, check facts or synthesise analysis. The line-edit form already draws the line: authoring records and tests what the author said, and adds no point.

- **authoring, for the MVP:** the turn 1 play-back from the author's own words, the three checks as questions on the author's points, the detail-rule prompt, the storyboard play-back, and the plan and its check.
- **document-planning, later:** every option whose content comes from a source: a situation drawn from records, alternative key lines, the gap check against the sources, the worked case and the items.
- **An analysis skill, from a corpus:** each source's status as agreed record, draft or code, which decides the requirement word, the duties and claims with quoted spans, one fact on each rung, candidate worked cases, superseded positions and the items.

The replay's largest gains, the grouping by guarantee and the consumer's duties, came from the sources, so they sit in document-planning. The MVP catches a content-list purpose, a missing detail rule and an overlap, and proposes no structure. Ben decides whether that is enough, or whether decision 8, which gives structure to document-planning, changes so that authoring runs the whole dialogue.

## Plan-Template Changes

The template's second sentence becomes:

> A plan comes out of the planning dialogue in `SKILL.md`, and an author may also write one by hand.

One layout rule is added:

> - A question is the one a governing thought or section point raises in the reader, derived from the point.

In the full form, `Purpose` changes its wording, and four fields join it:

```
Purpose: <what the reader can do after reading>
Opening: <the situation the reader accepts, then the complication that raises the reader's question>
Governing thought: <the one claim the sections support>
Frame: <the one kind of thing every section point is, and the parts every section shares>
Detail: <the highest and lowest rungs, and the test a detail passes to descend>
Excludes: <what the page leaves out, or none>
```

The worked full plan gains:

```
Opening: The broker delivers every event at least once, and the consumer applies each event it receives.
Frame: Each section answers one question an engineer changing the consumer asks, in the order the engineer meets the question.
Detail: From the property to one worked redelivery. A value appears only where a change to the value breaks the property.
Excludes: The broker's configuration beyond the redelivery timeout.
```

`hedy plan check` adds the four labels to the full form's part list. A word allotment per section, which STOP and brief-v2 both use, is left for Ben to decide.

## Replay on the INS Event Design Page

The author's turns use Ben's words from `brief.md` and `brief-v2.md`, trimmed, and an agreement selects an offered option with no added words. Turn 1 uses the first brief's words on purpose: the test is whether the dialogue catches the service-manual failure before any drafting. The AI's turns draw on the raw records read on 5 November 2026: ADR-EUDP-001, ADR-EUDP-002, ADR-EUDP-006, DR-EUDP-004, the INS Solutions Overview and Jira story EUDPA-267. The journey code was not reachable locally, so no AI turn uses a code fact.

Contamination, stated before the replay: before building the AI turns, the "Purpose and Reader" section of brief-v2 (lines 1 to 11) was read for Ben's words, and that section holds the "after reading" sentences and the sentence that a detail appears only where it answers a reader's question. The workspace memory index names brief-v2's shape as "five parts by concern, journey/consumer duties, PIMS failure example". The first 30 lines of `gemini-instructions.md`, read to classify the file, hold the writer's rule that a number appears only where it changes the reader's conclusion. The frame's parts, their order, the worked example and the "Level of Detail" section of brief-v2 were not read until the replay was written.

### Turn 1

**Author.** "The page is evidence for an assurance reviewer, a TDA, SDA or GDS assessor, checking the resilience and data integrity of the INS event mechanisms. It gives a complete technical overview, from the transactional outbox to the publishing patterns on CDP: how INS keeps a notification's events in order, how a failed event is replayed, and how the envelope gives ordering and deduplication. The reader knows message queues, idempotency and transactions, and does not know the INS components or decisions."

**AI, play-back.** The reader is an assessor who knows queues, idempotency and transactions and does not know INS. The purpose as heard names the page's content, "a complete technical overview", and not what the assessor can do after reading. A plan with a content list and no reader outcome gives the writer no reason to leave any mechanism out.

**AI, the situation and complication drawn from the records.**

- Situation: every INS journey writes a notification and its event in one transaction and publishes from an outbox to its own SNS FIFO topic (ADR-EUDP-001). Every event carries one envelope and one version sequence per notification (ADR-EUDP-002), and the aggregated dashboard reads the same stream (ADR-EUDP-006). Live animals is the first journey, with plants and the rest-of-world journeys to follow (ADR-EUDP-001 context, DR-EUDP-004).
- Complication: the transport delivers at least once and suppresses a repeated event for five minutes, so the guarantee holds only when each consumer deduplicates on the event ID and orders on the aggregate version (EUDPA-267). The design is spread across four records, and none states which party keeps which part of the guarantee.
- The reader's question: the guarantee the design gives a notification's events, and the duty each party carries to keep that guarantee.

**Prompt 1, the governing thought.**

1. Guarantee and shared duty (Recommended). Preview: "Every INS journey delivers each notification's events at least once and in version order, and the guarantee holds because the journey keeps every event in its outbox and each consumer discards a repeated event by its ID and a stale event by its version."
2. Mechanism tour. Preview: "INS publishes notification events through a transactional outbox, an SNS FIFO topic and SQS FIFO queues, with dead-letter queues and replay from the outbox." The sections then follow the components, and the page reads as an inventory.
3. Recovery first. Preview: "A failed event on any path to a consumer is noticed and put right from the journey's outbox, and the notification's state is never lost." This serves the assessor and leaves a journey team without its duties.

**Prompt 2, the reader's outcome.**

1. Duties with their reasons (Recommended). Preview: "After reading, the reader can state what a journey must do and what a consumer must do, and name the guarantee each duty protects."
2. One event traced. Preview: "After reading, the reader can trace one event from the save to PIMS and name each component it passes." This outcome invites the tour.
3. Claims checked against code. Preview: "After reading, the assessor can check each claim against the repository." This outcome sets the page at configuration level.

**Prompt 3, the reader.** The records name readers beyond the assessor: ADR-EUDP-001 sets a pattern "that can be replicated to other user journeys", and EUDPA-267 places deduplication and ordering on the consumer.

1. The assessor, the journey teams who build to the design and the consuming teams (Recommended). Preview: "The reader is an architect, engineer or assessor outside the INS core team, including a journey team about to publish and a consuming team such as PIMS."
2. The assessor alone. Preview: "The reader is an assurance reviewer checking resilience and data integrity."

The first option in Prompt 2 matches the brief-v2 sentence read beforehand, so the replay is no evidence that the dialogue would have produced that wording unaided. The records support the substance: EUDPA-267 places business deduplication and ordering on the consumer, and ADR-EUDP-006 mandates the outbox for every journey.

### Turn 2

**Author.** "Option 1 for all three. It is the event design every INS journey adheres to, not one journey. The live animals journey is the reference implementation. The assessor can say how a failure on the path to a consumer is noticed and put right without reading code."

**AI, the key line.** The governing thought raises one question in the reader: the guarantees, and who keeps each. Each answer below is a guarantee, a property a consumer can rely on, which is the one kind of thing at this level.

1. No event is lost between the save and the topic: the notification and its event commit in one transaction, and the worker retries an unsent event (ADR-EUDP-001).
2. A notification's events arrive in version order: one version sequence per notification (ADR-EUDP-002, ADR-EUDP-006), published with the notification's identity as the FIFO message group (EUDPA-267).
3. A repeated event changes nothing: the transport suppresses a repeat for five minutes, the consumer discards a repeat by event ID, and the aggregated store converges by upsert (EUDPA-267, ADR-EUDP-006).
4. A failed event is put right: redrive from the dead-letter queue first, then replay from the outbox to every consumer once the dead-letter queue is clear (ADR-EUDP-001, EUDPA-267).
5. Only the external events leave INS: the gateway's filter keeps the internal snapshot event inside the domain, and a published event's meaning never changes (ADR-EUDP-006, ADR-EUDP-002).

**AI, the horizontal check.** The five points are one kind of thing. Points 2 and 3 both rest on the version rule, so the rule has its home in point 2 and point 3 refers to that home. The dashboard's currency is a consequence of points 2 and 3 and the snapshot event, so the dashboard enters each section as a consumer and needs no section of its own. One gap remains: the records reached state that replay is the remedy "when a message is lost" (EUDPA-267) and do not state how a loss at a consumer is noticed. That gap becomes an open item for the analysis and is never filled in the plan.

**AI, the shared shape.** Each guarantee section has the same four parts: the guarantee, the journey's duty, the consumer's duty, and the result when one side fails. The reader's outcome from Prompt 2 maps onto the two middle parts.

**AI, the derived questions.** Each question below is the one a point raises, checked against the reader. The first brief's listed question on how MongoDB and the aggregated data are arranged answers no point and drops out. Its question on reconciliation becomes part of Q4.

```
- Q1: Can a failed publish after the save lose an event?
- Q2: What keeps one notification's events in order, and what can reorder them?
- Q3: What stops a repeated event from repeating its effect?
- Q4: How is a failed or lost event noticed and put right?
- Q5: Which events cross the boundary to PIMS, IDCOMS and TDS?
- Q6: What must a journey and a consumer each do, and why?
```

**Prompt 4, the grouping.**

1. By guarantee (Recommended). Preview heading and point: "Order per Notification: a notification's events reach every consumer in version order."
2. By party: the journey, the transport and gateway, the consumer and the operator. Preview: "The Consumer: a consumer discards a repeated event by ID and a stale event by version." Each guarantee is then split across four sections, and the reader reassembles the guarantee.
3. By the event's path: save, relay, topic, queue, gateway, consumer, recovery. Preview: "The Relay: a scheduled worker publishes unsent events in write order." This is the tour of the first brief's pages.

**Prompt 5, the scope.** ADR-EUDP-001 ends the CDP side of delivery at Azure Service Bus.

1. The page stops at Azure Service Bus, and the gateway is part of delivery, never a consumer (Recommended). Preview: "The gateway holds the credentials for Azure Service Bus and forwards the external events, and PIMS's own processing is outside this page."
2. The page follows the event into PIMS. Preview: "PIMS transforms the event in Azure Logic Apps before writing the case." That material belongs to the receiving team.

### Turn 3

**Author.** "Option 1 for both."

**AI, the level of detail on the ladder of abstraction.** One fact at three rungs:

- Guarantee: "A notification's events arrive in version order."
- Mechanism by role: "The journey publishes each event with the notification's identity as its ordering group, so the queue releases one notification's events one at a time."
- Configuration: "MessageGroupId is set to aggregateId, content-based deduplication is off, and the deduplication window is five minutes."

**Prompt 6, the detail rule.**

1. Mechanism rung throughout, and a configuration detail appears only where it changes a duty or the reader's conclusion (Recommended). Preview: "The transport forgets an event ID after five minutes, so a replay inside that window is accepted and not delivered, and the dead-letter queue is cleared before any replay." The five-minute window appears because it explains a duty, and the relay's polling interval does not appear.
2. Configuration rung throughout. Preview: the configuration sentence above. The assessor can match each line to the code, and the page becomes the service manual of the first brief.
3. Guarantee rung throughout. Preview: the guarantee sentence above. The assessor cannot see why the guarantee holds.

**Prompt 7, the storyboard.** Keep or change each line. The form follows the information type: a principle takes prose with its rule first, a procedure takes a numbered list, facts compared across the same fields take a table, and a structure takes a diagram.

| Section | Point | Form |
| --- | --- | --- |
| Event Design | The governing thought, the live animals journey named as the reference implementation, and the event's path | prose and the diagram |
| No Lost Events | The notification and its event commit together, and the worker retries an unsent event | prose |
| Order per Notification | One version sequence per notification, and the message group, keep a notification's events in order | prose |
| Harmless Repeats | A repeated event changes nothing, because the consumer discards a repeat by ID and a stale event by version | prose |
| Recovery from a Failed Event | Redrive first, then clear the dead-letter queue, then replay the notification to every consumer | numbered list |
| Events That Leave INS | Only the external events cross the boundary, and their meaning never changes | prose |
| Duties of a Journey and a Consumer | Each duty beside the guarantee the duty protects | table |

### Turn 4

**Author.** "Agreed."

**AI, the plan.** The agreed plan is written in the full form with the proposed fields, and items wait for the material step.

```
Form: full
Title: INS: Event Design
Reader: An architect, engineer or assessor outside the INS core team, including a journey team about to publish and a consuming team such as PIMS. Knows queues, idempotency and transactions, and not the INS components or decisions.
Purpose: The reader can state what a journey must do and what a consumer must do, and name the guarantee each duty protects. The assessor can say how a failure on the path to a consumer is noticed and put right without reading code.
Document type: explanation
Opening: Every INS journey publishes notification events that PIMS, IDCOMS, TDS and the dashboard depend on. The transport delivers at least once, so the guarantee depends on both sides.
Governing thought: Every INS journey delivers each notification's events at least once and in version order, and the guarantee holds because the journey keeps every event in its outbox and each consumer discards a repeated event by its ID and a stale event by its version.
Frame: Each section after the first is a guarantee, in four parts: the guarantee, the journey's duty, the consumer's duty, the result when one side fails.
Detail: The mechanism named by its role. A configuration value appears only where it changes a duty or the reader's conclusion.
Excludes: Processing after Azure Service Bus. Whether any consumer meets its duties.

## Questions
- Q1: Can a failed publish after the save lose an event?
...

## Section: Order per Notification
Point: One version sequence per notification, and the message group, keep a notification's events in order.
Form: prose
Answers: Q2
Items:
- [pending: the material step]

## Open Items
- Open: how a lost event at a consumer is noticed
  Answer: [pending]
```

### Comparison with Brief-v2

Brief-v2's frame, worked example and "Level of Detail" section, and the handover's "The Refocused Brief", were read after the replay above was written.

**Matches.**

- The agreed purpose matches brief-v2's "after reading" sentences, with the contamination stated above. The reader matches brief-v2's list, less "an engineer joining INS".
- The shared shape matches. Brief-v2's parts 2 to 5 share the mechanism, the journey's duties and the consumer's duties, each duty with the guarantee it protects. The replay's sections share the guarantee, the journey's duty, the consumer's duty and the result of a failure. The replay leads with the guarantee and brief-v2 with the mechanism.
- The replay's third point holds two of the four consumer duties in brief-v2's contract: deduplicate by event ID, and discard a version at or below the one applied.
- Both plans close on a table of journey and consumer duties, keep the five-minute window, and describe the gateway by its delivery role and never as a consumer.
- The derived questions drop the first brief's question on how MongoDB and the aggregated data are arranged. The handover names that question as one cause of the service manuals.

**Improvements.**

- The replay's plan holds the governing thought as one sentence. Brief-v2's purpose lists four topics and states no single claim. The cold read of page B2 found an opening that stated the producer's guarantee without its limit and gave two consumer duties of four. A one-sentence governing thought gives the closing pass a sentence to test the opening against.
- The replay names the kind of thing at the frame's level. Brief-v2's five parts are of five kinds: a rationale, a stage, a property, an activity and a consumer. Whether one kind reads better on this page is untested. Brief-v2's parts map one to one onto the rows of its duty table, which is a strength the replay's grouping lacks.
- The replay names the inventory as an option with its consequence in turn 1, before any page exists. Ben reached the reframing after three pages and five days, from 28 October to 2 November 2026. The contamination limits this claim to the method of the catch, not its wording.
- The replay keeps derived questions, which give the closing pass a test. Brief-v2 has no question list.

**Shortfalls.**

1. The replay has no part for the design's reasoning. Brief-v2's first part gives the fat-event reasoning from ADR-EUDP-002 and introduces the envelope as the carrier of every later guarantee. The replay spreads the envelope's fields across its second and third points, which repeats the A1 cold-read finding that sections used the envelope's fields before defining them. The dialogue had no check for a term several sections share.
2. The replay's horizontal check absorbed the dashboard into other sections, and so lost the journey's duty to publish the snapshot event on every save. That duty protects none of the replay's five guarantees, and a check run from the duties in the records back to the points would have found the gap. The replay ran the check from the points to the material in one direction.
3. The replay has no worked example. Brief-v2 closes recovery on the failure modes on the path to PIMS, each with what an operator observes. The replay's ladder treated the lowest rung as configuration, held the page on one rung, and its scope prompt cut PIMS out. Hayakawa's lowest rung is the concrete instance, and his advice is to move between rungs.
4. The replay's detail rule is brief-v2's test, applied without the material. The replay dropped the two-second relay interval, which brief-v2 keeps, and never reached the three receives before dead-lettering or the hour of loss on a restore, because those facts sit in the code and the CDP documentation.
5. The replay sets no requirement word by source status, no rule for code that differs from a record, and no word budget. The first two belong to each item's source, at the material step, and the third is absent from the template.

Shortfalls 1 to 3 changed the dialogue design: the prerequisite check, the two-way gap check and the worked case on the lowest rung come from them, and Hayakawa's text moved the detail rule from one rung to a highest and a lowest. Shortfalls 4 and 5 show that the dialogue sets the detail rule and the material step applies the rule.

## Design Changes

Proposed text for `design.md`:

- "The System" and "The Arrows": the author "talks the plan through in the planning dialogue and agrees the plan".
- "Writing a Document", a new first stage: "0. Plan | the author talks, and authoring plays back the plan, adds no point and writes the plan once the author agrees the storyboard | Writers solve the problems they define for themselves (Flower and Hayes 1981), and an outline with no thesis per part reduces to categorising (STOP 1965) | the planning dialogue in `SKILL.md`, `plan-template.md`".
- "Content, Expression and Mechanics", the Document row adds "the opening, the frame, the detail rule and the exclusions", and the purpose reads "what the reader can do after reading".
- "Later": "document-planning adds the options drawn from the corpus to the dialogue."

`SKILL.md` gains the dialogue as a section, and its routing reads: "With no plan for a new document, run the planning dialogue."

## Lessons From the Roleplay

Ben and the editor ran the dialogue live on the INS Event Design page on 5 November 2026, with the editor working from the fact file, its addendum, both briefs, the handover, the current page and ADR-EUDP-010.

- **The opening asks three questions, not four.** The reader and what the reader does afterwards, what matters most as a paragraph with as many things as there are, and how deep the page goes. Asked for one sentence, Ben gave a paragraph of three ideas, and asked for two to four points, he found the question hard. The editor distils the main sentence and the points from the paragraph and the material, and plays both back as options with previews.
- **Reading the material first is what lets the editor contribute.** The question of two readers wanting different things, and the boundary story from ADR-EUDP-010, came from the material, not from Ben's words.
- **The check of each point's consequence if false earned its place.** The check found that part of the boundary story rests on a proposed ADR, before any drafting.
- **The storyboard is where the editor does the information architecture.** The editor proposed the sections with an opening point each, how the detail steps down to one concrete instance, the length per section, and a ranked list of images, each with what it shows and why.

## Map by Intent

- To check the evidence, read "Source Findings".
- To run the dialogue, read "The Dialogue Design".
- To see what the plan gains, read "The Plan's Parts".
- To decide the MVP's scope, read the last paragraph of "The Skill Boundary".
- To change the template, read "Plan-Template Changes".
- To change the design, read "Design Changes".
- To judge the design on a real page, read the replay and its comparison.
