# Editorial Redesign: Layered Review and Design Consistency

The target shape of the editorial estate after the efficiency work, written on 16 Oct 2026 from the experiment evidence in `register.json` and Ben's decisions in `implementation-plan.md`. Test R3 checks the layered review before any of it is built; the build stages in the plan carry the parts every design shares.

## The Problem the Redesign Solves

Today one reviewer role does two jobs with different inputs, closing moves and owners.

| | Technical writing | Design consistency |
| --- | --- | --- |
| Finding kinds | ambiguity, compression, term, flow, absolute, residue, repetition, reference, presentation | contradiction, omission, fact |
| Context the check needs | one paragraph, one page or the set's structure | the facts of every page |
| Closing move | a rewrite or a removal | a decision by the author |
| Fix rate in the experiments | 57% at paragraph scope, 82% at page and set scope | 14% |

The mix costs in three ways:

1. Every reviewer read every page, because the design questions need the whole set.
2. Rewrites that try to settle a design question change the meaning and fail verification, so they are paid for in review, verification and grading and then dropped.
3. The serious defects are missed. One review run finds 6 to 13 of the 26 contradictions all runs found together; the facts track found 25 (R2).

The fork design (X4, P1) already removes most of the reading cost: one loader reads the packet once and each pass is a fork. The redesign's case is therefore not reading cost. It rests on three gains: each pass does one job, design questions reach Ben as questions instead of failed rewrites, and a change re-runs only the layers and units it touches.

## The Layers

| Layer | Owns | Reads | Trigger | Output |
| --- | --- | --- | --- | --- |
| 0 Script | mechanical checks: banned words and punctuation, sentence and paragraph length, passive patterns, acronyms on first use, hidden lists, anchors that do not resolve, names against the preferred-names register | the text only | every save, and the start of every review | gate FAIL and WARN lines; pointers for layer 1 |
| 1 Paragraph | plain English, actor and voice, judgement in place of a fact, terms needing private context, compression, condition first, splits and lists, the restatement test under `distil` | one page, its layer 0 pointers, the paragraph rule card | changed paragraphs | findings |
| 2 Page | headings and labels, structural forms, document mode, answer first in each section, the page opening, qualifications apart from their rules, a mechanism the page describes as decided without saying so, a condition the page promises and omits, diagram candidates | one page, the paragraph findings on that page, the page rule card | changed pages | findings |
| 3 Set | where each repeated fact or argument has its home, reading order across pages, cross-page references, set-wide patterns of three or more, one name per concept across pages, sections in the wrong page | the whole set once, the set rule card | any change to the set | findings |
| Facts | contradictions between pages, conflicting values, a condition one page drops, a decision one page states and another marks open | the fact register only | changed pages re-extracted, the whole register re-checked | questions for Ben, never rewrites |

Rules that bind every layer:

1. A layer reports only the kinds it owns. A defect outside its kinds is not reported, because the owning layer sees it with the right context.
2. Layers 1 to 3 keep today's finding contract unchanged, so build, triage and apply need no schema change.
3. The facts track never emits a rewrite. Its output is a question with both quotes and the ways to settle it, put to Ben through `/decide` or listed in the triage plan's Problems.
4. All model passes run on Opus (X1). The extractor model is an open question below.

### Drill Questions by Layer

| Drill question (review brief) | Layer |
| --- | --- |
| 1 Judgement standing in for a fact | 1 Paragraph |
| 2 Undecided mechanism | 2 Page within the page; Facts across pages |
| 3 Contradiction with another statement | Facts |
| 4 Actor and mechanism | 1 Paragraph |
| 5 Missing condition the passage promises | 2 Page |
| 6 Term needing private context | 1 Paragraph; layer 0 for names in the register |
| 7 Restates its heading or justifies twice | 1 Paragraph within the page; 3 Set across pages |
| 8 Compression | 1 Paragraph |
| 9 Restatement test (`distil`) | 1 Paragraph |
| 10 to 13 Split, list, condition first, framing (`clarify`) | 1 Paragraph |

The structural reviewer's look-fors split between page (headings, forms, diagrams, separated qualifications) and set (repetition with its home, cross-file references, contradictions as two sides move to Facts). The cold editor's page verdicts move to layer 2 and its reading order and set-wide patterns to layer 3.

## The Writing Principles

The Google technical writing and Home Office documentation principles, against the layer that owns each:

| Principle | Owner |
| --- | --- |
| Know your audience | Every layer, through the reader frame in the packet |
| Front-load key information | 2 Page: answer first in each section, the page opening |
| Plain English, acronyms defined | 0 Script for acronyms and names; 1 Paragraph for wording |
| Active voice, present tense | 0 Script points; 1 Paragraph judges |
| Short sentences and paragraphs | 0 Script points; 1 Paragraph judges |
| Scannable layout | 1 Paragraph for splits and lists; 2 Page for headings and forms |
| Consistent terminology | 0 Script against the register; 3 Set across pages |
| Purposeful visuals | 2 Page |

## Skills and Recombination

