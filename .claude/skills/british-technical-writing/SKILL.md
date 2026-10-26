---
name: "british-technical-writing"
description: "Write, rewrite or review technical text in plain technical British English, following the international technical writing standards (ISO/IEC/IEEE 26514, IEC/IEEE 82079-1, ISO 24495-1, ASD-STE100, RFC 2119) and GOV.UK style. Use it for any technical prose: READMEs, ADRs and decision records, design documents, specifications, API and reference docs, runbooks, how-to guides, release notes, Confluence or wiki pages, pull request descriptions, commit messages, code comments and docstrings, tickets, slide text, and emails or chat messages about technical work. Also use it when asked to tidy up text, make it read professionally, remove marketing or sales language, de-Americanise, convert to British English, check spelling and style, or ban a phrase and add it to the banned phrases list. Applies British spelling, bans American colloquialisms, business jargon, marketing language and rhetorical essay style, and enforces the rules the standards share. Not for fiction or marketing copy."
---

# British technical writing

Technical text exists so that someone can act on it: run the command, make the decision, operate the service, pass the audit. Every rule here serves that. The skill combines the international standards for technical documentation with British English conventions and the GOV.UK style guide, because British readers, and UK public-sector readers in particular, read American idiom and sales language as noise at best and spin at worst. Technical terms are welcome when they are the right term for the concept. Vague words, hype and chat are not.

## Working method

1. Name the reader and the purpose before writing a word. ISO 24495-1 calls this "relevant": the reader gets what they need and nothing else. A runbook for an on-call engineer and a decision record for an architecture board need different content, not just different tone.
2. Pick the document type and keep to that type. Diátaxis and ISO/IEC/IEEE 26514 separate instructional, conceptual and reference information. A how-to guide gives steps and no theory; an explanation gives reasoning and no steps; reference describes and never instructs. Mixing them is the commonest structural fault in technical documentation.
3. Put the most important information first: in the document, in each section and in each sentence. Readers of technical text skim and stop as soon as they have what they need.
4. If the repository or organisation has its own style guide (a CONTRIBUTING file, a Vale configuration, a GOV.UK publishing requirement), follow it where it differs from this skill. Content published on GOV.UK follows the GOV.UK A to Z exactly. Check for a project overlay of banned phrases as well (see "Banned phrases").
5. Draft, then run the review pass at the end of this skill before returning the text. Treat it as a lint step, not an optional extra. Most of Claude's default habits (American spelling, em dashes, `robust`, `seamless`, `leverage`, "it's worth noting", enthusiasm) are on its lists.
6. When editing someone else's text, keep their meaning, their technical claims and their structure unless asked to change them. Fix language, not facts. If a technical claim looks wrong, say so in a note rather than silently rewriting the claim. An unqualified claim ("messages are never lost") becomes a plain statement of what the design does ("the design prevents message loss") plus a note asking for the mechanism or evidence; do not invent either.
7. Never invent a fact to fill a gap the rewrite exposes (who "we" are, which version, what "etc" stood for, how to test the change). Put a placeholder in square brackets ("[name the team]") and list the gaps in a short note after the text, or ask if the author is available.

## Sentences and words

- Write in the active voice with the actor as the subject: "The scheduler retries the job", not "The job is retried". Use the passive only when the actor is unknown or irrelevant, or when the thing acted on is the topic (ASD-STE100 and GOV.UK both allow this).
- Use the present tense. Avoid "will" for behaviour: "The service returns 404", not "will return 404".
- Instructions take the imperative: "Run the migration", not "You should run the migration" or "The migration should be run".
- Address the reader as "you". Use "we" only when the document has said who "we" are. A named team in a decision record is fine; an unexplained "we" in a user guide is not.
- One idea per sentence. Aim for an average of 15 to 20 words. Split any sentence over 25 words unless splitting damages the meaning. GOV.UK sets 25; ASD-STE100 sets 20 for procedures and 25 for description.
- Paragraphs: one topic, no more than 5 sentences.
- Use the shortest common word that is precise: use, not `utilise`; before, not prior to; about, not regarding; so, not consequently; start, not initiate or commence; enough, not sufficient; need, not require; let, not enable.
- Prefer verbs to nominalisations: "decide", not "make a decision"; "install", not "perform an installation"; "configure", not "carry out configuration".
- Cut words that carry no information: simply, easily, just, obviously, basically, actually, really, very, quite, of course, note that, it is worth noting, it is important to, please. "Simply" and "easily" also insult the reader who finds the step hard.
- Say what the reader can do, not what the product "allows" them to do: "You can export the report as CSV", not "The tool allows you to export the report as CSV".
- One term per concept, every time. Do not vary terms for elegance: if it is a "consignment" in the first paragraph it is not a "shipment" in the third. Define a term on first use if the reader may not know it, and add a glossary to long documents.
- Repeat the noun when "it", "this", "that", "they", "the former" or "the latter" could refer to more than one thing, or stands for an idea rather than a nearby noun. Never end a sentence on "it". The test is the reader's recovery: if the referent is not the one thing the previous clause named, write the name.
- Technical terms are correct when they are the exact term: "idempotent", "mutual TLS", "eventual consistency", "content security policy". Jargon is a word used because it sounds expert when a plain word would do: `leverage`, "surface", "socialise".
- Noun stacks of more than three words are hard to parse ("trade imports notification service configuration file"). Break them up with prepositions or restructure (ASD-STE100 limit).
- Avoid metaphors, idioms, humour, puns and cultural references. They slow non-native readers, translate badly and date quickly. GOV.UK: "Avoid using metaphors - they do not say what you actually mean."
- Do not anthropomorphise software. The API does not "want", "think", "complain" or "get confused".
- No rhetorical questions, no exclamation marks, no emoji in technical text.
- Avoid timebound words: "currently", "now", "new", "soon", "recently", "latest". Give the version or the date instead.
- Avoid unqualified claims: "secure", "guarantees", "always", "never", "fastest". State the specific property and its limits: "Encrypts data in transit with TLS 1.3", not "fully secure".

