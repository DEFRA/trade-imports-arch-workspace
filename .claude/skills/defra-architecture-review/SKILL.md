---
name: "defra-architecture-review"
description: "Evaluate any architecture document (ADR, DR, Solution Overview, HLD, TDA submission) against Defra's DDTS doctrine, Strategic Architecture Principles and Must/Should/Could guardrails (defra.github.io/architecture), work out the governance route (team, SDA, TDA, TGB) and write the report under british-technical-writing. Use when asked to check, review, score or run a decision or design against the guardrails."
---

# Defra architecture review

Evaluate an architecture document against the three layers of Defra's architecture framework: the DDTS doctrine (7 non-negotiables set by the CDIO), the Strategic Architecture Principles (8, ids `GR-PRIN-01` to `GR-PRIN-08`) and the guardrails (Must, Should and Could defaults with stable ids such as `GR-HOST-01`). The doctrine sets direction, the principles apply it to technology change, and the guardrails turn both into testable defaults.

Source of truth: https://defra.github.io/architecture/ built from https://github.com/DEFRA/architecture (`docs/` folder, MkDocs). The framework is moving towards a final version under the CDIO; see "Keeping this skill current" at the end.

**Bash call hygiene** - one command per Bash call; paths in the literal `~/trade-imports-arch-workspace/...` form. Full rules: [`agent-skills.md`](../../best-practices/skills/agent-skills.md).

## Scope and Limits of the Review

- It is a structured check that gives the author the guardrail ids to cite, the departures to record, the gaps to fill and the governance route the work implies. The framework's own words: "a decision that is written down well rarely needs a meeting".
- It is not an approval. Only the team, its solution design authority (SDA), the Technical Design Authority (TDA) or the Technology Governance Board (TGB) approve. Say this once, at the end of the report.
- Departing from a guardrail is allowed. Should guardrails are "the strong default. There may be good reasons to differ"; the framework asks for the reasoning to be recorded in an ADR and shared with the SDA. Must guardrails need an approved exception from the TDA. Judge the quality of the reasoning, not the fact of departure.
- The framework is young. The doctrine is the CDIO's initial draft, almost every guardrail is `status: draft`, and some pages carry "To be confirmed" boxes. Draft guardrails are still the published default and still count, but say so where a verdict rests on one, and never present an unsettled rule as settled.
- Never invent Defra facts (names, contacts, approvals, platform capabilities, lead times). Where the document or the framework does not say, write it as an open question.

## Step 1: Read the document in full and name its shape

The document may arrive as a markdown file (the `trade-imports-documentation` repository uses `ADR-EUDP-NNN` and `DR-EUDP-NNN`), a PDF exported from Confluence (`pdftotext -layout` works well), a Confluence page, a GitHub URL (use the raw file), a PowerPoint or pasted text. Read all of it, including tables and the text of diagrams. A PDF-to-text extraction usually drops diagrams: either view the PDF pages, or name the diagrams in the report header as not reviewed. Do not guess what they showed.

Decide which of two shapes you are reviewing, because the scoping differs:

- **A decision document** (ADR, DR, exception request): one decision, its options and consequences. Scope to the guardrails that decision bears on.
- **A solution document** (Solution Overview, high-level design, TDA submission, design pack, alpha or beta architecture): a whole service or component that contains many decisions. Scope to every area the solution touches, use the stated phase's evidence as the test, and pull out the decisions that need their own record.

EU DP documents do not follow the Defra templates. Map whatever headings exist: a header table (Status, Date, Proposed by, Agreed on, Agreed by, Decision, Rationale, Related), then Context, Problem statement, Proposal or Options, Decision, Consequences, References; for a solution document, Scope, Context, Architecture, Integrations, Data, Security, NFRs, Risks. Missing sections are a finding for step 6, not a reason to stop. If the header contradicts itself (Status: Proposed next to "Agreed on ... SDA approval"), treat the agreement line as the fact in practice, and make fixing the status the first recommended change.

Before evaluating, write down for yourself:

- the decision (or the solution) in one sentence, its status and who agreed the decision
- the options considered, and whether the strategic option was one of them. The site currently publishes no list of strategic options (the technology capability options were removed in 0.3.0 pending review), so "strategic option" means the default a guardrail names: CDP for hosting, Defra ID and Entra ID for identity, the platform's observability tooling, an existing Defra or cross-government component, the site's own pattern for the problem. Where none is named for the area, say so in the report rather than marking the document down
- the constraints taken as given (an existing system such as Dynamics 365, a legal deadline, a supplier contract, a skills position)
- the delivery phase if stated (discovery, alpha, beta, live), because guardrails and their evidence are phased
- what the document explicitly leaves out of scope

These decide which guardrails are in scope, and they stop the review marking a document down for a decision it never claimed to make.

## Step 2: Refresh the source of truth

