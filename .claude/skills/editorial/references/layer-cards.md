# Layer Cards

These cards replace the brief's drill reviewer, structural reviewer and cold editor roles for a layered review. Each pass applies only its own card, reports only the kinds its card owns, and leaves every other defect to the layer that owns its kind. Contradictions between statements, on one page or across pages, belong to the `design-consistency` skill and are never reported by any card.

In a re-review the packet holds "Changes since the last review" and may hold "Settled findings". Every pass then reports only findings that touch a changed line, or that a removed or rewritten paragraph caused, and raises no settled finding again.

## Paragraph Card (Layer 1)

Kinds owned: `absolute`, `ambiguity`, `compression`, `term`, `flow`, `residue`, and `split` or `list` repairs.

Review one page, paragraph by paragraph; when the spawn names lines, review only the paragraphs on those lines. The page is your context; read another page only to check the meaning of a term. When the packet holds layer 0 pointers, start with the paragraphs they name for this page, then cover every paragraph. A pointer is a place to look: report a finding only for a real defect, and nothing because a pointer fired.

For each paragraph, state its point first, then ask, in this order. Each question carries its exception, so answer with the exception in view:

1. Is a judgement standing in for a fact? Which fact would replace the judgement, and does the passage need that fact at all? A needed fact is stated without the judgement; a judgement the passage does not need goes with its unit.
2. Which actor performs each action, and by what mechanism, except where the actor is unknown, irrelevant or whichever component handles the request, and the passive puts the thing the reader tracks in the subject?
3. Does a term require private context, or does the reader frame make the term familiar, except a token in the ubiquitous-language register, which is a proper noun unless the run notes ask for its recorded expansion?
4. Does the explanation merely restate its heading or conclusion, or justify a decision the paragraph already justifies, except the sentence that states the page's scope, whose job that is? A repetition across pages belongs to the set card.
5. Has compression hidden the relation between ideas, except in a sentence a colleague can restate after one reading, since length is never the defect on its own?
6. Does the paragraph earn its length? Ask this question only when the review intent is `distil`.

When the review intent is `clarify`, ask four more questions after 1 to 5:

7. Does the paragraph hold more than one topic that a break at the seam would separate, except a paragraph on one topic, whatever its length? A long paragraph is a prompt to check for a second topic (`language.md`, "Sentences and paragraphs"), never the defect itself. The finding is action `split`, `before` the whole paragraph, `after` the page-ready paragraphs with a real blank line at the seam, `removes` `none: layout`, one `changes` entry of kind `split`, and `cites` that section.
8. Does one sentence or paragraph carry discrete criteria, options or facts whose order does not carry meaning, which bullets would expose, or an ordered mechanism whose every step names its actor, which a numbered list would expose, except a connected argument, causal explanation or qualification, which stays prose (`document-types.md`, "Structural forms")? The finding is action `list`, `after` the page-ready list with the same words in the same order, `removes` `none: layout`, one `changes` entry of kind `list`, and `cites` that section.
9. Does the reader meet a condition after the action or information it governs, so that a reader the condition excludes reads on, or a reader has to re-read to find what the condition binds, except a contrast or emphasis that already works, and a condition whose scope the text does not settle, which is a question for the author (`language.md`, "Sentences and paragraphs", the condition-first rule)? The finding is action `rewrite` keeping every word and the condition's distinction (`if`, `only if`, `unless`, `after`), one `changes` entry of kind `move`, and `cites` that section.
10. Does a sentence's framing obscure the behaviour or introduce a judgement the passage does not support, pivot figuratively, or rank without grounding, except a comparison the passage grounds in a stated fact, and a sentence that states the passage's scope or carries the reader between points (`language.md`, "Voice and tone", "Register")? The finding is action `rewrite` to the consequence the passage supports, or `delete` when none remains, and `cites` that section.

Question 6 is the paragraph restatement test in `language.md`, "Paragraph Restatement Test": each sentence the restatement drops is one finding, kind `flow`, action `delete`, S4, with that sentence verbatim as `removes`, `before` and an empty `after`. A `flow` finding never carries a condensation.

For compression, apply the brief's "Compression patterns". Grade a compression finding S3 when the reader cannot recover who acts and what the relation is without reading the sentence twice, and S4 when the sentence reads once and the repair only improves cadence or economy.

Decide the closing move for each defect in this order: deletion of the whole unit that carries the defect; a reword of the sentence that has to stay; a completion of the passage's own promise from the page's material (with `loss`); and last, a question for the author, still naming the unit that goes while the question stays open.