## Requirement words

Use these consistently and do not substitute synonyms for variety.

| Word | Meaning |
|---|---|
| must, must not | mandatory requirement or prohibition: law, policy, or a condition without which the thing does not work |
| should, should not | recommended; a justified exception is possible and the reason belongs in the text |
| may | permitted, optional |
| can, cannot | possible or capable; a statement of fact, not permission |
| will | a statement about the future or a commitment, never a requirement |

Avoid "shall" except in a formal standard or contract that defines the word. ISO/IEC Directives Part 2 uses "shall" for standards; GOV.UK and plain English guidance use "must". If a specification cites RFC 2119, write the keywords in capitals only where they carry that meaning and include the BCP 14 boilerplate. Never write "may not" to forbid something; write "must not". Do not write "should" when you mean "must". Do not use "should" for prediction ("the service should scale to 50,000"); write "is designed to", "is expected to" or give the test result.

## Evidence and attribution

A decision record, design document or specification cites documented positions. "The Data Strategy team said it does not provide integration" is reported speech: it names no document, meeting or date, and the reader cannot check the claim. Write "integration between source systems and Purview is outside the Data Strategy team's remit", followed by the document, version and date that say so. Where the only source is a conversation, say so and date it ("agreed in discussion on 14 May 2026, minuted at [link]"), or leave a placeholder in square brackets for the author. Do not drop the claim and do not present it as established fact. The same applies to "the informal view is", "it was agreed", "we were told", "the general view is" and "X confirmed".

Where a position is the author's own judgement, say so: "In my view" or "EU DP Architecture's position is". A judgement presented as a fact is the commonest way a decision record misleads its readers.

## British English

### Spelling

British spelling throughout prose. The patterns that matter most in technical text:

| Pattern | British | Not |
|---|---|---|
| -ise, -isation | organise, initialise, serialise, deserialise, optimise, authorise, authorisation, normalise, synchronise, customise, prioritise, minimise, maximise, categorise, parameterise, sanitise, tokenise, virtualise, containerise, summarise, visualise, recognise, realise | -ize, -ization (Oxford spelling; not used in UK government or most UK publishing) |
| -yse | analyse, paralyse, catalyse (analysis is unchanged) | analyze |
| -our | behaviour, colour, favour, favourite, honour, labour, neighbour | -or |
| -re | centre, metre (length), litre, fibre | -er (but "meter" for a measuring device, and "parameter") |
| -ce noun, -se verb | licence (noun) and license (verb); practice (noun) and practise (verb); advice and advise; defence, offence, pretence | license (noun), practice (verb), defense |
| double l | modelling, modelled, labelled, labelling, cancelled, cancelling, travelling, signalling, levelled, totalling | modeling, labeled, canceled |
| single l | fulfil, enrol, enrolment, instalment, skilful | fulfill, enroll, installment |
| -ogue | catalogue, dialogue (a conversation), analogue | catalog, dialog, analog |
| -mme | programme (a plan, scheme or broadcast); program for software | program (for a plan) |
| other | grey, cheque, tyre, aluminium, artefact, judgement, acknowledgement, enquiry (a question), inquiry (an investigation), disc in general but disk for computer storage, maths, mould, sceptical, draught (of air), draft (a document), towards, afterwards | gray, check, tire, aluminum, artifact, judgment, mold, skeptical, toward, afterward |

Spelling exceptions. Do not "correct" any of these:

- Code, commands, identifiers, API field names, HTTP headers, configuration keys, CSS properties, library and product names and file names keep their canonical spelling and go in code font: "set the `color` property to change the text colour"; "call `initialize()`"; "the `Authorization` header"; "the `LICENSE` file"; "a GitHub Actions artifact" when that is the feature's name.
- Quoted text keeps its original spelling.
- Proper nouns keep their own spelling: Pearl Harbor, the US Department of Defense, World Health Organization, Center for Internet Security.
- Terms a standard defines keep the standard's spelling when you quote or cite the standard.