Guardrail ids are stable, but wording, level and status change (version 0.3.0 added three guardrails). A review that cites superseded wording misleads the SDA, so fetch the current text first. Try these in order and stop at the first that works; record which one and the version in the report header.

1. The published data file: `curl -sSL https://defra.github.io/architecture/guardrails.json`. It holds every guardrail and principle with `id`, `level`, `statement`, `why`, `how_to_meet`, evidence by phase, `status` and `url`, plus top-level `version`, `version_date` and `includes_unreleased_changes`. Every page also has a markdown copy at its address followed by `index.md`, for example `https://defra.github.io/architecture/principles/doctrine/index.md` and `https://defra.github.io/architecture/guardrails/apis-and-integration/index.md`.
2. The repository: `git clone --depth 1 https://github.com/DEFRA/architecture` into a scratch directory. A review reads a dozen or more pages (doctrine, principles, half the guardrail areas, governance, a pattern), so one clone beats many `raw.githubusercontent.com` fetches. Guardrail metadata (status, phases, evidence) is in each page's front matter; the statement follows the `## GR-XXX-NN` heading. Version in force: the top release in `CHANGELOG.md`. Unreleased changes: compare `HEAD` with the latest `vX.Y.Z` tag (`git ls-remote --tags https://github.com/DEFRA/architecture`); if they differ, say yes. The changelog's Unreleased section can be empty while `main` is ahead of the tag, so do not rely on that section.
3. WebFetch the site pages when there is no shell.
4. If nothing is reachable, use the snapshot at the end of this file and say so in the report, with the snapshot date.

Use the snapshot to scope (step 3). Fetch the full text (statement, why, how to meet it, evidence by phase) for the areas the document touches plus the areas holding the always-check guardrails below; that text decides a rating. Expect to read about half the area pages for a decision document and most of them for a solution document.

Things in the repository that are easy to miss:

- The seven decision-check questions are not in `docs/governance/decision-check.md` (a shell) but in the `QUESTIONS` array in `docs/javascripts/site.js`; `docs/governance/triage.md` has a five-question variant of the same tree.
- The patterns live in `docs/patterns/` (solution patterns such as `async-submission.md`, `acting-on-behalf.md`, `authoritative-source.md`, `file-upload.md`, `open-data-publishing.md`, and service patterns under `service/`), each with a `guardrails:` list in its front matter and a sentence on threats to put in the threat model.
- The phase evidence checklists (`docs/deliver/checklists/<phase>.md`) are generated from each guardrail's `phases` and `evidence_by_phase` front matter, so the front matter is the source. `delivery/lifecycle.yaml` lists the architecture artefacts a team produces (ADR log, C4 context and container diagrams, threat model, DPIA, and so on) and which guardrails each one evidences.
- The TDA submission template (`docs/governance/templates/tda-submission.md`) has a guardrails table with Yes / No / Partly; a review of a TDA submission can fill that table directly.

## Step 3: Scope the review

The test for whether a guardrail is in scope: would an SDA reasonably raise it when reading this document? Include a guardrail when the document meets it, departs from it, or ought to have addressed the guardrail. Leave out guardrails the document cannot affect; `GR-FE-01` (WCAG) is not "not addressed" in an event schema ADR.

Map what the document touches to the guardrail areas:

| The document is about | Areas to read in full |
| --- | --- |
| Integration, events, messaging, APIs, contracts, schemas | APIs and integration; Data (standards, authoritative sources); Observability (correlation ids) |
| Language, framework, library, tooling | Software development; Choosing technology (reuse, exit, open standards) |
| Hosting, environments, infrastructure, resilience | Hosting and platforms; Observability and operations; Sustainability |
| Buying, SaaS, a new supplier or product | Choosing technology; Security (supply chain); Identity (staff SSO for SaaS) |
| Sign-in, authorisation, service-to-service auth, secrets | Identity and access; Security; APIs (GR-API-07) |
| Data models, ownership, sharing, retention, personal data | Data; Security (classification); Hosting (UK data) |
| AI, agents, coding assistants | Artificial intelligence; Security; Data |
| Front end, forms, journeys, paper processes | Front end and accessibility; Digital first |
| Field tools, devices, offline | Field working and devices; Front end (low bandwidth) |
| Team shape, ownership, platform workarounds | Products and platforms |

Then look for a matching pattern in `docs/patterns/`. When the site has a pattern for the problem (an outbox for asynchronous submission, acting on behalf, an authoritative source, file upload, open data publishing), it is the framework's own worked answer: its `guardrails:` list tells you which guardrails the SDA will expect to see met, and its threats sentence is the test for `GR-SEC-02`. Departing from a pattern is one of the site's stated reasons an ADR exists, so note in step 6 whether the document cites the pattern or departs from it knowingly.

For messaging and event decisions, treat a topic, queue or event stream as an API for `GR-API-07`: publisher and consumer authentication, authorisation and input validation apply. If transport and access are decided in a related document, say so and rate Unclear with a pointer rather than Not addressed.