Write `{"unit": "<page filename>", "findings": [...], "retains": [...]}`.

## Page Card (Layer 2)

Kinds owned: `presentation`, `omission`, `reference` within the page, `flow` for a `move` or `restructure` inside the page, and the page verdict.

Review one page as a whole. The page is your context, with the paragraph pass's job left to the paragraph pass: do not report sentence-level wording. Look for:

- a heading, table header, caption, bold lead-in or introducing list item in FAQ voice ("What a journey backend checks"), a table header that trails off on a preposition ("Set by"), or a label not in title case: the reword names the topic as a noun phrase in title case (`language.md`, "Headings, lists and tables"); never ignored, and a finding with no reword says so;
- headings, lists and tables that do not match the content's job (`document-types.md`, "Structural forms"), judged by the page's document mode;
- a section that does not lead with its answer: the reader meets the rule or decision after the reasoning that leads to the rule;
- qualifications separated from the rules they constrain;
- a mechanism the page describes that the page itself does not record as decided: the finding cuts the detail and keeps only the statement that the design must handle the consideration;
- a condition, boundary or consequence the passage promises and omits. When the passage makes no such promise, ask whether the claim that invites the question is needed;
- a link or anchor inside the page that does not resolve, as a `reference` finding with `status`;
- a diagram candidate. First read the page's existing diagrams. Then look for a passage that `document-types.md`, "Structural forms" makes a diagram candidate, or prose that restates a diagram the page already has. The finding is kind `presentation`, S4 or S5, basis `author` with `question` and `owner`, `removes` `none: presentation`, no `before` or `after`, and an `inventory` listing only what the page states: the actors, one step per stated action with its stated condition and the verbatim sentence it comes from, and `existingDiagram` naming the diagram that already shows the sequence, or null. Never an arrow the text does not state.

Then read the page as the framed reader seeing it for the first time and give the page verdict: `finishes` when the reader knows what the page established, `stalls` when the reader is left mid-argument, `misleads` when the reader carries away something the page did not establish; the opening's job in one sentence; the sentence the framed reader carries away; at most two findings about the opening or the reading of the page as a whole; and the page's retains: an opening or carried-away sentence that does its job for the framed reader where a paragraph reviewer would likely flag its length or register, and nothing else. An opening in the inventory shape ("Compression patterns", inventory opener) is a finding on the opening with the sentence-per-job rewrite, never a retain.

Cap 10 findings plus the verdict's two. Write two files: `{"findings": [...], "redundancies": []}` as the structural file and `{"pages": [{"page", "verdict", "opening", "carriedAway", "findings": [...], "retains": [...]}], "order": [], "patterns": []}` as the editor file.

## Set Card (Layer 3)

Kinds owned: `repetition`, `reference` across pages, `move` between pages, reading order, `term` where two pages name one concept differently, and set-wide patterns.

You are assigned one page. Read the whole set as context, in the listed order, and report only what needs more than one page to see, anchoring every finding on your assigned page. Work through your page paragraph by paragraph, and for each paragraph ask whether another page already states the same fact, rule or argument. Look for:

- a fact, rule or argument on your page that another page also states: name the home, the statement that stays, and when the home is elsewhere return one `repetition` finding for the occurrence on your page, with `related` naming the home and `removes` the occurrence. A one-line fact may repeat on any page; arguments and specifications have one home;
- sections in the wrong page or mode: action `move` with `moveTo`;
- cross-references between pages: each one resolves, is broken, is circular or is unlocated. Return a `reference` finding with `status` and `removes` for every one that does not resolve. A resolving pointer is a finding only when the reader does not need the pointer, and then the pointer goes too;
- reading order: a term or fact the reader meets before the set introduces that term or fact, one finding per instance, with `related` naming where the introduction sits;
- one concept under two names on different pages: a `term` finding at the occurrence that departs from the run notes' name, or from the home's name when the notes name none;
- set-wide patterns with three or more instances whose first instance is on your page: the pattern in one sentence, every instance as an anchor, and one finding at the first instance whose closing move covers all of them.

Cap 12 findings, 6 redundancies and 2 patterns for your page. Write two files: `{"findings": [...], "redundancies": [{"fact", "home": {page, line, quote}, "occurrences": [FINDING]}]}` as the structural file and `{"pages": [], "order": [FINDING], "patterns": [{"pattern", "instances": [{page, line, quote}], "finding": FINDING}]}` as the editor file.
