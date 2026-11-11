# Technical Authoring: Design

This design describes the product by the purpose of each part, and decides nothing yet about the content of any file. Once the design is agreed, the existing material is sorted into the parts it describes. The goal, the measures and the settled decisions are in `decisions.md`.

## The Product

In Ben's words, the product is "an assistant in creating a better process for curation of analysis, and planning of documents, and more consistent application of the team's 'what good looks like'". It is two related skills.

The planning skill curates the analysis and plans the document. The author chooses the sources. The skill lists each claim with a word-for-word quote and its source, and reports the questions the sources leave unanswered and the claims that contradict each other. The author and the skill then agree who the page is for, the questions the page must answer, and one sentence per section.

technical-authoring applies the team's idea of what good looks like the same way every time. It drafts one section at a time from the agreed sentence and the approved claims, using the team's stance and writing rules, and flags anything the material does not cover. For an existing page, it reports the defects at each level, structure, paragraphs, sentences and words, and the author chooses how deep the edit goes. Anything the skill would otherwise guess comes back to the author as a question.

hedy checks the mechanical rules, the banned words, punctuation and names, whenever a file is saved, committed or put in a pull request, in any AI tool.

Each skill is built in its simplest form first and enhanced later. A part that serves neither skill is left out.

## The Levels of a Document

Both skills work on a document at a level. A level is decided before the level below is written, and an edit starts at the highest level that has a defect. A defect cannot be repaired from a lower level. A sentence rewrite cannot supply a missing section, and a new section cannot supply a claim the material lacks. Sommers (1980) found that novice writers revise words while experienced writers revise structure, and the levels make the experienced order the default.

| Level | Unit | Record | Owner |
| --- | --- | --- | --- |
| Set | the document set: terms, preferred names, one home per fact | the style sheet | both skills |
| Document | the reader, the questions the page answers, the document type, the governing thought | the brief | planning |
| Section | one sentence per section, the reading order, the form of each section | the skeleton | planning |
| Claim | the source, the word-for-word quote and the status, at every level | the material | planning |
| Paragraph | one job, moving from claim to mechanism to consequence | the draft | technical-authoring |
| Sentence | one claim, written forward | the draft | technical-authoring |
| Word | the term, the word table, punctuation | the checks | hedy |

Progressive disclosure runs down the same levels. The governing thought states what the sections support. Each section's sentence states what its paragraphs support, and each paragraph's first sentence states what the rest of the paragraph supports. A reader who stops at any level holds a true picture with less detail.

## The Two Skills

| Skill | Input | Output | Author's Checkpoints |
| --- | --- | --- | --- |
| Planning | the sources the author chooses | the brief, the material and the skeleton | approves each of the three records |
| technical-authoring | the three records, or an existing page | a draft, or an edit at the agreed level | agrees the level of edit, and answers the diff and queries of a copy edit |

The three records are the contract between the skills. technical-authoring drafts only from approved records, and asks for them when they are missing. A short artefact, such as a pull request body or a ticket, needs only the brief's questions. A comprehensive edit hands the page back to the planning skill as the material.

## The Parts

The product has four kinds of part. A guide tells the model how to do one job. A record holds decisions the author approves. A hedy command does work that needs no judgement. A trigger decides when a command runs.

### Guides

| Guide | Owner | Purpose | Read When |
| --- | --- | --- | --- |
| Entry point | each skill | routes a request to the skill's steps and stops at each checkpoint | the skill is invoked |
| Stance | both skills | why the team writes, and the register | every step |
| Planning guide | planning | how to curate the chosen material and plan the levels from the set down to the section | each planning step |
| Writing guide | technical-authoring | how to write paragraphs and sentences, with exemplars | drafting, and whenever any agent writes prose in scope, with or without the skill |
| Editing guide | technical-authoring | how to diagnose a page by level, and how to change text without damage | editing |

### Records

Each step works from the records the earlier steps wrote, not from the conversation.

| Record | Purpose | Writer | Reader |
| --- | --- | --- | --- |
| Brief | the reader, the purpose and the questions the page answers | the planning skill, with the author | every later step |
| Material | the curated claims, the gaps and the disagreements | the planning skill, from the sources the author chose | the skeleton step, technical-authoring and `hedy brief check` |
| Skeleton | the governing thought, the document type and one sentence per section | the planning skill, with the author | technical-authoring |
| Style sheet | the document set's terms and preferred names | the author, over time | both skills and `hedy prose check` |
| Word table | the forms the team bans, each with its repair | the team | `hedy prose check` only |

### Commands

hedy holds everything that can be decided without judgement. It runs Vale through `local-tool.js`, its one shell-out, and its menu reaches both commands.

| Command | Owner | Purpose | Caller |
| --- | --- | --- | --- |
| `hedy brief check` | planning | each quote in the material appears word for word in its source, and each record is complete | the planning skill at each checkpoint, a person through the menu |
| `hedy prose check` | both skills | the word-level checks: a Fix hit is rewritten, a Change hit blocks, and only the hits a change introduced count | the triggers, technical-authoring, a person through the menu |

### Triggers

| Point | Environment | Check |
| --- | --- | --- |
| An agent writes a file in scope | Claude Code | `hedy prose check` on the file |
| An agent's turn ends | Claude Code | `hedy prose check` on the files the session changed |
| Pre-commit | any tool | `hedy prose check` on the staged markdown |
| Commit message | any tool | `hedy prose check` on the message |
| Pull request creation | `create-pr.sh` | `hedy prose check` on the title and body |

The git hooks reach colleagues in any AI tool, provided `make` has installed hedy and Vale.

## The Parts in Each Task

### Planning a Document

