# Planning Workflow

The planning workflow turns the material an author points at into a plan the author agrees. The author talks and you play back. You write the plan in the full form of [plan-template.md](../assets/plan-template.md). A fresh agent drafts only from the plan, so everything the drafting needs from the material must reach the plan.

Each of your turns returns the plan so far and puts the turn's decisions to the author as one batch of prompts with the question tool, in the question form `SKILL.md` sets. Each option shows a preview sentence of the plan or page under that option, and the recommended option comes first.

## Limits of the Role

Planning reads and organises the material. Planning does not check facts, produce new findings from the data, write the document's prose or draw images. A preview sentence shows the effect of a choice and is never draft text for the page. An image is described in the plan and drawn at drafting. Where the material is silent, contradicts itself or rests on a record not yet agreed, the point becomes an open item for the author, never a gap you fill. The author chooses the material and owns every judgement about content, including whether a claim is true.

## Reading the Material

Read every file, record and page the author points at before asking anything. Note each source's stated status: agreed, accepted, proposed, draft or code. Reading first finds what the author's words miss, such as a second reader. Read nothing the author did not point at.

## Opening Questions

Ask the three questions with the question tool, one question per page. Each page offers two or three suggested answers drawn from the material, each with a preview sentence, and the author can answer in their own words through Other:

1. The reader, and the reader's next action after reading.
2. The things that matter most. The question text says that the author can write their own paragraph in Other, with as many things as there are.
3. The depth of the page: how far into the mechanism, the configuration or a worked case the page goes.

Never ask the author for one sentence or for a short list of points, because authors find both hard to give. You distil the main sentence and the points from the paragraph and the material.

## Play-Back of the Reader, Purpose and Opening

Play back the reader, purpose and opening as you heard and read them, then put the choices as prompts. A suggested answer the author chose counts as your wording, and only text the author wrote in Other counts as the author's own words. When the author chose a suggestion for what matters most, derive the points from that suggestion and the material, and ask the author in the play-back whether anything is missing.

- **Reader.** The role, what the reader knows and the terms the reader does not know. Where the material names a reader the author did not, such as a team that builds to the design, offer the wider reader as an option.
- **Purpose.** The actions the reader can take after reading, such as stating a duty or judging a trade-off. A purpose that lists the page's content, such as "a complete overview", gives the writer no reason to leave anything out. Name that risk and offer outcomes instead.
- **Opening.** The situation the reader accepts, then the complication that raises the reader's question, in the author's own phrasing where the author wrote some.
- **Main sentence.** Two or three options for the one claim every section supports, each with its preview and the consequence of the choice. When the author wrote words of their own, the first option is those words, lightly joined into one sentence, and your distillation is an alternative, never a replacement. Otherwise every option is yours, and the play-back says so. An option that follows the components produces a tour, and an option that serves one reader can leave another reader without what that reader needs.

The main sentence goes in the plan's `Governing thought` field. Record the key phrases the author wrote in the plan as items of the sections they serve, each ending on `[delivers: D<n>] [source: the author, <date>]`, so the drafting writes from the author's words.

## Points and Their Questions

The main sentence raises one question in the reader. The points are the answers to that question, and you derive the points from the author's paragraph and the material. Each point raises a question in the reader, which the point's section answers. Derive each question from its point and test the question against the reader. A question this reader would not ask means the point serves nobody, so the point goes to the author. A question the author brought that answers no point drops out. Never ask the author to list the points or the questions.

When more than one grouping fits the material, such as by property, by party or by the path an event takes, offer the groupings as a prompt. Each option's preview is the heading and opening point of one section under that grouping, with the consequence: a grouping by party splits each property across several sections, and a grouping by path reads as a tour.

## The Four Checks

Run each check on the points before the walking skeleton, and play back the result of each check:

1. **One category per level.** The points at one level belong to one category, such as properties the design keeps or stages of a process. A point of another category moves to another level or into another point's section.
2. **Gaps in both directions.** Every point has material behind the point. Every duty, claim or concern in the author's paragraph and the material maps to a point or to the exclusions. A check run only from the points to the material misses a duty no point holds.
3. **Terms before use.** A term that two sections use is introduced in or before the first of those sections. Name the section that introduces each shared term, such as a message envelope before the sections that use its fields.
4. **Consequence if false.** Name the source each point rests on. For a point that rests on a proposed or draft record, or on no record, ask the author to state the conclusion the reader would get wrong if the point were false. That point is an open item until the author answers. For a well-sourced point, state the consequence yourself for the author to confirm.