### Words and usage

| Use | Not |
|---|---|
| fill in a form | fill out a form |
| tick a box (prose); select or clear a checkbox (UI instructions) | check a box |
| full stop | period |
| round brackets, square brackets | parentheses |
| hash for the # symbol (the pound sign is £) | pound sign for # |
| at the weekend | on the weekend |
| different from | different than |
| got | gotten |
| while, among | whilst, amongst (archaic); also do not use "while" to mean "although" |
| learnt or learned (one per document) | |
| mobile phone, postcode, car park, lift, autumn, fortnight, holiday, annual leave | cell phone, zip code, parking lot, elevator, fall, vacation |
| maths | math |
| rota | roster (for a schedule of people) |
| expiry date | expiration date |
| cyber security (two words, UK government and NCSC usage) | cybersecurity |
| per cent in prose; % with figures | percent |
| write to someone | write someone |
| in hospital | in the hospital |
| speciality | specialty |
| "data is" (GOV.UK treats data as singular); "the team is" or "the team are" are both acceptable, pick one per document | |

### Punctuation

- Single quotation marks for terms on first mention, titles and interface labels mentioned in running text: the 'Submit' button is disabled until the form is valid. In an instruction, the interface element is bold instead, exactly as on screen: select **Submit**. Double quotation marks only for a direct quotation of what someone said or wrote. Nested quotes alternate. Put punctuation outside the closing quote unless it is part of the quoted text.
- No em dashes, anywhere. Do not use dashes to set off asides; use commas, round brackets or a new sentence. Ranges take "to", not a dash: "10 ms to 20 ms", "Monday to Friday", "2024 to 2026". A hyphen joins compound modifiers before a noun (a well-known bug, a read-only replica) and established compound nouns and verbs (back-off, sign-in as a noun, co-ordinate, co-operate, re-enter and other re- words that would otherwise misread). Do not hyphenate adverbs ending in -ly, or words that read clearly without one (email, reuse, online). GOV.UK writes data set, data centre and data store as two words.
- Serial (Oxford) comma: omit the comma unless the list is ambiguous without one. US style guides require it; British practice (GOV.UK, the Economist, Oxford University) does not.
- No semicolons in body text (GOV.UK). Split the sentence. Colons introduce lists and examples.
- Abbreviations and acronyms take no full stops: UK, BBC, Dr, Mr, am, pm. Expand an acronym on first use unless it is better known than its expansion (API, HTTP, JSON, URL, CSV, SQL, DNS, VPN, PDF, UK, EU, NHS, GP, VAT).
- No Latin abbreviations. Replace eg with "for example" or "such as"; ie with "that is" or a rewrite; etc with a complete list or "and so on"; via with "through" or "using"; cf with "compare"; NB with nothing; vs with "versus" or "against" (vs is acceptable in tables); circa with "about". Screen readers read "eg" as "egg".
- Round brackets for asides; square brackets for editorial insertions and placeholders. No "(s)" plurals: write "the file or files", or just "the files".
- Bold only for UI elements in instructions and, sparingly, for a signal word such as "Warning". Never bold for emphasis in running text. No italics (GOV.UK), except where a format requires them for titles.
- One space after a full stop.
- Contractions: none in formal documents (specifications, decision records, reference material, policies). In messages and informal guides, positive contractions ("you'll", "it's") are acceptable. Never negative contractions ("can't", "don't", "won't"): readers skim past the "n't" and read the opposite.

### Numbers, dates, times and units

- Numerals for all numbers, including 2 to 9, with three exceptions: write "one" (unless it is a step, a date or a list point), spell out a number that starts a sentence, and keep set expressions ("one or two"). This is the GOV.UK rule. ONS and Oxford spell out one to nine, so follow their house style when writing for them.
- Thousands separator: comma (9,000). Decimal point with a leading zero (0.5). The same number of decimal places across a comparison.
- Ordinals: first to ninth in words, then 10th, 21st. Never in dates.
- Percentages: 50%, closed up. "Percentage points" in words.
- Money: £75, £1.50, £2 million. Never £2m or £2bn in prose.
- Units: a space between the value and the unit symbol, SI style: 10 GB, 250 ms, 3 kg, 25 °C. Unit symbols are never pluralised and never take a full stop. Give the unit with every number in a range: "10 ms to 20 ms". In running prose, a spelt-out unit is fine where it reads more naturally ("after 30 seconds", "a 1 second retry"); use symbols for precise technical values and in tables. Write rates with "a" or "per", not a slash: "5,000 messages a second", not "5k messages/sec" (the slash is acceptable in unit symbols such as MB/s and in tables). GOV.UK closes units up (4.03MB); follow that only for content published on GOV.UK.
- Dates: 25 October 2026. Day first, month spelt out, no ordinals, no commas. Use ISO 8601 (2026-10-25) in tables, file names, logs, data and anywhere a machine reads the date. Never 10/25/2026 or 25/10/2026 in prose. Date ranges: "1 April 2026 to 31 March 2027", "the 2026 to 2027 financial year". Day of the week only when it helps the reader.
- Times: 24-hour clock in technical and operational content (14:30, 09:00); 12-hour with am/pm in user-facing content (2:30pm, 9am, midday, midnight). Never "2:30 PM". State the time zone where it matters: "14:30 UK time", "09:00 UTC". Machine-read timestamps and durations follow ISO 8601 (2026-10-25T14:30:00Z, PT15M).
- UK telephone numbers with spaces: 020 7946 0000.
- Version numbers, ports, HTTP status codes, error codes and anything the reader types are always numerals, in code font where they are literal values.

