# Plan Template

A plan records what a document says, and the authoring skill writes only from the plan. A plan comes out of the planning conversation in [planning.md](../references/planning.md), and an author may also write one by hand. The full form serves a new document or slide deck, the line-edit form an existing page, and the short-artefact form a pull request body, ticket or commit message. `hedy plan check` parses the labels and headings below, so a plan keeps them exactly.

## Layout Rules

- Line 1 names the form: `Form: full`, `Form: line edit` or `Form: short artefact`.
- A field is one line: `Label: value`.
- Part headings are level-2 headings as shown, and a section heading reads `## Section: <heading>`.
- A question is a list item `- Q<n>: <question>`, numbered from 1: the question a section's point raises in the reader.
- A delivery line is a list item `- D<n>: <what the reader comes away with>`, numbered from 1 within each section: a noun phrase, never a question. A page section has two to four, and a slide exactly one, its point.
- An item is a list item ending on `[delivers: D<n>] [source: <reference, with version or date>]`.
- An open item is `- Open: <point>`, followed by an indented `Answer: <answer>` or `Answer: [pending]`.
- `Detail` names both rungs and the test a detail passes to descend.
- In `Image` and `Excludes`, `none` counts as a value.
- `Words` is the section's word allotment, or a slide's word count.
- A full plan is complete when every field holds a value, every section has `Point`, `Delivers`, `Form`, `Image`, `Words` and `Answers`, every delivery line has at least one item, and some section's `Answers` names every question.
- A line-edit plan is complete when every field holds a value, every section has `Point` and `Answers`, and some section's `Answers` names every question. Delivery lines, items, images and lengths belong to the full form only.
- A short-artefact plan holds a `Purpose` and at least one point. No file check runs, and the skill asks the author for anything missing.

## Full Form

```
Form: full
Title: <document title>
Reader: <role, what the reader knows, what needs introducing>
Purpose: <what the reader can do after reading>
Document type: <such as explanation, how-to, decision record or slide deck>
Opening: <the situation the reader accepts, then the complication that raises the reader's question>
Governing thought: <the one claim the sections support>
Detail: <the highest rung, the lowest rung, and the test a detail passes to descend>
Excludes: <what the document leaves out, or none>

## Questions
- Q1: <the question a section's point raises in the reader>

## Section: <heading>
Point: <the one sentence the section establishes>
Delivers:
- D1: <what the reader comes away with>
Form: <prose, numbered list, bullets, table or diagram>
Image: <what the image shows and why the reader needs the image, or none>
Words: <the section's word allotment>
Answers: Q1
Items:
- <an item at the detail the section needs> [delivers: D1] [source: <reference>]

## Open Items
- Open: <a point the material leaves undecided>
  Answer: <the author's answer, or [pending]>
```

## Line-Edit Form

The skill proposes this plan from the page, adding no point the page lacks, and edits once the author agrees the plan.

```
Form: line edit
Page: <path of the page>
Reader: <role, what the reader knows>
Purpose: <what the reader can do after reading>
Document type: <the page's type>

## Questions
- Q1: <a question the page answers>

## Section: <the page's heading>
Point: <the section's point, taken from the page>
Answers: Q1

## Open Items
- Open: <a question the edit raises>
  Answer: <the author's answer, or [pending]>
```

## Short-Artefact Form

```
Form: short artefact
Artefact: <pull request body, ticket or commit message>
Purpose: <what its reader must know or do>
Points:
- <one point the artefact makes>
```

## Worked Full Plan

The system below is invented.

```
Form: full
Title: Duplicate Event Handling in the Order Consumer
Reader: An engineer who will change the consumer and knows message queues and SQL transactions, and not the consumer's handler.
Purpose: The reader can explain why a redelivered event does not repeat its work, and judge whether a proposed change breaks that property.
Document type: explanation
Opening: The broker delivers every event at least once. A redelivered event repeats its work unless the consumer recognises the event.
Governing thought: The consumer records each event ID in the same transaction as the event's result, so a redelivered event is acknowledged without repeating the work.
Detail: The highest rung is each section's property. The lowest rung is one order event delivered twice, with names as the code writes them. A setting appears only where changing the setting breaks the property.
Excludes: The broker's configuration beyond the redelivery timeout. The business rules that apply an order.

## Questions
- Q1: When does the broker deliver one event twice?
- Q2: How does the consumer recognise a duplicate?
- Q3: What happens when the database is unavailable?
- Q4: Which changes would let a duplicate repeat its work?

## Section: Redelivery
Point: The broker delivers every event at least once, and again after 30 seconds without an acknowledgement.
Delivers:
- D1: the broker's redelivery timeout
- D2: two deliveries of one event running at once
Form: prose
Image: A timeline of one order event delivered twice across the broker, consumer and database, because the reader needs to see the overlap.
Words: 250
Answers: Q1
Items:
- Redelivery after a 30-second visibility timeout [delivers: D1] [source: config/queue.yaml, visibilityTimeout]
- A commit slower than the timeout lets two deliveries run at once [delivers: D2] [source: design review record, 12 March 2026]

## Section: Duplicate Check
Point: The consumer stores the event ID and the result in one transaction, and acknowledges a duplicate without processing the duplicate.
Delivers:
- D1: the consumer's steps for each event
- D2: the unique key that stops a second apply
Form: numbered list
Image: none
Words: 300
Answers: Q2
Items:
- The steps: begin, insert the ID, apply the result, commit, acknowledge [delivers: D1] [source: src/consumer/handler.ts, handle()]
- A duplicate insert fails on `processed_events.event_id`, and the handler acknowledges without applying [delivers: D2] [source: migrations/004_processed_events.sql]

## Section: Failure Cases
Point: Every failure leaves the event unacknowledged, so the broker redelivers the event.
Delivers:
- D1: the state each failure leaves behind
- D2: the failure that needs an operator
Form: table
Image: none
Words: 200
Answers: Q3
Items:
- Database unavailable: the transaction fails, with no acknowledgement [delivers: D1] [source: src/consumer/handler.ts, error branch]
- A malformed event fails every delivery until the attempt limit parks the event [delivers: D2] [source: src/consumer/handler.ts, parse()]

## Section: Rules for Changes
Point: A change keeps the insert and the result in one transaction, and acknowledges after the commit.
Delivers:
- D1: the two rules a change keeps
- D2: the loss when a change drops a rule
Form: bullets
Image: none
Words: 200
Answers: Q4
Items:
- One transaction holds the insert and the result, and the acknowledgement follows the commit [delivers: D1] [source: src/consumer/handler.ts, handle()]
- An acknowledgement before the commit loses the event on a crash [delivers: D2] [source: design review record, 12 March 2026]

## Open Items
- Open: the retention period for stored event IDs
  Answer: 14 days (author, 3 November 2026)
- Open: the attempt limit before a failing event is parked
  Answer: [pending]
```