Some guardrails apply to almost every document, so check them each time:

- `GR-DEV-09` Record significant decisions as ADRs: for a decision document the record itself is evidence, so this is usually Met; for a solution document, see "Decisions inside a solution document" below.
- `GR-TECH-01` Look for something to reuse first (Must): any build, buy or choose decision. Did the document show the reuse check?
- `GR-TECH-03` Plan your exit before you enter: any new product, platform or significant supplier dependency.
- `GR-SUS-01` Consider sustainability in design decisions: it asks for environmental impact as a factor in ADRs on hosting, architecture and technology choices, so it is Not addressed in most documents that qualify.
- `GR-OPEN-01` Code in the open (Must) and `GR-DEV-02` All code in Defra source control (Must): where the work creates a new repository or component.

### Solution documents: the self-assurance checklist and the phase evidence

For a solution document, start from the site's "self-assure in 10 minutes" checklist, which is what an SDA runs first. Rate each of its ten points before anything else:

1. The service maps to one or more business capabilities, and the technology capabilities were checked for something to reuse (`GR-TECH-01`)
2. Hosted on a strategic platform (`GR-HOST-01`) or an agreed exception
3. Code in a Defra GitHub organisation and public unless there is a recorded reason (`GR-OPEN-01`)
4. Strategic identity services for customers and staff (`GR-IAM-01`, `GR-IAM-02`)
5. APIs documented with OpenAPI or AsyncAPI (`GR-API-02`)
6. Owner known for each data set, and authoritative sources used (`GR-DATA-01`, `GR-DATA-02`)
7. A current threat model (`GR-SEC-02`) and a DPIA where personal data is involved (`GR-DATA-06`)
8. Logs, metrics and alerts to the platform's observability tooling (`GR-OPS-01`)
9. WCAG 2.2 AA and the GOV.UK Design System (`GR-FE-01`, `GR-FE-02`)
10. Significant decisions recorded as ADRs (`GR-DEV-09`)

Then take every area the solution touches and, where a phase is stated, test each in-scope guardrail against its evidence for that phase (`evidence_by_phase` in the front matter, or the generated checklist page). A beta design is held to beta evidence ("the service runs on ...", "built and tested"), an alpha design to alpha evidence ("the design shows ...", "requested"). Say which phase you held it to. If no phase is stated, ask, and hold it to alpha in the meantime.

### Decisions inside a solution document