## Words and phrases to avoid

Three groups. The first two have no place in technical text. The third is padding that a plainer word replaces.

### Marketing and hype

Delete the word, or replace it with the measurable fact and its source. If there is no fact behind it, the sentence was decoration.

robust, powerful, `seamless`, `seamlessly`, frictionless, intuitive, elegant, beautiful, clean (as praise), delightful, effortless, magic, "just works", cutting-edge, bleeding edge, state-of-the-art, next-generation, world-class, best-in-class, industry-leading, game-changing, transformative, revolutionary, mission-critical, enterprise-grade, future-proof, turnkey, silver bullet, blazing fast, lightning fast, dead simple, 10x (write the resulting figure, or "ten times"), level up, take it to the next level, unlock, unleash, harness, supercharge, turbocharge, elevate, delight, revolutionise, reimagine, a testament to, "we're excited to", "we're thrilled", "introducing", "say hello to", "meet X", "the power of", feature-rich, comprehensive (unless you can list what it covers), best practice (name the practice or say "recommended practice"), journey (unless travel), ecosystem (unless biology), landscape (unless land), tapestry, vibrant, rich, pivotal, crucial, vital, game plan, north star.

GOV.UK's list of words to avoid applies in full: agenda (unless for a meeting), advance, collaborate, combat, commit, pledge, counter, deliver (for anything but post, pizza and services), deploy (acceptable for software), dialogue, disincentivise, `empower`, `facilitate`, focus, foster, impact (as a verb, or for anything but a collision), incentivise, initiate, key, land (unless an aircraft), `leverage`, liaise, overarching, progress (as a verb), promote, robust, slim down, `streamline`, strengthening, tackle, transform, `utilise`, drive (figuratively), going forward, in order to, hub, `portal`, one-stop shop, ring-fence. The replacement is always to say specifically what is being done.

### American business and workplace colloquialisms

| Avoid | Write |
|---|---|
| reach out | contact, ask, email |
| touch base, sync up, catch up | speak to, meet |
| circle back, loop back | return to, follow up |
| going forward, moving forward | from now on, in future, after this release |
| at the end of the day, net-net, bottom line | in short, the result is |
| deep dive, double-click on, drill down, dig into | examine, review in detail, explain |
| low-hanging fruit, quick win | easy change, cheap improvement |
| bandwidth (of people) | time, capacity |
| the ask (noun) | request, requirement |
| learnings | lessons, findings, what we learnt |
| sunset (verb) | retire, withdraw, deprecate, remove |
| spin up, stand up, turn up (a service) | create, start, set up |
| bake in, baked in | built in, included by design |
| boil the ocean, move the needle, ballpark, slam dunk, home run, in the weeds, punt, quarterback (verb), table (a topic: in British English it means to raise it, not shelve it) | say the plain thing |
| heads up | notice, warning |
| gotcha | pitfall, known problem |
| a ton of, a bunch of, pretty much, kind of, sort of, super, awesome, real quick, you guys, folks | many, several, about, some, or delete |
| ping me, shoot an email | message me, send an email |
| onboard, offboard (people) | induct, set up access, remove access |
| action (verb), actionable | do, carry out; specific, usable |
| socialise (an idea) | share, discuss with |
| architect (verb), productise, operationalise | design, make into a product, put into operation |
| `leverage`, `utilise` | use |
| ninja, rockstar, guru, wizard, 10x engineer | expert, specialist |
| under the hood | internally, in the implementation |
| out of the box | by default, as installed |
| drop-in replacement, plug and play | compatible without changes (and say with what) |
| end-to-end | from X to Y (name the ends) |
| go-live, big bang | release date, single release |
| pain point | problem |
| disruptive, agnostic, holistic, synergy, paradigm, silo | say what you mean: vendor-independent, whole-system, co-operation, model, separate team |
| stakeholder | the people it affects, or name the role |
| cadence | frequency, schedule |
| dogfooding | internal use |
| upcoming, ongoing | forthcoming, continuing |
| figure out | work out |
| normalcy, obligate, skyrocket | normality, oblige, rise sharply |
| check out X | see X |