A check's result changes the points or becomes an open item. Never resolve a check's result by adding a fact the material lacks.

## Open Items

Put each open item to the author with the question tool in the turn that finds the item: a gap in the material, a contradiction between sources, a point that rests on a proposed record, or a reader the material names and the author did not. An item the author settles goes in the plan's Open Items with the answer. An item that needs further analysis stays `[pending]` and names the section that waits for the answer.

## Detail Rule and Exclusions

Show one fact from the material on each rung: the claim a section makes, the mechanism named by its role, the configuration value, and one concrete instance such as a named event or a worked failure. Then propose the detail rule as a prompt, guided by the author's answer on depth. The rule names three things:

- The highest rung, usually the claim each section makes.
- The lowest rung, usually one concrete instance per section, with the names a reader meets in the system: event types, envelope fields and component names, written as the system writes them, such as `eventId`. A page held on one rung either hides the mechanism or reads as a service manual, so the rule always names two rungs.
- The test a detail passes to descend. A configuration value, such as an interval, a count or a limit, appears only where the value changes the reader's conclusion. Leaving out configuration never means leaving out names.

Each option's preview is one sentence at the rung the option sets. Propose the exclusions with the rule, each named, such as configuration, processing beyond a boundary or superseded positions. An exclusion that removes a duty the reader needs goes to the author as an open item.

## Walking Skeleton

The walking skeleton is where you do the information architecture. Show the skeleton to the author as the page's outline, with the headings in reading order, never as a table, and put each section to the author to keep or change. Each section holds:

- **Heading.** The shortest plain noun label for the topic, such as "Consumer Contract", "INS Domain Boundaries" or "Limitations", with no articles, no -ing forms and no qualifiers such as "Known", written to "Headings and labels" in [writing.md](../../../best-practices/writing/writing.md).
- **Point.** The one sentence the section establishes, which becomes the section's `Point`.
- **Delivery lines.** Two to four lines, roughly one per paragraph, each a noun phrase naming one thing the reader comes away with, such as "the meaning of a fat event", "the events that stay inside INS" or "the frequency of lifecycle events". A delivery line is never a question or half-question, because plan wording flows into the page.
- **Form.** Chosen by the type of information, to "Choosing a form" in writing.md: prose for a concept or causal explanation, a numbered list for ordered steps, a table for facts compared across the same fields, and a diagram for a structure or sequence.
- **Image.** The image's content and the reader's need for the image, or none. Rank the images by the gain each gives the reader, and propose fewer images rather than more.
- **Length.** A word allotment for the section. The allotments add up to the page's length, and the longest section is the one the reader most needs.

Under the outline, show where each section's detail steps down to its concrete instance, and name the section that introduces each shared term. Choose the document type to "Document Types" in writing.md.

## Material Selection

The author agrees the skeleton before you select any material. Then select the material against each delivery line, so that each item serves one line. Each part the line's form needs, such as the protection for every duty in a table, has an item or falls under an exclusion. A delivery line with no material behind it becomes an open item for the author at that point, before any drafting, because a gap found after drafting costs a redraft.

## Agreement and the Written Plan

After every delivery line has its material or an open item, write the plan in the full form of plan-template.md, as `plan.md` beside the material, unless the author names another path. Write every field in plain sentences, one claim each, because plan wording flows straight into the page, and a badly joined field becomes an unreadable sentence. Each item names its delivery line and ends on its source with the version or date. Where a source is not agreed, the item records the status in words, such as "stated as proposed". Check the plan with `hedy plan check`, or against the completeness rules in plan-template.md until that command exists, and report each failure to the author. The checked plan then goes to the drafting stage in `SKILL.md`.

## Reopening the Plan

Drafting may reopen the plan, because writers revise their goals while writing. When the drafting agent returns a point the items do not support, or a section that does not hold together, take the question back to the author. Change the plan, check the plan again and restart the drafting from the changed plan. Never patch the draft in place of the plan.

## Slide Decks

A slide deck uses the same conversation. Each slide is one section, so the skeleton has one section per slide, and each slide makes one point. A slide has exactly one delivery line, its point, and the two-to-four rule applies to page sections only. The plan's `Document type` reads `slide deck`, and the length per slide is the slide's word count. Agree each slide's point before proposing the slide's image, so that a choice between drawings never changes the message. A deck shows the intended design at release, following "Slides and explainers" in writing.md.