A solution document contains decisions that the framework expects to be recorded on their own (`GR-DEV-09`; the site's test is: hard or expensive to reverse, departs from a guardrail or pattern, affects other teams, chooses between real options, or someone in a year will ask why). List each one you find, whether it has an ADR or DR, and the governance route it would take on its own (step 5). This table is often the most useful part of a solution review, because it turns a design pack into the decision log the SDA will ask for.

## Step 4: Evaluate

### Ratings for guardrails

- **Met**: the document shows how the guardrail is met. Quote the evidence.
- **Partly met**: a guardrail with several clauses (for example `GR-API-04`: versioning and deprecation) where the document covers some and is silent on others. Name the clause that is missing.
- **Departure, recorded**: the work departs and the document says why. The guardrail's "if you cannot meet it" route applies (below).
- **Departure, not recorded**: the work departs without reasoning, or the document does not recognise the departure.
- **Not addressed**: in scope, but the document is silent. Say what one or two sentences would settle the gap.
- **Unclear**: the text does not let you tell. Write it as a question for the author.
- **Not applicable**: list only where a reader might expect the guardrail; one line.

The level sets the consequence of a departure, and the report must say which applies:

| Level | Departure means |
| --- | --- |
| Must | An exception request to the TDA plus an ADR. If the Must is a security control, the security exception process as well, with a time-limited accepted risk. |
| Should | Reasoning recorded in an ADR and agreed with the SDA. |
| Could | Note it; no process. |

Test against the guardrail's statement and its "how to meet it", not its title. Where the document states a constraint that makes the departure the right answer (a legacy case system, a statutory deadline), say so and rate the departure on whether the document records the reasoning, the risk and the way back. Where the guardrail page has a relevant "To be confirmed" box, say the rule is unsettled rather than marking the document down.

You may confirm public facts the document relies on, one request each: that a repository it names exists and is public (`GR-OPEN-01`, `GR-DEV-02`), that a path or schema it cites resolves, that a standard it invokes exists. A path that does not resolve, or a referenced repository whose README describes a different approach, is a real finding. Do not review the repository itself, and stop after one failed lookup. Internal inconsistencies (two namespaces, two values for the same field, two homes for the same artefact, a diagram that disagrees with the text) are findings too; list them under Document quality.

### Doctrine

For each of the seven non-negotiables that has a bearing, rate it **Aligned**, **In tension** or **Not engaged** (the work should have considered it and did not). Use the doctrine's own "For example" sentence as the test. The ones most often engaged by a technical document: 1 Platforms before projects (did it use or extend CDP and shared platforms rather than build its own?), 2 Standards before exceptions (does it start from the default and justify leaving the default?), 3 Reuse before buy (did it ask whether an existing capability meets the need?), 4 Data is an enterprise asset (does it keep data reusable, owned and sourced from authoritative sources?), 5 Assume AI (did it consider AI where the problem is repetitive or judgement-heavy, and record the reasoning either way?). A solution document for a user-facing service also engages 6 Outcomes over structures and 7 Digital first. Skip doctrines the work cannot touch; do not pad.

### Principles

Rate only the principles the work bears on, and test against the "How to follow it" bullets, not the headline. For example, `GR-PRIN-05` Connect and collaborate is tested by "expose well-documented, secure, reusable APIs by default" and "support event-driven architecture", `GR-PRIN-03` by "require justification for duplicating a capability" and "include cost-benefit analysis", `GR-PRIN-06` by "manage security in proportion to risk" and "role-based access control". Each doctrine item names the principles that apply it (the `applies` map in the doctrine page), so a doctrine finding usually has a principle finding beside it; say which.

## Step 5: Governance route

Apply the seven questions from the site's decision check. Yes on any question sets a minimum route; the highest wins. All No means the team self-assures and records the ADR; only Unsure answers means targeted advice from an architect. For a solution document, answer the questions for the solution as a whole and for each decision in the "Decisions inside a solution document" table.

| Question | If yes |
| --- | --- |
| Does it create, replace or retire a strategic platform, change Defra's technology strategy, or change a Must guardrail? | TGB |
| Would the team be unable to meet a Must guardrail (hosting off CDP, own sign-in, private code)? | TDA |
| Does it introduce a technology, supplier, integration pattern or use of AI that Defra has not used before? | TDA |
| Will other services, teams or arm's length bodies depend on it or be affected (shared API, shared data, identity change)? | TDA |
| Is there a high security or data protection risk, or a security control that cannot be met? | TDA |
| Does it choose something other than the strategic option in the technology capabilities, or depart from a Should guardrail? | SDA |
| Would it be expensive or slow to reverse (long contract, lock-in, data migration) without an exit plan? | SDA |

A phase gate (alpha, beta, live assessment) or a significant change also goes to the SDA, whatever the answers. Compare the suggested route with how the document was actually agreed (its Decided by or Agreed by). If it was agreed at a lower level than the questions suggest, say so plainly; it is the most useful single finding a review can give.

## Step 6: Document quality, briefly

Check the document against the site's guidance for its shape, in one short paragraph or a checklist. Keep it secondary to the three pillars.

For a decision document, the site's "How to write a good ADR" and its template:

- One decision per record, about a page.
- Context clear to someone who was not in the room.
- Real options, including the default the framework names for the area where there is one (see step 1).
- Guardrail ids cited (the template has a `Guardrails:` header line, for example `GR-HOST-01 (met), GR-DEV-01 (departure - see below)`), and capability ids where known.
- The matching site pattern cited, or the departure from it explained.
- Honest consequences: what gets harder, risks accepted, follow-up work, and an exit (how to reverse it).
- An accepted record is never edited; it is superseded by a new one that links back. Say which applies to the changes you recommend.
- Internal consistency: names, values and locations agree between the prose, the tables and the examples.

For a solution document, the TDA submission template and the lifecycle artefacts:

- Phase stated, and SDA consulted (named).
- Business capabilities and level 2 technology capabilities named.
- C4 context and container diagrams present (they evidence `GR-HOST-01`, `GR-API-05`, `GR-IAM-01`, `GR-DATA-02`), and consistent with the text.
- A guardrails table (Yes / No / Partly) and links to ADRs; threat model and DPIA status stated.
- NFRs stated against the site's service tiers where the document claims availability, recovery or performance figures.

## Report

Load the `british-technical-writing` skill with the Skill tool before writing the report (it may be listed with a plugin prefix such as `anthropic-skills:british-technical-writing`), and write the report under that skill. That skill enforces plain technical British English: no American colloquialisms, no marketing or sales language, no rhetorical or conversational phrasing, no em dashes. If a `banned-phrases` skill is listed, apply it too. If neither is available, apply those rules yourself and say so in one line at the end of the reply.

Lead with the bottom line. Cite ids. For every rating other than Met, quote the document briefly or state that it is silent, so the author can check the claim. Length follows the findings: two to four pages for a decision document, longer for a solution document, with the tables carrying the detail. Do not pad with Not applicable rows, and do not cut a finding to fit.

```
# Review of <document id and title> against the Defra architecture framework

Checked against: defra.github.io/architecture version <x.y.z> (<date>; unreleased changes included: yes/no),
  read via <route>; or: the snapshot in this skill, dated <date>, because the site was not reachable
Document: <shape: decision document or solution document>; status <status>, agreed by <who>, dated <date>;
  phase held to: <phase>; <anything not reviewed, such as diagrams lost in extraction>

## Summary
Two to four sentences: the decision or solution, whether it sits inside the guardrails, the
departures to record, the gaps to fill, and the governance route.

## Self-assurance checklist            (solution documents only)
| # | Point | Guardrails | Rating | Evidence or gap |

## Guardrails
| Id | Level | Status | Rating | Evidence or gap |
Departures first, then Not addressed, then Partly met, then Unclear, then Met. Not applicable last, if at all.

## Decisions inside this document      (solution documents only)
| Decision | Recorded? (ADR or DR id) | Guardrails touched | Route on its own |

## Doctrine
| # | Doctrine | Bearing on this work | Assessment |

## Principles
| Id | Principle | Tested against | Assessment |

## Governance route
The seven answers, the suggested route, and how that compares with how the document was agreed.

## Document quality
The step 6 checklist, then any internal inconsistencies.

## Recommended changes
Numbered, concrete, smallest first. For a decision document always include the `Guardrails:`
header line to add, for example `GR-API-05 (met), GR-API-02 (met), GR-DEV-01 (departure, see
Consequences)`. For a solution document include the guardrails table in TDA form (Yes / No /
Partly) and the ADRs or DRs to write. Then: reasoning to add for each departure, missing
consequences or exit, exception requests to raise, open questions to answer before SDA or TDA.

## Open questions for the author
What the review could not settle from the text.

This review tests the work against the published defaults. It does not approve it;
approval sits with the team, the SDA, the TDA or the TGB.
```

Deliver the report in the reply by default. Write it to a file only when asked; a path the user gives wins, otherwise put it next to the document as `<document-file-name>-architecture-review.md`. Never edit the document itself; offer to draft the changes (header line, departure reasoning, TDA guardrails table, exception request from the site's template, the ADRs or DRs a solution document needs) as a follow-up. For several documents at once, write one report each and add a short cross-document table (document, departures, route suggested against route taken) at the top of the reply.

## Keeping this skill current

The CDIO is moving the doctrine, principles and guardrails towards a final version, so this skill will need to change with the framework. The live fetch in step 2 keeps individual reviews correct in the meantime; the parts of this file that go stale are the snapshot below and any statement about what the site does or does not publish (for example the note in step 1 that no strategic options are listed, and the three-guardrail count for 0.3.0).

When a new release appears (`CHANGELOG.md` or https://defra.github.io/architecture/about/releases/), or when a review finds the live text disagreeing with this file:

1. Clone the repository and read `CHANGELOG.md` for what changed: new, deprecated or re-levelled guardrails, doctrine wording, governance routes, templates.
2. Regenerate the snapshot. Each guardrail is a `## GR-XXX-NN Title {#gr-xxx-nn}` heading in `docs/guardrails/*.md` (principles in `docs/principles/architecture-principles.md`) followed by `<span class="rfc rfc--must|should|could|principle">` and the statement; status and phases are in the page front matter under `guardrail_defaults` and `guardrails`. The doctrine items are `## N. Title {#ddts-NN}` headings in `docs/principles/doctrine.md` with an `applies` map in the front matter. Keep the id, level, title and statement for every guardrail; drop nothing, because deprecated ids may still be cited in older documents (mark them deprecated instead).
3. Update the snapshot date and version line, re-check the seven questions against `docs/javascripts/site.js`, and re-check the self-assurance checklist against `docs/guardrails/index.md`.
4. Propose the updated skill as a whole (the skill proposal replaces the entire file), with a one-line note of what changed in the framework.

## Snapshot of the framework (fallback only)

Taken from `DEFRA/architecture` `main` on 2026-10-14 (site version 0.3.0 of 2026-10-06 plus unreleased changes). Use it to scope and when the site is unreachable; the live text decides a rating. All guardrails below were `status: draft` except the principles, which were endorsed.

### DDTS doctrine (7 non-negotiables)

1. **Platforms before projects. Built as products.** Reusable platforms and long-lived products over one-off solutions. Applies `GR-PRIN-01`, `GR-PRIN-03`; shows up in `GR-HOST-01`.
2. **Standards and guardrails before exceptions.** Use approved identity, security and hosting patterns by default; exceptions only for a clear business need. Applies `GR-PRIN-01`, `GR-PRIN-06`; shows up in `GR-IAM-01`, `GR-SEC-01`, `GR-HOST-01`.
3. **Reuse before buy.** Before procuring, ask whether an existing capability, platform or service meets the need. Applies `GR-PRIN-03`; shows up in `GR-TECH-01`.
4. **Data is an enterprise asset.** Data belongs to the organisation, not to systems or teams; do not ask for the same information twice. Applies `GR-PRIN-04`, `GR-PRIN-05`; shows up in `GR-DATA-01`, `GR-DATA-04`.
5. **Assume AI until proven otherwise.** Deliberately explore whether AI improves the outcome before defaulting to a traditional approach. Applies `GR-PRIN-07`, `GR-PRIN-04`; shows up in `GR-AI-01`.
6. **Outcomes and services over organisational structures.** Design the end-to-end service for the user across team and organisational boundaries. Applies `GR-PRIN-02`, `GR-PRIN-05`.
7. **Digital first where appropriate.** Challenge manual and paper processes by default. Applies `GR-PRIN-02`, `GR-PRIN-08`.

### Architecture principles (8, endorsed)

- `GR-PRIN-01` **Delivery-focused architecture**: architecture is a service to delivery teams; lightweight governance built into delivery, automated guardrails over manual reviews, observability, loose coupling for incremental change.
- `GR-PRIN-02` **Design for users**: intuitive, accessible, consistent solutions; GDS-based UI standards; reuse familiar processes across Defra.
- `GR-PRIN-03` **Maximise value, minimise waste**: reuse platforms, APIs and components before custom development; cost-benefit in decisions; justification required for duplicating a capability.
- `GR-PRIN-04` **Clean data, clear decisions**: data ownership and quality standards; aligned definitions and formats; governed APIs for access; AI for data quality and insight.
- `GR-PRIN-05` **Connect and collaborate**: well-documented, secure, reusable APIs by default; industry standards; event-driven architecture; single sign-on; share clean data respecting privacy.
- `GR-PRIN-06` **Secure today, safe tomorrow**: security proportionate to risk, built in from the start; follow Defra group Security; role-based access control.
- `GR-PRIN-07` **`Empower to innovate`** (the principle's published title): sandboxes and playbooks for experimentation; lightweight governance with automated controls; pilots of emerging technology; measure innovation by value and learning.
- `GR-PRIN-08` **Right tools, right place**: devices and tools fit for laboratories, field and remote work; offline-first; security extended to every device.

### Guardrails by area (id, level, title: statement)

**Choosing technology**
- `GR-TECH-01` Must. Look for something to reuse first: before buying or building, check the technology capability catalogue and cross-government components for something that already meets the need.
- `GR-TECH-02` Should. Buy commodity, build differentiating: buy or use SaaS for commodity needs; build only where the capability is specific to Defra's mission and no product fits without heavy customisation.
- `GR-TECH-03` Should. Plan your exit before you enter: any new product, platform or significant supplier dependency has a documented exit plan covering data export in open formats, contract terms and switching cost.
- `GR-TECH-04` Must. Assess SaaS before you adopt it: security, data protection, data location, accessibility and integration assessed before contract.
- `GR-TECH-05` Should. Prefer open standards and portable technology that can run on more than one provider.
- `GR-TECH-06` Must. Get spend approval early: spend under the government digital and technology spend control is discussed with the architecture team before procurement starts.

**Hosting and platforms**
- `GR-HOST-01` Must. Use Defra's strategic delivery platform by default: new digital services are hosted on the Core Delivery Platform (CDP) unless an exception has been agreed.
- `GR-HOST-02` Should. Public cloud first: where CDP cannot be used, a Defra-managed public cloud tenancy; no new on-premises hosting.
- `GR-HOST-03` Should. Everything as code: infrastructure, configuration, pipelines and policies as code, deployed through pipelines; no manual changes to production.
- `GR-HOST-04` Should. Use managed services before self-managed.
- `GR-HOST-05` Should. Consistent, disposable environments from the same code; production data never copied to lower environments unless anonymised.
- `GR-HOST-06` Should. Host data in the UK: OFFICIAL data held in UK regions unless an approved exception exists.
- `GR-HOST-07` Should. Design for the resilience the service needs: agreed RTO and RPO, multi-zone design, recovery tested at least yearly.

**Software development**
- `GR-DEV-01` Should. Use the supported languages and frameworks: Defra's approved technologies for new services so skills, libraries and support are shared.
- `GR-DEV-02` Must. All code in Defra source control: all source, infrastructure and pipeline code, including suppliers', in a Defra-owned GitHub organisation from day one.
- `GR-DEV-03` Should. Protect the main branch: pull requests with at least one review and passing checks.
- `GR-DEV-04` Should. Continuous integration and delivery: every change built, tested, scanned and deployed by a pipeline; small, frequent, reversible releases.
- `GR-DEV-05` Should. Automated testing at the right levels: unit, integration/contract, end-to-end, accessibility, performance and security tests in the pipeline.
- `GR-DEV-06` Should. Manage dependencies actively: automated updates, software composition analysis, supported runtimes.
- `GR-DEV-07` Should. Follow shared coding standards: linting, formatting and the Defra software development standards.
- `GR-DEV-08` Should. Document as you go: README with run, test, deploy and links to ADRs.
- `GR-DEV-09` Should. Record significant decisions as ADRs, kept with the code or linked from the README.

**APIs and integration**
- `GR-API-01` Should. API first: design the API for a capability before or with the user interface.
- `GR-API-02` Should. Describe APIs with open specifications: OpenAPI 3 for synchronous, AsyncAPI for asynchronous and event interfaces, in the same repository as the code.
- `GR-API-03` Should. Follow government API standards: RESTful resources, JSON, HTTPS only, consistent errors, standard identifiers.
- `GR-API-04` Should. Version and deprecate deliberately: breaking changes versioned, consumers told in advance, retirement dates published.
- `GR-API-05` Should. No integration through shared databases: integrate through APIs, events or governed data products.
- `GR-API-06` Should. Use events for change notifications rather than polling.
- `GR-API-07` Must. Secure every API: authenticate callers (OAuth 2.0 / OpenID Connect or mutual TLS), authorise every request, validate input, rate limit. No API is "internal so it's safe".
- `GR-API-08` Should. Make APIs discoverable: register in the platform API catalogue and, where useful beyond Defra, the government API catalogue.

**Identity and access**
- `GR-IAM-01` Must. Use the strategic customer identity services: Defra Customer Identity (Defra ID, using GOV.UK One Login and Government Gateway); services do not build their own sign-in.
- `GR-IAM-02` Must. Staff sign in with Microsoft Entra ID with MFA, including SaaS; no local staff accounts.
- `GR-IAM-03` Must. Authorise on least privilege: users, services and pipelines get only the permissions they need, through roles or groups, reviewed regularly.
- `GR-IAM-04` Should. Separate authentication from authorisation: identity provider establishes who; business authorisation rules explicit, testable and in the right service.
- `GR-IAM-05` Must. No secrets in code: managed secrets store, rotation, workload identity over long-lived keys.
- `GR-IAM-06` Must. Privileged access is controlled and audited: just-in-time, phishing-resistant MFA, logged to the SOC.

**Data**
- `GR-DATA-01` Should. Every data set has a named business owner and is in the information asset register.
- `GR-DATA-02` Should. Use authoritative sources for shared entities (customers, organisations, land parcels, holdings, locations, species) rather than local copies that drift.
- `GR-DATA-03` Should. Use agreed data standards and identifiers for dates, addresses, locations, identifiers and code lists.
- `GR-DATA-04` Should. Collect once, share safely: do not ask users for information Defra already holds; share through APIs or governed data products, with data sharing agreements where required.
- `GR-DATA-05` Should. Describe your data: publish metadata (UK GEMINI for geospatial, DCAT otherwise).
- `GR-DATA-06` Must. Protect personal data by design: DPIA before processing personal data, minimise collection, automate retention and deletion.
- `GR-DATA-07` Should. Open by default: publish non-personal, non-sensitive data as open data.
- `GR-DATA-08` Should. Manage data quality using the Government Data Quality Framework, especially for data feeding payments, regulatory decisions or statistics.
- `GR-DATA-09` Must. Retain and dispose of records properly under Defra's retention schedules.
- `GR-DATA-10` Should. Handle research data safely: informed consent, approved storage and tools, deletion when no longer needed.
- `GR-DATA-11` Should. No real personal data in prototypes, research materials or test environments.

**Security**
- `GR-SEC-01` Must. Follow Secure by Design: every new service and significant change, with a named risk owner, from discovery onward.
- `GR-SEC-02` Must. Keep a current threat model: created in alpha, revisited at every significant change and at least annually.
- `GR-SEC-03` Must. Classify information: identify the security classification and data types handled; design controls to match.
- `GR-SEC-04` Must. Encrypt in transit and at rest: TLS 1.2 or higher for all traffic, encryption at rest.
- `GR-SEC-05` Must. Scan continuously and fix quickly: static, dependency, container and infrastructure scanning; critical fixed in 14 days, high in 30, or a recorded risk decision.
- `GR-SEC-06` Must. Test before go-live and after major change: independent IT health check proportionate to risk.
- `GR-SEC-07` Must. Log for detection and response: security-relevant events to the SOC.
- `GR-SEC-08` Should. Protect the supply chain: assess suppliers and products, pin and verify dependencies, keep a software bill of materials.
- `GR-SEC-09` Must. Manage risk explicitly: where a control cannot be met, record the risk and have it accepted through the security exception process; accepted risks are time-limited.

**Observability and operations**
- `GR-OPS-01` Should. Use the platform's observability tooling for logs, metrics and traces; security events to the SOC.
- `GR-OPS-02` Should. Log in a structured, safe way: JSON logs with correlation identifiers across service boundaries; never log secrets, tokens or unnecessary personal data.
- `GR-OPS-03` Should. Define and measure service levels: SLOs for availability, latency and correctness; alert on what matters to users.
- `GR-OPS-04` Should. Health checks and graceful degradation: health endpoints, timeouts and retries, degrade gracefully when a dependency fails.
- `GR-OPS-05` Must. Be ready for live before you go live: support model, on-call, runbooks, incident process, named owner; registered in the service catalogue.
- `GR-OPS-06` Should. Learn from incidents: blameless post-incident reviews, lessons shared.
- `GR-OPS-07` Should. Measure performance and cost: mandatory KPIs published; cloud resources tagged to service and business capability.

**Front end and accessibility**
- `GR-FE-01` Must. Meet WCAG 2.2 AA, tested with assistive technology, with an accessibility statement.
- `GR-FE-02` Must. Use the GOV.UK Design System for public-facing services; staff-facing should too.
- `GR-FE-03` Should. Progressive enhancement: core journeys work without JavaScript and are server-rendered.
- `GR-FE-04` Should. Consider forms platforms first for form-based services.
- `GR-FE-05` Should. Design for low bandwidth and rural users: light pages, save progress, consider offline for field tools.
- `GR-FE-06` Must. Support Welsh where required: Welsh Language Standards where they apply; design for translation from the start.
- `GR-FE-07` Should. Tell users what is happening when things fail or are slow: clear message, whether work is saved, what to do next.

**Open source and working in the open**
- `GR-OPEN-01` Must. Code in the open: new source code public from the start in a Defra GitHub organisation unless there is a recorded reason to keep a repository private.
- `GR-OPEN-02` Should. Licence clearly: OGL or MIT, with a LICENCE file in every repository.
- `GR-OPEN-03` Should. Publish safely: secret scanning and push protection on every repository.
- `GR-OPEN-04` Should. Reuse and contribute back rather than forking or rewriting.
- `GR-OPEN-05` Could. Blog and show the thing.

**Artificial intelligence**
- `GR-AI-01` Should. Consider AI first: actively explore whether AI improves quality, productivity, user experience or outcomes before choosing a traditional approach, and record the reasoning either way.
- `GR-AI-02` Must. Use approved AI services and tenancies: AI runs in Defra's cloud tenancies or under approved enterprise agreements; Defra data only goes into AI tools as the AI digital toolkit rules allow.
- `GR-AI-03` Must. Keep a human accountable for decisions with legal or significant effects, with the ability to challenge.
- `GR-AI-04` Must. Be transparent: Algorithmic Transparency Recording Standard record where in scope; tell users when they interact with AI.
- `GR-AI-05` Should. Evaluate, monitor and threat model AI: accuracy, bias and safety before release; AI-specific threats in the threat model.
- `GR-AI-06` Should. Talk to the TDA about novel use of AI, and any generative AI in decision making.
- `GR-AI-07` Should. Suppliers use AI coding assistants openly and safely: tools agreed with Defra, terms meeting GR-AI-02, human review of every change, AI's significant work declared.
- `GR-AI-08` Should. Give agents the least privilege they need, under their own identity.
- `GR-AI-09` Should. Get human approval for consequential or hard-to-undo agent actions.
- `GR-AI-10` Should. Keep an audit trail of what agents do; security-relevant events to monitoring.
- `GR-AI-11` Should. Defend agents against prompt injection: treat everything an agent reads as untrusted input.

**Sustainability**
- `GR-SUS-01` Should. Consider sustainability in design decisions: include environmental impact as a factor in ADRs for hosting, architecture and technology choices.
- `GR-SUS-02` Should. Right-size and switch off: autoscaling, scale non-production down out of hours, delete unused resources.
- `GR-SUS-03` Could. Choose lower-carbon regions and services where data rules allow.
- `GR-SUS-04` Should. Keep data and pages lean.
- `GR-SUS-05` Could. Measure and report the carbon footprint alongside cost.

**Products and platforms (draft page)**
- `GR-PROD-01` Should. Fund and run products, not projects: long-lived team that keeps improving the service.
- `GR-PROD-02` Should. Name the product owner and service owner.
- `GR-PROD-03` Should. Contribute to platforms rather than working around them: raise gaps with the platform team instead of building a local workaround.
- `GR-PROD-04` Should. Plan for the end of a product's life.

**Digital first and end-to-end services (draft page)**
- `GR-DIG-01` Should. Challenge paper and manual processes: do not put a paper or email process online as it is.
- `GR-DIG-02` Should. Design across organisational boundaries from the user's point of view.
- `GR-DIG-03` Should. Provide assisted digital and offline routes leading to the same outcome and data.

**Field working and devices (draft page)**
- `GR-FIELD-01` Should. Choose devices that suit the job, from research into where and how people work.
- `GR-FIELD-02` Should. Design field tools to work offline and sync safely.
- `GR-FIELD-03` Should. Manage and secure every device: enrolled, encrypted, patched, remotely wipeable.
- `GR-FIELD-04` Could. Check connectivity before you design.