### Padding and formal padding

| Avoid | Write |
|---|---|
| in order to | to |
| prior to, subsequent to | before, after |
| in the event that | if |
| in respect of, with regard to, regarding, in relation to | about, for |
| in accordance with | under, in line with |
| on a daily basis | daily, every day |
| at this point in time, at this time, currently, presently | now, or give the date or version |
| a number of, numerous | several, many, or the number |
| in excess of | more than |
| the majority of | most |
| sufficient | enough |
| commence, initiate | start |
| terminate, discontinue | stop, end |
| `facilitate` | help, run, make possible |
| ensure | make sure, or state the mechanism that guarantees it |
| require (where plain) | need |
| obtain, acquire | get |
| provide | give |
| purchase | buy |
| demonstrate | show |
| endeavour, attempt | try |
| ascertain, determine | find out, decide |
| additional | extra, more |
| assistance | help |
| modification | change |
| per annum | a year |
| it is recommended that | we recommend, or "should" |
| there is, there are (as an opener) | name the subject: "The config has 3 sections", not "There are 3 sections in the config" |
| the fact that | delete or rewrite |
| as well as | and |
| and/or | X, Y, or both |
| via | through, using, by |
| whether or not | whether |
| in terms of | delete; state the relation |
| respectively | rewrite as two sentences |
| allows you to, enables you to, lets you | make the reader the subject |
| please | delete (keep it for a real request for a favour) |
| note that, it is worth noting, it is important to note, importantly, notably, crucially, essentially, basically, ultimately | delete and keep the point |
| in summary, in conclusion, overall, to summarise | delete; a technical document ends when the content ends |
| not only X but also Y | X and Y |
| fast, reliable and secure (any tricolon of praise adjectives) | the one adjective that is true and measurable, or none |

### Rhetorical and essay register

The lists above catch American and marketing language. A third register slips past them because it sounds British and literate: the persuasive essay. It argues by rhythm, aphorism and colouring rather than by stating the mechanism, and it reads as opinion. Decision records and design documents persuade by stating facts, mechanisms and consequences and letting the comparison carry the judgement. Remove:

- Slogans, epigrams and antithesis. "INS sends, TDS receives, nobody owns the middle" becomes "INS would own the sending workflow and TDS the receiving API. No team would own the integration between them." "Holding a schema is not publishing one" becomes "A service that validates against a schema does not thereby publish the schema."
- Rhythmic tricolons and balanced contrasts built for effect. A list of three real steps is fine ("one tag, one poll, one registration"). "INS tags and moves on" is not.
- Loaded adverbs and editorial asides that argue rather than describe: still, only, merely, even, "which is the answer to", "for TDS's benefit", "the wrong estate", "the right move", "nobody", "simply". State the fact: "INS would build and operate a component that only TDS uses, and TDS would also build a receiver."
- Vague partitives and spatial metaphors standing in for a named component: "the receiving half", "the middle", "both ends", "end to end", "inside it", "moved into the wrong estate", "upstream" and "downstream" where a name exists. Name the component: "the receiving API", "the integration between the workflow and the API".
- Everyday idiom where a literal statement exists: "has nothing to ask INS for" (needs no further input from INS); "moves on" (delete); "falls away" (is eliminated, no longer applies); "needs no intervention" (recovers without manual action); "TDS's call" (TDS's decision); "on the merits" (for the reasons given); "the moment" (when); "goes and fetches" (fetches); "waits on" (waits for, depends on).
- Personification of services, repositories and estates. A team can decide, build, own and agree. A service, pipeline, repository or estate cannot choose, want, ask, wait for, move on, adopt or stop. Where a name such as "TDS" means both the team and the service, write "the TDS team" when people act and "the TDS poller" or "the TDS service" when software does.
- Present tense for options that have not been built. In a comparison, describe each option in the conditional ("would need", "would build", "would hold a credential") so the reader knows which is proposed and which is hypothetical. The adopted option moves to the present tense in the Decision section.

### Colloquial technical verbs

Operational slang hides the operation and does not translate. Use the verb that names what the system does.

| Avoid | Write |
|---|---|
| lands (data, a file), lands in Bronze | writes to, stores in, is written to the Bronze layer |
| cuts a tag, cuts a release | creates a tag, publishes a release |
| stamps a value on | sets, writes |
| pins to a version | fixes to, is configured to use |
| sits retrying, sits waiting | retries, waits |
| fires (a job or event), kicks off | runs, starts, triggers |
| hits an endpoint, talks to, calls into | sends a request to, calls |
| goes down, comes back, falls over, blows up | is unavailable, recovers, fails |
| wires up, plumbs in, bolts on, hooks into | connects, configures, adds, subscribes to |
| surfaces (verb), bubbles up | shows, exposes, returns, propagates |
| sits behind, fronts | is served by, receives requests for |
| picks up (a change or message) | reads, receives, detects |
| drops (a message or connection) | discards, loses, closes |
| spins up, stands up, tears down | creates, starts, deletes |
| blocks on, hangs off | waits for, depends on |
| the happy path | the successful case |
| the box, the tin, the kit | the server, the host, the hardware |
| chatty, noisy | high-frequency, verbose |

### UI and interaction verbs

Select (not click on, hit, or tap unless the device is a touch screen); select or clear a checkbox; turn on and turn off (not enable and disable, activate and deactivate); go to (not navigate to); enter a value (use "type" only when the cursor stays in the field); sign in and sign out (not log in or login, unless the product's own label says so); run a command or a test (not execute, perform or conduct); set up (not instantiate or spin up); the terminal (not the command line or the CLI); restart (not reboot); open (not launch); appears (not shows up or pops up); dialog box is acceptable as the UI term, dialogue for a conversation; dropdown list; text box or field. Button and menu names in bold, exactly as on screen and without the ellipsis: select **Save**.

### Inclusive and neutral terms

Allow list and block list (not whitelist and blacklist); primary and replica, or main, controller and worker (not master and slave); placeholder (not dummy); check or confidence check (not sanity check); legacy or exempt (not grandfathered); stop responding (not hang); on-path attacker (not man-in-the-middle, where the reader will understand it); work-hours (not man-hours); they as a singular pronoun; chair (not chairman); people or everyone (not guys); unreasonable (not crazy or insane); gap (not blind spot).

## Structure and layout

- Headings in sentence case, no full stop, front-loaded with the key word, no -ing forms ("Deploy the service", not "Deploying the service"), no "Introduction", "Overview" or "How to", no questions. Start at H2 in a Markdown body (H1 is the title) and do not skip levels.
- Titles: 65 characters or fewer, describing the content ("Retry policy for outbound HTTP calls"), no dashes or slashes.
- Bulleted lists: a lead-in line ending in a colon; items run on from the lead-in, start in lower case and carry no full stop; one sentence per item; no "and" or "or" after items; no semicolons. If items need full sentences, make every item a full sentence with a full stop and do not mix the two forms.
- Numbered lists only for sequences. Each step is a complete sentence with a full stop, one action per step, the condition or location before the action ("On the Settings page, select **Users**"), the expected result in a separate sentence. Prefix optional steps with "Optional:". Nest no more than one level deep.
- Tables for anything the reader compares or looks up (parameters, error codes, options). Column headings in sentence case. Units in the heading, not in every cell.
- Code, commands, file names, paths, field names, HTTP methods and status codes, data types and placeholders go in code font. Introduce code with a sentence ("Run the following command to ..."). Placeholders in capitals with underscores, inside angle brackets or braces, each one explained below the sample: `<API_KEY>`, `{PAYMENT_ID}`.
- Warnings, cautions and notes go immediately before the step they apply to, never after it (IEC/IEEE 82079-1, ISO/IEC/IEEE 26514). "Warning" for data loss or an irreversible action, "Caution" for something to do carefully, "Note" for useful information the reader can skip. Use them rarely, never two in a row, and never for a step that belongs in the sequence.
- Links: the link text describes the destination and stands alone ("see the retry policy"), never "click here", "here", "this page" or a bare URL in prose.
- No FAQs in anything you write. If a question is worth answering, the answer belongs under a heading that states the topic. When editing a document that already has an FAQ section, keep it (rule 6) and suggest in your note that the answers move under topic headings.
- The opening section of a design document or specification is titled for what it contains ("Purpose and scope", "What the service does"), not "Overview" or "Introduction".
- No footnotes in web or Markdown content.

## Document types

Classify first (Diátaxis), then apply the shape:

- How-to guide or runbook: the goal in the title, prerequisites, numbered steps, verification, rollback or troubleshooting. No background theory.
- Tutorial: one working path from nothing to a result; say what the reader will see at each point; defer explanation.
- Reference (API, configuration, CLI): one consistent structure per item (name, purpose, parameters with type, required or optional, default, constraints, example request and response, errors). Describe, never instruct. Complete, in the product's own order. For an API: "parameter" in requests, "field" in responses; say whether each is required; show an example response exactly as returned; list errors in a table of code, meaning and cause.
- Explanation or design note: the reasoning, the trade-offs, the alternatives rejected. May hold an opinion; holds no steps.
- Design document or technical specification: purpose and scope; context and constraints; the design (components, interfaces, data, sequence of events); decisions and trade-offs; operational concerns (deployment, monitoring, failure modes, capacity figures with the evidence for them); security and data protection; open questions. Instructions for testers or operators go in their own clearly titled section or a separate how-to, not in the explanatory sections.
- Decision record (ADR or DR): the title names the decision, not the problem; status; context; the decision in the present tense ("We will use X" is accepted ADR idiom, and the team is the named "we"); consequences, good and bad; alternatives considered; date. Nygard or MADR shape. Options not adopted are described in the conditional, comparison cells are complete clauses with a named subject, and every position attributed to another team carries its source.
- README: what it is, who it is for, how to get it running in the fewest steps, where the rest of the documentation lives. Test the steps before publishing. Move reference material into `docs/`.
- Release notes: one line per change, grouped as added, changed, fixed, removed, security; anything the reader must do comes first; version numbers, never "latest".
- Pull request description: a title in the imperative of 70 characters or fewer; what changed and why; how to test it; what the reviewer should look at first; breaking changes stated plainly, or "Not a breaking change". If the request does not say why or how to test, ask or leave a bracketed placeholder rather than inventing a reason.
- Commit message: imperative subject of 50 characters or fewer with no full stop; a body that explains why, wrapped at 72 characters; British spelling in prose, identifiers unchanged; Conventional Commits prefixes where the repository uses them.
- Code comments and docstrings: say why, not what the code already says; British spelling in prose; identifiers as written.
- Messages (email, Slack, Teams) about technical work: the point first, the detail after, the request or decision needed stated plainly, a greeting and nothing more by way of pleasantry, no exclamation marks.

## Banned phrases

This table is part of the skill, so it applies everywhere the skill is installed. It grows from use: a phrase the user has marked as wrong once is wrong every time after that. Names in the entries are placeholders; match the pattern, not the names.

| Phrase | Fault | Write instead |
|---|---|---|
| lands (data, a file, a release) in X | colloquial verb for a storage operation | writes to X, stores in X |
| the receiving half, the sending half, the middle | partitive standing in for a named component | the receiving API, the sending workflow, the integration between them |
| X the Y team said it does not provide | hearsay as evidence | X is outside the Y team's remit, with the document or minute that records it |
| for X's benefit | editorial colouring in a comparison | that only X would use |
| still builds, still needs ("still" as argument) | loaded adverb | would also build, would also need |
| A sends, B receives, nobody owns the middle | slogan built as a tricolon | A would own the sending workflow and B the receiving API. No team would own the integration between them |
| nobody owns the middle | slogan, partitive | no team owns the integration between them |
| has nothing to ask X for | everyday idiom for a dependency statement | needs no further input from X |

When the user says a phrase is banned, marks one as wrong in a review, or asks to add it to the banned phrases, do three things in the same turn:

1. Fix every instance of the phrase in the document being worked on.
2. Add a row to this table, generalised with placeholders where the phrase contains project names, with the fault in a few words from this skill's own vocabulary (colloquial verb, slogan, hearsay, idiom, partitive, personification, loaded adverb, hype, Americanism, padding). Then propose the updated skill so the user can save the change. The installed copy of a skill is read-only to a session, so the review card is the only way the row persists; several phrases from one session go in one card.
3. If the phrase is specific to one project (a product's own term, a team name used loosely), offer the project overlay below instead of the table.

Project overlay: a repository may hold `.claude/banned-phrases.md` in the same three-column format for phrases that apply only to that project. When it exists, read it at the start of the task and apply it in addition to this table. Everything general belongs in the table above.

## Review pass

Run this review pass before returning any text. Fix everything the pass finds. Do not just report the faults.

0. Banned phrases: search for every entry in the Banned phrases table, and in `.claude/banned-phrases.md` if the repository has one.
1. Reader and type: is it clear who this is for and which type it is? Are there steps in an explanation, or theory in a how-to?
2. Spelling: search for -ize and -yze endings, -or endings (color, behavior, favor), -er endings (center; meter for length), "license" as a noun, "practice" as a verb, "program" for a plan, "artifact" in prose, "gotten", "fall" meaning autumn, "defense", "catalog", "dialog" outside the UI term, "canceled", "modeling", "labeled", "fulfill", "enroll", "judgment", "gray", "check" for tick, "fill out", "different than", "toward", "afterward", "percent", "cell phone", "zip code", "period" meaning full stop, "parentheses", "whilst", "amongst". Confirm nothing in code font was changed.
3. Dashes and punctuation: search for the em dash character and for a spaced hyphen or en dash used as an aside; rewrite with commas, brackets or a new sentence. Ranges use "to". Also remove semicolons in body text, serial commas the sense does not need, "(s)" plurals, negative contractions, and bold or italics used for emphasis.
4. Latin and symbols: eg, e.g., ie, i.e., etc, et al, vs, via, cf, NB, and "&" in prose, "/" meaning or.
5. Marketing, hype and colloquialisms: search the three lists above. Replace each with the fact or the plain word.
6. Filler and openers: simply, easily, just, obviously, basically, actually, really, very, quite, please, note that, it is worth noting, it is important to, in order to, "there is" or "there are" opening a sentence, in summary, in conclusion, overall. Also "Let's", "Imagine", "In today's", rhetorical questions and exclamation marks.
7. Voice and tense: passive sentences without a reason; "will" describing behaviour; "allows you to"; "it is recommended"; "should" where "must" is meant; "may" where "can" or "might" is meant; "shall" outside a standard.
8. Length: any sentence over 25 words; any paragraph over 5 sentences; any bullet with more than one sentence; any noun stack of more than three words.
9. Numbers and dates: US date order, "AM" or "PM" in capitals, missing units, "m" or "bn" for money, units without a space, ranges with a dash, ordinals in dates.
10. Terminology: one term per concept; acronyms expanded on first use; product and UI names exactly as the product spells them.
11. Pronouns: any sentence ending on "it", and any "it", "this", "that" or "they" whose referent is not the one thing the previous clause named. Name the noun, and put the subject the pronoun hides at the front of the sentence.
12. Headings and lists: sentence case, no -ing headings, no "Introduction", lead-in lines present, bullet punctuation consistent, numbered lists only for sequences, warnings before the step.
13. Claims: anything "secure", "guaranteed", "always", "fastest" or "best" without a measurable statement and a source.
14. Tone: no humour, metaphor, idiom, anthropomorphism, emoji or enthusiasm on the organisation's behalf. The text should read as a competent colleague stating facts.
15. Register: slogans, antithesis and tricolons built for effect; loaded adverbs (still, only, merely, even) and editorial asides; vague partitives ("the receiving half", "the middle"); everyday idiom; colloquial technical verbs (lands, cuts, stamps, pins, fires, hits); services or estates that choose, want or wait; present tense for options not built.
16. Evidence: every position attributed to another team or person names a document, meeting or date; "X said" with no source becomes a cited statement or a bracketed placeholder.

## Examples

Before:

> We're excited to introduce our robust new notification engine! It seamlessly integrates with IPAFFS and empowers users to effortlessly track consignments in real time. Going forward, this will be a game-changer for stakeholders.

After: "The notification service sends the importer an update within 30 seconds of each status change in IPAFFS. Importers see the current status of each consignment on the tracking page."

Before: "Prior to initiating the deployment process, please ensure that you've reached out to the on-call engineer and gotten sign-off, in order to avoid any gotchas going forward."

After: "Before you deploy, get written approval from the on-call engineer. This prevents a deployment clashing with an incident."

Before: "Simply click on the 'Analyze' button; the tool will then automatically optimize your config (e.g. caching, etc.) under the hood."

After: "Select **Analyze**. The tool then rewrites the configuration, for example by adding cache settings." (The button keeps the product's spelling because it is a label; the prose around it is British.)

Before: "The data are processed by the ingestion pipeline on a daily basis and a number of validation checks are carried out to ensure that bad records don't get through."

After: "The ingestion pipeline processes the data daily and runs 12 validation checks. It rejects any record that fails a check and writes it to the quarantine table."

## Basis

These rules are the points on which the following sources agree, resolved in favour of British English and GOV.UK where they differ:

- ISO/IEC/IEEE 26514:2022 Design and development of information for users; IEC/IEEE 82079-1:2019 Preparation of information for use; ISO/IEC/IEEE 26511, 26513, 26515 and 26531 (process standards in the same family). Correctness, consistency, conciseness, minimalism; conceptual, instructional and reference information kept separate; warnings before the step.
- ISO 24495-1:2023 Plain language, Part 1: governing principles (relevant, findable, understandable, usable); ISO 24495-2:2025 for legal communication.
- ASD-STE100 Simplified Technical English, Issue 9 (2025): 20-word procedural and 25-word descriptive sentence limits, one instruction per sentence, one meaning per word, noun stacks of three words at most, active voice.
- ISO/IEC Directives Part 2 (2021) and RFC 2119 with RFC 8174: requirement verbs.
- ISO 8601-1:2019 dates and times; ISO 80000-1:2022 quantities and units; OASIS DITA 1.3 topic types (concept, task, reference); ISO/IEC/IEEE 24765 vocabulary.
- GOV.UK A to Z style guide and technical content A to Z (guidance.publishing.service.gov.uk/writing-to-gov-uk-standards), GOV.UK writing guidelines, GDS Way README and ADR guidance, GOV.UK developer docs style guide, ONS content style guide, Defra style guide, Home Office engineering documentation guidance.
- Plain English Campaign, "How to write in plain English" and the A to Z of alternative words.
- The Economist Style Guide, New Hart's Rules and the Guardian style guide for British punctuation, spelling and Americanisms.
- Microsoft Writing Style Guide, Google developer documentation style guide, Red Hat, GitLab, Kubernetes and Splunk style guides, Diátaxis and Write the Docs for the rules they share. Their US spelling, serial comma and em dash conventions are overridden here.
- Vale rule sets (Microsoft, Google, write-good, proselint, alex) as the model for the review pass.