| Skill | Change | Standalone Use |
| --- | --- | --- |
| `editorial` | Becomes the orchestrator: frames the reader, builds the packet, runs layer 0, then the layers the scope needs, assembles one review result. Writing path unchanged | "paragraph pass on this page" while drafting; "full review" before triage |
| `design-consistency` (new) | Extracts facts per page, builds the register, checks it, puts the questions to Ben. Independent of editorial; usable on any design set | "check these pages for contradictions" |
| `editorial-triage` | Receives layer 1 to 3 findings only; runs as a workflow (stage 3); design findings bypass verification | unchanged triggers |
| `check-prose.sh` | Extended as layer 0: the R1 detectors with precision 0.7 or better (long sentence, passive, near-duplicate, forbidden term), acronym first use, anchors, the names register | unchanged hooks |

The review brief splits into three rule cards, one per layer, each carrying only its layer's questions, exceptions and the finding fields its kinds use. `language.md` stays the policy and the cards cite its sections.

## Shared Artefacts

| Artefact | Builder | Holds |
| --- | --- | --- |
| Work packet | script (stage 1, from the X2 prototype) | reader frame, run notes, the rule cards a run needs, every page with line numbers |
| Paragraph manifest | script | per page and paragraph: line, hash, the layer 0 pointers on that paragraph |
| Preferred-names register | Ben, seeded from `ubiquitous-language.md` and the term findings | one preferred name per concept, with the names it replaces |
| Fact register | `design-consistency` extractors and a merge script | one record per fact: page, line, quote, actor, action, object, condition, force, value. R2r added the section, table and column and found no gain, at a 33% dearer check |
| Review result | assembler script | the layers' findings in today's contract, validated before the build |

## Running Only What Changed

The paragraph manifest records each paragraph's hash at the last review. On a new run:

1. Layer 0 runs on every page; it costs nothing.
2. Layer 1 runs on paragraphs whose hash changed, with the unchanged neighbours as context.
3. Layer 2 runs on pages with a changed paragraph or heading.
4. Layer 3 runs when any page changed.
5. Facts: changed pages are re-extracted; the check re-runs on the merged register ($1.18 in R2).

A rule change re-runs the layer that owns the rule on every unit, which is the rules-only mode (X11) generalised. A full review stays available and remains the default until R3 and Ben's decision 7.

## The Fork Plan

One loader per run reads the packet once, then forks: one paragraph pass per page, one page pass per page, and one set pass per page, which reads the whole set and anchors its findings on that page. R3 ran a single set pass for the whole set, capped at 6 redundancies, and recalled 9 of the baselines' 25 repetition fixes; R3b's per-page set passes recalled 16, and P1's three page-scoped structural reviewers 12. The facts track runs separately because its extractors read one page each and its checker reads only the register. The constraints in the plan's "Constraints of the Fork Design" apply unchanged.

## Test R3

| | |
| --- | --- |
| Hypothesis | A layered review of C3 (paragraph, page and set passes forked from one loader, layer 0 pointers in the packet) plus the facts track recalls the baselines' fixes as well as the package does, at no more than the package's cost, with fewer meaning-changing rewrites and no contradiction findings left in triage |
| Setup | frozen pages 02a, 02b and 02c with 00 as context; three rule cards drafted from the review brief per the question map above; layer 1 to 3 findings through the X9 triage workflow; facts from R2 and R2r, not re-run |
| Measures | recall of B0c and B0d fixes and extra fixes (`compare-runs.sh`); cost, time and turns (`run-metrics.sh`); findings per layer and per kind; H-29 ignores per applied edit; contradiction findings left in triage |
| Pass | recall at or above the package's (P1 0.58, P3 0.49; two identical baseline runs agree at 0.62); total cost at or below P1's $6.25; H-29 ignores per applied edit below the baselines' 0.78 (24.5 per 31.5) |
| Fails if | recall falls below 0.49, in which case the layer the missing fixes belong to is the suspect |
| Cost | about $10 to $15 |
| Result (16 Oct) | Not passed as set up. Recall 0.47, cost $6.52. Rewrites judged meaning-changing fell 59%, H-29 ignores 55%, the ignore rate from 0.55 to 0.40, and 15 new fixes is the most of any run. The shortfall is repetition (9 of 25), traced to the single capped set pass |
| R3b result (16 Oct) | Passed. One set pass per page: recall 0.62, equal to the agreement between two baseline runs, repetition 16 of 25, 20 new fixes, 39 applied edits, $6.40, H-29 ignores -47% and the ignore rate 0.38. One run; Ben's blind judgement covers its edits |

## Open Questions

1. Checker isolation. R2r's checker cited a CDP meeting that only the workspace memory records, outside the register it was told to read. The check prompt should forbid outside knowledge, and the skill should run the checker where workspace memory does not load.
2. Extractor model. R2 extraction cost $5.22 on Opus, and the checker's accuracy depends on the extraction; a Sonnet arm scored against R2 and R2r would settle the choice.
3. Set outline for layer 2. Judging a section as answer first may need the set's outline; R3 gave layer 2 only its own page, and its page verdicts were all `finishes`.

## Mapping to the Build Stages

| Stage | Carries over | Changes under the redesign |
| --- | --- | --- |
| 1 Packets, X7, no gate | packet builder, assembler, X7 claim check | the packet carries rule cards per layer instead of one brief |
| 2 Loader and forks | the loader pattern | forks per layer and page instead of drill units, structural and cold editor |
| 3 Triage workflow | all of it | design findings bypass verification |
| 4 Rules-only mode | the delta packet | generalised to per-layer re-runs from the manifest |
| New | | `design-consistency` skill; layer 0 detectors and the names register; the manifest |
