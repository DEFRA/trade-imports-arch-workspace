---
title: "DR-EUDP-<NNN>: <Title>"
version: 0.1
---

# DR-EUDP-<NNN>: <Title>

| Status      | <Proposed / Accepted / Superseded>                          |
|-------------|-------------------------------------------------------------|
| Date        | <DD Month YYYY>                                             |
| Proposed By | <Name (Team)>                                               |
| Agreed On   | <DD Month YYYY, or TBC while Proposed>                      |
| Agreed By   | <Comma-separated list of people who have endorsed, or TBC>  |
| Decision    | <One-line summary of the decision>                          |

## Summary

<One paragraph in plain language. What was decided, in the terms a non-technical stakeholder would recognise. Then a short bullet list of the essentials: names, formats, dates, headline numbers.>

- <Key fact 1>
- <Key fact 2>
- <Key fact 3>

<If the same scheme / pattern extends to other cases, list them here too:>

- <Variant 1>
- <Variant 2>

## Context

<Why this decision was needed. What triggered the decision. What system, journey or programme is affected. Include the legacy or existing state being replaced or extended.>

<If two related-but-separate concerns needed a decision (e.g. business naming vs technical implementation), lay them out in a table so the reader can see them cleanly:>

| Concern | Owner | Outcome |
|---|---|---|
| <Concern 1> | <Owner> | <What was agreed for this concern> |
| <Concern 2> | <Owner> | <What was agreed for this concern> |

<A short paragraph noting when agreement was reached and by whom, and pointing to the underlying evidence (email thread, meeting, Slack, review) where useful.>

## Decision

<Adopt / apply / require>:

```
<Structural expression of the decision, if any. E.g. a format spec, a code fragment, a directory layout.>
```

![<Diagram alt text>](./diagrams/dr-eudp-<NNN>-<what-it-shows>.svg)

<If the decision is a format or structure, table its segments / rules:>

| Segment | Length | Rule |
|---|---|---|
| `<seg>` | <length> | <rule> |

<Worked examples for the reader who wants to see the decision applied:>

| Scenario | Example |
|---|---|
| <Scenario 1> | `<example>` |
| <Scenario 2> | `<example>` |

## Rationale

### <First rationale thread, e.g. "Why this option rather than the alternatives">

<Prose explaining the primary reason. If there is a decisive external endorsement (security, data architecture, product owner), lead with it and quote it verbatim so future readers can see the source:>

**<Endorsement label, e.g. Security recommendation (Joe Ball, Defra Security, DD Month YYYY).>** <Short lead-in sentence.>

> <Verbatim quote from the source.>

<Follow with supporting bullets covering the other properties of the chosen option:>

- **<Highlight of property 1>** <flowing into the rest of the sentence explaining why it matters>.
- **<Highlight of property 2>** <explanation continues inline>.
- **<Highlight of property 3>** <explanation continues inline>.

### <Second rationale thread, e.g. "Why this naming / structure">

- <Point 1>
- <Point 2>
- <Point 3>

### Addressability / usability

<How the decision holds up when used by humans over the phone, on paper, in email. Include phonetic examples where relevant.>

### Uniqueness

<How the decision guarantees uniqueness (if applicable). Cite the address space, allocator model or namespace pattern.>

### Stability

<Does the artefact hold for its lifetime? What is the immutability contract downstream systems can rely on?>

## Alternatives considered

| Option | Outcome |
|---|---|
| <Option 1> | <Rejected because … / Superseded by … / Adopted as fallback for …> |
| <Option 2> | <Outcome> |
| <Option 3> | <Outcome> |

## Out of scope

- <Thing this DR does not cover, and the owner of that thing.>
- <Thing 2.>
- <Thing 3.>

## Decision log

| Role | Name | Position |
|---|---|---|
| Format / decision owner | <Name (Team)> | <What they did / concluded> |
| Product owner | <Name (Team)> | <Position> |
| SME | <Name (Team)> | <Position> |
| Service design | <Name (Team)> | <Position> |
| Data & Integration | <Name (Team)> | <Position> |
| Security | <Name (Team)> | <Position> |
| Reuse / stewardship | <Name (Team)> | <Position> |
| Sponsor | <Name (Team) or TBA - Defra> | <Position> |

## Version history

| Version | Date | Author | Change |
|---|---|---|---|
| 0.1 | <YYYY-MM-DD> | <Name (Team)> | Initial draft published as *Proposed*. <One-line summary of what the first version captures.> |