1. **Brief.** The author names the reader and the purpose. The planning skill drafts the brief from the planning guide. The author approves the brief.
2. **Material.** The author chooses the sources. The planning skill curates the claims and reports the gaps and disagreements. `hedy brief check` confirms every quote. The author approves the material.
3. **Skeleton.** The planning skill proposes the governing thought and the sections. The author approves the skeleton.

### Drafting a Document

1. **Draft.** technical-authoring writes each section from the writing guide, the section's sentence and the section's claims, and from nothing else. It says each paragraph back once, removes each sentence the restatement drops, and runs explain and rewrite on a sentence it cannot follow. It lists anything the section needs and the material does not hold. `hedy prose check` runs at every write.
2. **Commit.** `hedy prose check` runs on the staged page.

### Editing a Page

1. **Diagnosis.** technical-authoring reads the page with the editing guide, and `hedy prose check` lists the word-level hits. The skill reports the defects by level. The author agrees the level of edit.
2. **Edit.** A comprehensive edit hands the page to the planning skill as the material. A copy edit changes paragraphs and sentences, changes no claim, and returns a diff and queries for the author to answer. A mechanical edit runs `hedy prose check --fix` and resolves the Change hits.
3. **Commit.** `hedy prose check` runs on the staged page.

### Writing a Short Artefact

A pull request body, ticket or commit message takes the brief's questions and the writing guide, and `hedy prose check` runs when the artefact is created.

## Enhancing a Step Later

The steps pass work to each other only through records. A step can therefore be deepened, or replaced by a skill of its own, without changing the other steps, as long as the step still writes the same record. Triage of a large analysis before curation is one such enhancement to planning. A diagram step under the skeleton is another.

## The Guidance in language.md

This section is the evidence for the way the guides divide. `language.md` holds 7,149 words in 21 sections, ordered by grammar topic rather than by task. Taken together, the sections prevent seven failures:

| Failure Prevented | Text Elicited Instead |
| --- | --- |
| Persuasion in place of description: hype, rankings, loaded adverbs, slogans, absolutes | the fact with its limit, the comparison carrying the judgement |
| A hidden actor or operation: software agency, nominalisation, slang and figurative verbs | the named actor and the literal operation |
| Reconstruction by the reader: compression, noun stacks, nested clauses, unclear pronouns, trailing conditions, FAQ voice | the sentence written forward, the condition first, the repeated noun |
| An unverifiable claim: reported speech, an invented fact, a timebound word, an undecided mechanism | the sourced, dated claim with its status |
| Noise: filler, padding, tallies, pointers, tangents, structure for its own sake | just enough, removed in whole units |
| Damage by the editor: cut fragments, condensation, additions, guessed antecedents | the whole-unit edit and the author query |
| Inconsistency: drifting terms, American spelling, punctuation, casing | one name and one form |

The guidance comes in eight kinds, and each kind belongs to one part:

| Kind | Sections | Words | Part |
| --- | --- | --- | --- |
| Stance: why technical text exists and its register | Voice and tone | about 270 | stance |
| Claim rules: source, date, status, no invention | Evidence and attribution, the judgement and undecided-mechanism items in Just Enough | about 400 | planning guide |
| Structure rules | Headings, lists and tables (the proportion and opener rules), the whole document, the document types it links to | about 450 | planning guide |
| Writing rules: how to produce the sentence | Sentences and paragraphs, Actors and voice, Write it forward, Verbs and noun stacks, Technical usage, Code and identifiers, Capitalisation and numbers | about 1,300 | writing guide |
| Diagnostic prompts: a 25-word sentence, a five-sentence paragraph, an `-ion` ending, the pronoun recovery test, the restatement test | spread across Sentences and paragraphs, References and pronouns, Verbs, Paragraph Restatement Test | about 400 | writing guide for the self-check, editing guide |
| Repair rules: how to change text without damage | Register, Just Enough, the repair halves of the sentence sections | about 1,100 | editing guide |
| Scan data: forms with a fixed repair | Words to avoid or examine, Punctuation and formatting, the heading and spelling rules | about 2,500 | word table, read by hedy and never loaded into a model's context |
| Residue: gate notes, calibration narrative, the tiering procedure, links into the editorial skill | lines 3, 14, 35, 36, 56, 81, 93, 124, 127, 156 to 158 | about 600 | none: deleted |

The word counts are estimates from the section counts, because several sections hold more than one kind.

### Findings

1. **One file serves every task, so every task pays for the whole file.** A drafter who reads the whole file loads 2,175 words of word table that only the checks use, and recognition tests the file itself says harm drafting (line 81).
2. **The claim rules are late repairs for defects curation prevents.** "Never invent a fact to fill a gap", attribution with a document and date, and the removal of undecided mechanisms all move upstream into the planning skill, where they stop the defect before a sentence exists.
3. **Guidance above the paragraph is thin.** "Lead with the point" and the opener rule are the only document-level writing rules. Nothing says how abstraction steps down from the governing thought to the section, the paragraph and the sentence. The skeleton and the progressive-disclosure rule fill that gap in the planning guide.
4. **The diagnostic prompts are not checks.** Each one says "check this", never "this is wrong", so no deterministic action follows a hit. Under decision 10 they never become check rules. They trigger explain and rewrite.
5. **The words "listed and not checked" (line 202) drive no action.** Under decision 10 each item becomes a word-table row or a writing rule, or is dropped.
6. **The same split applies beyond this file.** The default removals in Just Enough repeat the grading rubric's H-01, H-02, H-04 and H-18, and the compression patterns in the review brief are recognition tests of the same kind. The authoring-voice rule is a digest of the stance, the writing rules and part of the structure rules.
