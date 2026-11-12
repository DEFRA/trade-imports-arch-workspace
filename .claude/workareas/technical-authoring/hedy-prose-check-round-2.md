# hedy prose check: Round 2 Report

Round 2 ran `hedy prose check --json` over the estate on 11 November 2026 and counted the findings for each row of `language.md` and each pattern. The counts show that the five patterns find real breaches with almost no false hits, that most banned findings in this repo come from one file that lists the banned words as data, and that several rows to examine fire often on their literal sense. Code does not change in round 2. Ben reads the counts and decides which rows and repairs change in `language.md` and whether a hook runs the check.

## Decisions for Ben

1. **Rows that fire mostly on a literal sense.** `period` matches time periods, such as "retention period" and "validity period". `architect` matches job titles, such as "Principal Architect", because the parser ignores "as a verb". `hub` matches proper nouns, such as the National Clearance Hub. `shape` gives the most findings of any row, 163, and many come from the skill scaffold's "State shape" heading, which names a data structure. A finding from a row to examine fails no run, so a row with mostly literal hits costs reading time and nothing else. Recommended: drop `period` and `architect` from their rows, because a reader keeps almost every hit, and keep `hub` and `shape`.
2. **The british-technical-writing skill.** Its `SKILL.md` lists the banned words as plain text in tables, so the one file gives 50 of the 67 banned findings in this repo. Decision 18 keeps that skill unchanged as the benchmark. Recommended: leave the file as it is and keep the file out of any hook, because a hook that runs on this repo would otherwise fail on every edit to the benchmark.
3. **Third-party documents in the docs repo.** `docs/systems/EUDP/TNT-WebServices/` and `docs/guidelines/` hold 27 copies of external documents, such as the EU TRACES web service manuals and the Protective Monitoring Specification. They give 33 banned, 183 examine and 71 pattern findings. The team cannot reword them. Recommended: leave both folders out of any run on the docs repo.
4. **A hook.** `hedy prose check` fails a whole file, while the old gate failed only lines that changed against HEAD. A pre-commit hook on staged markdown would therefore block an edit to any file that already holds a banned or pattern finding. 14 of the 77 files in this repo hold one: the benchmark skill, 8 workarea records and 5 skill files (`line-editing.md`, the defra-architecture-review, mermaid-check and trade-imports-dr skills, and the trade-imports-dr style guide). The last 50 commit messages on `main` gave 3 banned findings and no pattern finding. Two come from one line of 8eca492, which names `earned`, `easy` and `cheap` as the subject of that commit, and one is a real use of `cheaper`. Recommended: run the check on commit messages in the `commit-msg` hook and on pull request bodies in `create-pr.sh` now. Add a hook on staged markdown after the 5 skill files are reworded, with the benchmark skill and `.claude/workareas/` left out. Each hook is an owner step, because agents cannot edit `.githooks/`. The docs repo has hooks of its own, which this workspace does not set.
5. **Round 3.** The plan runs round 3, the old gate's eight other patterns, only if round 2 changes what Ben does. The counts here do not test those patterns, because round 1 did not build them.

## What the Counts Show

| Corpus | Files or messages | Banned | Examine | Pattern |
| --- | --- | --- | --- | --- |
| This repo, tracked markdown | 77 | 67 | 410 | 22 |
| Docs repo, markdown under `docs/` | 164 | 115 | 821 | 1,151 |
| Last 50 commit messages on `main` | 50 | 3 | 12 | 0 |

**The patterns.** The docs repo gives 1,151 pattern findings, and 1,080 of them are in the team's own pages, not in the third-party copies. The em dash gives 856 of them, in 28 files. A sample of 18 trailing-`it` findings from three decision records found 18 sentences that end on `it`, so the pattern matched no false case in the sample. The em dash and curly quote patterns match one character each, so they have no false case to find.

**The banned rows.** The `you` row gives 65 findings, all in the docs repo, in 17 files. Some are in third-party manuals, and some are in the team's pages, such as the journey onboarding guide and a table header "What it gives you". The `easy` row gives 28, spread over 22 files. The `portal` row gives 10, and several of those are inside a link's text, such as `[btms-portal-frontend](...)`, because the check masks a URL but not the text of a markdown link.

**The rows to examine.** These fail no run. The largest are `shape` (163), the British spelling row (129, of which `period` gives 37 and `enrollment` 22, the latter from a third-party guideline), the metaphor row (101), `deliver` (98) and the row holding `hub` (90). `currently` gives 28 findings and `note that` 22.

**The commit messages.** The commit messages break almost no rule, so a check on commit messages would rarely find anything. A word named as data, such as a banned word that a commit adds to `language.md`, still gives a finding unless the author puts the word in code font.

## Method and Limits

- This repo is the branch `hedy-prose-check` at 6934176, before this report was added, so the counts include the round 1 commits. The files under `__fixtures__/`, `prose-gate-cases/` and the scaffold's `tests/expected/` are left out, because they hold banned words on purpose.
- The docs repo was read in place from the main checkout with `find`, because this session's worktree cannot run git in another repository. The count therefore includes any untracked markdown under `docs/`, and the commit the files came from is not recorded.
- The commit messages are the last 50 on `origin/main`, each checked through `--stdin` under the label `commit <hash>`.
- `round-2-counts.mjs` in this workarea produced the tables below. Run `node .claude/workareas/technical-authoring/round-2-counts.mjs <docs repo>` from the workspace root to produce them again.

## Counts

Each row's table gives the findings in this repo, the docs repo and the commit messages, the number of files, and the matched terms by count. Below each table, each row with findings lists the ten lines it matches most often.

### Banned Words and Phrases

| Row | Findings (repo / docs / commits) | Files | Matched terms |
| --- | --- | --- | --- |
| `you`, `your`, `yours` | 65 (0 / 65 / 0) | 17 | you 45, your 31, yours 1 |
| `easy`, `easier`, `easiest` and 4 more | 28 (11 / 15 / 2) | 22 | easier 16, cheap 5, easy 5, cheapest 2, cheaper 1, easiest 1 |
| `defense`, `offense`, `pretense` and 15 more | 14 (14 / 0 / 0) | 1 | defense 3, gotten 3, cell phone 2, different than 2, fill out 2, percent 2, zip code 2, check a box 1, cybersecurity 1, ... |
| `facilitate`, `facilitates`, `facilitated` and 1 more | 12 (0 / 12 / 0) | 8 | facilitate 8, facilitating 3, facilitated 1 |
| `touch base`, `sync up`, `catch up` and 33 more | 12 (12 / 0 / 0) | 1 | socialise 2, ballpark 1, boil the ocean 1, catch up 1, circle back 1, dogfooding 1, figure out 1, heads up 1, home run 1... |
| `on a daily basis`, `on a weekly basis`, `on a regular basis` and 9 more | 11 (11 / 0 / 0) | 1 | commence 2, it is recommended 2, on a daily basis 2, ascertain 1, at this point in time 1, at this time 1, in excess of ... |
| `portal` | 10 (0 / 10 / 0) | 7 | portal 10 |
| `earned`, `earns its place`, `earn its place` and 4 more | 8 (7 / 0 / 1) | 7 | earns its place 4, earned 2, earns its keep 2 |
| `load-bearing` | 6 (0 / 6 / 0) | 2 | load-bearing 6 |
| `seamless`, `seamlessly` | 5 (0 / 5 / 0) | 5 | seamless 5, seamlessly 1 |
| `cuts a tag`, `cuts a release`, `cut a release` and 13 more | 4 (4 / 0 / 0) | 1 | bolts on 1, cuts a release 1, cuts a tag 1, hooks into 1, navigate to 1, plumbs in 1, reboot 1, tears down 1, wires up 1 |
| `combat*`, `pledge*`, `disincentivis*` and 7 more | 3 (3 / 0 / 0) | 1 | going forward 3, combat 1, disincentivise 1, incentivise 1, moving forward 1, one-stop shop 1, pledge 1, ring-fence 1, s... |
| `powerful`, `elegant`, `beautiful` and 40 more | 2 (2 / 0 / 0) | 1 | 10x 2, a testament to 1, beautiful 1, best-in-class 1, blazing fast 1, bleeding edge 1, cutting-edge 1, dead simple 1, d... |
| `for the benefit of`, `has nothing to ask`, `have nothing to ask` and 5 more | 2 (2 / 0 / 0) | 1 | has nothing to ask 2, falls away 1, goes and fetches 1, on the merits 1 |
| `utilise`, `utilises`, `utilised` and 5 more | 1 (0 / 1 / 0) | 1 | utilized 1 |
| `streamline`, `streamlines`, `streamlined` and 1 more | 1 (0 / 1 / 0) | 1 | streamlined 1 |
| `whitelist*`, `blacklist*`, `slave` and 9 more | 1 (1 / 0 / 0) | 1 | blacklist 1, blind spot 1, chairman 1, crazy 1, dummy 1, grandfathered 1, insane 1, man-hours 1, slave 1, whitelist 1 |
| `leverage`, `leverages`, `leveraged` and 1 more | 0 (0 / 0 / 0) | 0 |  |
| `empower`, `empowers`, `empowered` and 1 more | 0 (0 / 0 / 0) | 0 |  |
| `user-friendly` | 0 (0 / 0 / 0) | 0 |  |

#### `you`, `your`, `yours`

- 3 times, first at `docs-repo/docs/systems/EUDP/Architecture and Development/DR/DR-EUDP-008-release-process-implementation.md:134`: \| Document \| What it gives you \|
- `docs-repo/docs/systems/EUDP/TNT-WebServices/TNT-WebServices-Package-2024.10.14/TNT-SoapUI-WS-Security-Configuration.md:117`: - (1) Your TNT user name
- `docs-repo/docs/systems/EUDP/TNT-WebServices/TNT-WebServices-Package-2024.10.14/TNT-SoapUI-WS-Security-Configuration.md:74`: - (2) You must have access data to TNT WS (this document does not cover how to ask for authentication data)
- `docs-repo/docs/systems/EUDP/Architecture and Development/INS - Imports Notification Service/ins-journey-onboarding.md:140`: - **Agree your journey's URL with the INS team** before registering a domain or a CDP frontend service. The session depends on the journey sitting under the sha...
- `docs-repo/docs/systems/EUDP/TNT-WebServices/TNT-WebServices-Package-2024.10.14/TNT-WebServices-Authentication.md:207`: - **Date of expiration**. After this date, you can no longer use the authentication key in the third party system. After this date, you will need to renew the a...
- `docs-repo/docs/systems/EUDP/TNT-WebServices/TNT-WebServices-Package-2024.10.14/TNT-WebServices-Authentication.md:209`: - **Last read**: The last time you clicked on the **Eye** icon. If you are under the impression that this last read timestamp does not match your last access, y...
- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Future State Views/TRACES Reference Data Architecture.md:180`: - **No firehose APIs**: No high-throughput bulk APIs; no bulk extraction—searches must be specific (e.g. you cannot retrieve all commodity codes or all EPPO cod...
- `docs-repo/docs/systems/EUDP/Architecture and Development/DR/DR-EUDP-003-service-naming-strategy.md:122`: - **The product is built as one service.** A single entry point asks where you are importing from and what you are importing before routing you into a journey, ...
- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Future State Views/TRACES Tech Spike Architecture.md:364`: - **Why not control throughput with SQS?** SQS controls *who* gets a message (visibility timeout, at-least-once delivery) and *how many* messages are in the que...
- `docs-repo/docs/systems/EUDP/TNT-WebServices/TNT-WebServices-Package-2024.10.14/TNT-WebServices-Authentication.md:208`: - A renewed authentication key will always be different from the one you had. Please, remember to update it in the third part system.

#### `easy`, `easier`, `easiest` and 4 more

- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Future State Views/TRACES Tech Spike Architecture.md:182`: - **Deterministic responses**: Stub returns configurable or fixture responses (e.g. sample ITAHC, CHED, reference data), making it easier to test error handling...
- `docs-repo/docs/systems/IPAFFS/analysis/IPAFFS-Authentication-Analysis.md:256`: - **Easier disaster recovery** without shared session state
- `docs-repo/docs/systems/IPAFFS/analysis/IPAFFS-Authentication-Analysis.md:250`: - **Standard OAuth2/OIDC compliance** for easier integration
- `.claude/workareas/skills-audit/mermaid-check.md:53`: - **Temp-name collision** - 'start-mermaid-check.sh:77': 'tr '/.' '__'' maps 'a/b.md' and 'a_b.md' to the same 'safe' name; same-index blocks from colliding fil...
- `docs-repo/docs/systems/DMP/analysis/Moving DMP features to CDP.md:338`: - Easier to debug issues
- `docs-repo/docs/systems/EUDP/Architecture and Development/ADR/ADR-EUDP-002-outbox-event-specification.md:89`: - much easier for integration boundaries
- `docs-repo/docs/systems/EUDP/TRACES Integration Gateway/TIG - Technology/TIG - Analysis/API Calls/Overview.md:25`: - the implication here is that it is easier to create an invalid CHED than would be ideal because the application (in places at least) appears to rely on the UI...
- `docs-repo/docs/systems/EUDP/Architecture and Development/ADR/ADR-EUDP-001-dynamics-integration.md:41`: - Where practical, these contracts should be centralised, so they are easier to understand and maintain.
- `docs-repo/docs/systems/EUDP/TNT-WebServices/TNT-WebServices-Package-2024.10.14/TNT-WebServices-Electronic-Signature-for-SPS-Certification.md:336`: • A certificate path (the certificate of the issuer of the signer certificate) should be added to ds:KeyInfo as it makes the validation of the signature of the ...
- `.claude/workareas/technical-authoring/design.md:74`: \| 2. Draft each section \| each section makes its point from its own items and nothing else, in the form the plan chose, with each paragraph opening on its claim...

#### `defense`, `offense`, `pretense` and 15 more

- `.claude/skills/british-technical-writing/SKILL.md:85`: - Proper nouns keep their own spelling: Pearl Harbor, the US Department of Defense, World Health Organization, Center for Internet Security.
- `.claude/skills/british-technical-writing/SKILL.md:74`: \| -ce noun, -se verb \| licence (noun) and license (verb); practice (noun) and practise (verb); advice and advise; defence, offence, pretence \| license (noun), p...
- `.claude/skills/british-technical-writing/SKILL.md:97`: \| at the weekend \| on the weekend \|
- `.claude/skills/british-technical-writing/SKILL.md:106`: \| cyber security (two words, UK government and NCSC usage) \| cybersecurity \|
- `.claude/skills/british-technical-writing/SKILL.md:98`: \| different from \| different than \|
- `.claude/skills/british-technical-writing/SKILL.md:92`: \| fill in a form \| fill out a form \|
- `.claude/skills/british-technical-writing/SKILL.md:99`: \| got \| gotten \|
- `.claude/skills/british-technical-writing/SKILL.md:103`: \| maths \| math \|
- `.claude/skills/british-technical-writing/SKILL.md:102`: \| mobile phone, postcode, car park, lift, autumn, fortnight, holiday, annual leave \| cell phone, zip code, parking lot, elevator, fall, vacation \|
- `.claude/skills/british-technical-writing/SKILL.md:107`: \| per cent in prose; % with figures \| percent \|

#### `facilitate`, `facilitates`, `facilitated` and 1 more

- 2 times, first at `docs-repo/docs/systems/EUDP/TNT-WebServices/TNT-WebServices-Package-2024.10.14/TNT-WebServices-Electronic-Signature-for-SPS-Certification.md:120`: - 4. Specific case for electronic phytosanitary certificates: IPPC has designed a central ePhyto HUB facilitating the interconnectivity in a 'many to many' conn...
- 2 times, first at `docs-repo/docs/systems/EUDP/TNT-WebServices/TNT-WebServices-Package-2024.10.14/TNT-WebServices-Electronic-Signature-for-SPS-Certification.md:107`: The purpose of this Model Law on Electronic Signatures (MLES) is to enable and facilitate the use of electronic signatures by establishing criteria of technical...
- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Future State Views/TRACES Integration Solution Overview.md:58`: - **Synchronous** retrieval of individual documents (e.g. one ITAHC/CHED by id) is supported when clients require immediate response, with timeouts and clear er...
- `docs-repo/docs/systems/BTMS/Delivery Passport/Technology View/Current State Views/System Context View.md:30`: - Facilitate a mechanism to allow the parallel processing of CDS and IPAFFS messages on both ALVS and BTMS until such a time as BTMS can take over as the source...
- `docs-repo/docs/systems/IPAFFS/features/ADR-ODP-245 - IPAFFS Software Delivery Solution.md:170`: - Incorporate dynamic PaaS provisioning via Azure Service Operator to facilitate rapid prototyping
- `docs-repo/docs/systems/BTMS/Delivery Passport/Technology View/Current State Views/System Context View.md:32`: - It also facilitated a mechanism for gradual cutover of decisions, so we could verify that messages from BTMS are valid before full cutover
- `docs-repo/docs/guidelines/Protective Monitoring Specification - Application v2.2.md:392`: - PMC01 - Accurate time in logs - To provide a means of providing accurate time in logs and synchronisation between system components with a view to facilitatin...
- `docs-repo/docs/systems/IPAFFS/features/ADR-ODP-245 - IPAFFS Software Delivery Solution.md:165`: AKS offers us the flexibility we need to begin decoupling and refactoring IPAFFS whilst also absorbing much of the business and operational logic that is curren...
- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Analysis/Traces Integration Requirements.md:10`: As part of the UK's alignment with the EU SPS (Sanitary and Phytosanitary) zone, we need to implement a TRACES Gateway to facilitate integration with TRACES NT ...
- `docs-repo/docs/Trade/Delivery Information Architecture/Technology View/Current State Views/System Landscape View.md:16`: The Trade Imports landscape encompasses multiple systems working together to facilitate the import of goods into the UK. The diagram above shows the complete sy...

#### `touch base`, `sync up`, `catch up` and 33 more

- `.claude/skills/british-technical-writing/SKILL.md:34`: - Technical terms are correct when they are the exact term: "idempotent", "mutual TLS", "eventual consistency", "content security policy". Jargon is a word used...
- `.claude/skills/british-technical-writing/SKILL.md:176`: \| architect (verb), productise, operationalise \| design, make into a product, put into operation \|
- `.claude/skills/british-technical-writing/SKILL.md:168`: \| boil the ocean, move the needle, ballpark, slam dunk, home run, in the weeds, punt, quarterback (verb), table (a topic: in British English it means to raise i...
- `.claude/skills/british-technical-writing/SKILL.md:157`: \| circle back, loop back \| return to, follow up \|
- `.claude/skills/british-technical-writing/SKILL.md:188`: \| dogfooding \| internal use \|
- `.claude/skills/british-technical-writing/SKILL.md:190`: \| figure out \| work out \|
- `.claude/skills/british-technical-writing/SKILL.md:169`: \| heads up \| notice, warning \|
- `.claude/skills/british-technical-writing/SKILL.md:161`: \| low-hanging fruit, quick win \| easy change, cheap improvement \|
- `.claude/skills/british-technical-writing/SKILL.md:191`: \| normalcy, obligate, skyrocket \| normality, oblige, rise sharply \|
- `.claude/skills/british-technical-writing/SKILL.md:172`: \| ping me, shoot an email \| message me, send an email \|

#### `on a daily basis`, `on a weekly basis`, `on a regular basis` and 9 more

- `.claude/skills/british-technical-writing/SKILL.md:28`: - Use the shortest common word that is precise: use, not 'utilise'; before, not prior to; about, not regarding; so, not consequently; start, not initiate or com...
- `.claude/skills/british-technical-writing/SKILL.md:219`: \| ascertain, determine \| find out, decide \|
- `.claude/skills/british-technical-writing/SKILL.md:204`: \| at this point in time, at this time, currently, presently \| now, or give the date or version \|
- `.claude/skills/british-technical-writing/SKILL.md:209`: \| commence, initiate \| start \|
- `.claude/skills/british-technical-writing/SKILL.md:206`: \| in excess of \| more than \|
- `.claude/skills/british-technical-writing/SKILL.md:231`: \| in terms of \| delete; state the relation \|
- `.claude/skills/british-technical-writing/SKILL.md:224`: \| it is recommended that \| we recommend, or "should" \|
- `.claude/skills/british-technical-writing/SKILL.md:203`: \| on a daily basis \| daily, every day \|
- `.claude/skills/british-technical-writing/SKILL.md:223`: \| per annum \| a year \|
- `.claude/skills/british-technical-writing/SKILL.md:350`: 7. Voice and tense: passive sentences without a reason; "will" describing behaviour; "allows you to"; "it is recommended"; "should" where "must" is meant; "may"...

#### `portal`

- `docs-repo/docs/systems/BTMS/Delivery Passport/Technology View/Current State Views/Features/Matching Reporting.md:39`: - **BTMS Portal Frontend** — [btms-portal-frontend](https://github.com/DEFRA/btms-portal-frontend)
- `docs-repo/docs/systems/EUDP/Architecture and Development/PHA/PHA Solution Overview.md:411`: - **Outbound BTMS (Basic auth)**: Unchanged shared-secret Basic auth to Trade Imports Data API. Credentials are **CDP Portal Secrets** for 'pha-import-notificat...
- `docs-repo/docs/systems/BTMS/Delivery Passport/Technology View/Current State Views/Container View.md:57`: - **Repo:** [btms-portal-frontend](https://github.com/DEFRA/btms-portal-frontend)
- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Future State Views/TRACES Integration Solution Overview.md:39`: - DEFRA systems integrate with TRACES by journey - without dealing with TRACES protocols directly: BTMS receives RoW CHED updates from the change feed; INS uses...
- `docs-repo/docs/systems/EUDP/Architecture and Development/PHA/PHA Solution Overview.md:430`: - OpenAPI / developer portal updates for the new version and digital-document API
- `docs-repo/docs/systems/BTMS/Delivery Passport/Technology View/Current State Views/Features/Viewing Matches.md:76`: - Portal source: [btms-portal-frontend](https://github.com/DEFRA/btms-portal-frontend)
- `docs-repo/docs/systems/EUDP/Architecture and Development/PHA/PHA Solution Overview.md:38`: - Structured certificate data remains consistent with what BTMS holds for matching and portal views
- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Future State Views/TRACES Integration Solution Overview.md:235`: - Users of INS for EU→GB import notifications (e.g. live animals, germinals, and likely plants) raised in INS without standing TRACES integration; on-demand ITA...
- `docs-repo/docs/systems/EUDP/TNT-WebServices/TNT-ORGANIC-OPERATOR-WebServices-Package-2024.08.16/TNT-WebService-for-ORGANIC-OPERATOR-submission-V1.md:449`: In case the operator address automatically selected by the system ends up being incorrect (i.e. wrong portal code or city), the correct procedure to correct the...
- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Future State Views/TRACES Tech Spike Architecture.md:19`: TRACES NT is the EU platform for SPS (Sanitary and Phytosanitary) certification, and the UK must integrate with it for the following. **INS** (Import Notificati...

#### `earned`, `earns its place`, `earn its place` and 4 more

- `.claude/workareas/technical-authoring/planning-dialogue.md:281`: - **The check of each point's consequence if false earned its place.** The check found that part of the boundary story rests on a proposed ADR, before any draft...
- `.claude/workareas/technical-authoring/decisions.md:77`: - 'language.md': "Sentences and paragraphs", "The whole document" and "Headings, lists and tables". The "Paragraph Restatement Test" is replaced by a reverse ou...
- `.claude/workareas/skills-audit/mermaid-check.md:91`: - 'SKILL.md:6-12' intro rhetoric ("worse than no diagram") - two sentences of "why"; borderline, but it earns its place by motivating the unprompted-verify rule...
- `.claude/skills/mermaid-check/SKILL.md:38`: \| Whether the diagram earns its place in the document \| 'authoring' \|
- `.claude/workareas/technical-authoring/decisions.md:51`: 21. Round one of the trial, on the INS Event Design page, settled the skill's value on 10 November 2026. The skill beat british-technical-writing on structure a...
- `.claude/workareas/skills-audit/confluence-read.md:24`: Correctly absent. Setup is exactly two deterministic commands - auth pre-flight ('SKILL.md:40') then fetch ('SKILL.md:49') - which is under the 3+ threshold whe...
- `.claude/workareas/skills-audit/confluence-publish.md:23`: Present and earns its keep - the pre-flight collapses ~8 deterministic checks (repo presence, tooling presence, npm-install, path resolution, credentials, API r...
- `commit 8eca492:12`: WARN tiers, and adds earned, easy and cheap. The skill, the standard

#### `load-bearing`

- `docs-repo/docs/systems/EUDP/Architecture and Development/INS - Imports Notification Service/ins-threat-model.md:240`: - Agree the journey URL/domain with the INS team before registering: the shared parent-domain cookie is load-bearing, and a domain outside it breaks the session...
- `docs-repo/docs/systems/EUDP/Architecture and Development/INS - Imports Notification Service/ins-auth-analysis.md:292`: - INS delegation of authority is organisation-to-organisation, mirroring IPAFFS: an importer organisation authorises an agency organisation, and any employee of...
- `docs-repo/docs/systems/EUDP/Architecture and Development/INS - Imports Notification Service/ins-auth-analysis.md:176`: - The cookie is scoped to a shared parent domain (for example '.imports.<...>.defra.cloud') so every journey frontend on a subdomain receives it. The domain lay...
- `docs-repo/docs/systems/EUDP/Architecture and Development/INS - Imports Notification Service/ins-threat-model.md:12`: **This is a working analysis, not an assurance artefact.** It exists to inform design while INS is still being built, and to feed the Secure by Design and threa...
- `docs-repo/docs/systems/EUDP/Architecture and Development/INS - Imports Notification Service/ins-threat-model.md:174`: \| T9.3 \| No role authorisation because the org picker was bypassed \| E \| Org context \| 'roles' claim only returned when the IDM organisation picker is used; INS...
- `docs-repo/docs/systems/EUDP/Architecture and Development/INS - Imports Notification Service/ins-auth-analysis.md:200`: The step where an authenticated user chooses, or is bound to, the organisation context they act within. The token 'roles' claim is only returned when the Custom...

#### `seamless`, `seamlessly`

- 2 times, first at `docs-repo/docs/systems/EUDP/TNT-WebServices/TNT-WebServices-Package-2024.10.14/TNT-WebServices-Electronic-Signature-for-SPS-Certification.md:105`: signatures in the EU are governed by the Electronic Identification and Trust Services (eIDAS) Regulation. eIDAS provides a predictable regulatory environment di...
- `docs-repo/docs/systems/EUDP/Architecture and Development/INS - Imports Notification Service/ins-auth-analysis.md:379`: - Whether to require existing IPAFFS users to re-register, or to migrate them seamlessly. Product decision, gates the AMR set. Informed by: IDM provides no bulk...
- `docs-repo/docs/systems/EUDP/Architecture and Development/INS - Imports Notification Service/ins-solutions-overview.md:173`: \| **Integration** \| Seamless integration with downstream operational systems. Well-defined interfaces supporting future evolution. Decouple from external system...
- `docs-repo/docs/systems/EUDP/Architecture and Development/INS - Imports Notification Service/gbn-ag-solutions-overview.md:101`: \| **Integration** \| Seamless integration with PIMS and other operational systems. Well-defined interfaces supporting future evolution. Reuse notification data a...

#### `cuts a tag`, `cuts a release`, `cut a release` and 13 more

- `.claude/skills/british-technical-writing/SKILL.md:259`: \| cuts a tag, cuts a release \| creates a tag, publishes a release \|
- `.claude/skills/british-technical-writing/SKILL.md:271`: \| spins up, stands up, tears down \| creates, starts, deletes \|
- `.claude/skills/british-technical-writing/SKILL.md:266`: \| wires up, plumbs in, bolts on, hooks into \| connects, configures, adds, subscribes to \|
- `.claude/skills/british-technical-writing/SKILL.md:279`: Select (not click on, hit, or tap unless the device is a touch screen); select or clear a checkbox; turn on and turn off (not enable and disable, activate and d...

#### `combat*`, `pledge*`, `disincentivis*` and 7 more

- `.claude/skills/british-technical-writing/SKILL.md:158`: \| going forward, moving forward \| from now on, in future, after this release \|
- `.claude/skills/british-technical-writing/SKILL.md:369`: Before: "Prior to initiating the deployment process, please ensure that you've reached out to the on-call engineer and gotten sign-off, in order to avoid any go...
- `.claude/skills/british-technical-writing/SKILL.md:149`: GOV.UK's list of words to avoid applies in full: agenda (unless for a meeting), advance, collaborate, combat, commit, pledge, counter, deliver (for anything but...

#### `powerful`, `elegant`, `beautiful` and 40 more

- `.claude/skills/british-technical-writing/SKILL.md:178`: \| ninja, rockstar, guru, wizard, 10x engineer \| expert, specialist \|
- `.claude/skills/british-technical-writing/SKILL.md:147`: robust, powerful, 'seamless', 'seamlessly', frictionless, intuitive, elegant, beautiful, clean (as praise), delightful, effortless, magic, "just works", cutting...

#### `for the benefit of`, `has nothing to ask`, `have nothing to ask` and 5 more

- `.claude/skills/british-technical-writing/SKILL.md:248`: - Everyday idiom where a literal statement exists: "has nothing to ask INS for" (needs no further input from INS); "moves on" (delete); "falls away" (is elimina...
- `.claude/skills/british-technical-writing/SKILL.md:329`: \| has nothing to ask X for \| everyday idiom for a dependency statement \| needs no further input from X \|

#### `utilise`, `utilises`, `utilised` and 5 more

- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Analysis/EUDP internal model definition.md:131`: Besides the samples used to date, the CHED and INTRA mapping sheets require the internal model to support the **full** consignment subtree: **transit countries*...

#### `streamline`, `streamlines`, `streamlined` and 1 more

- `docs-repo/docs/systems/EUDP/Architecture and Development/INS - Imports Notification Service/gbn-ag-solutions-overview.md:79`: 4. **Reduce operational overhead** Replace manual processes, re-keying, spreadsheets, emails, and fragmented workflows with a streamlined digital service.

#### `whitelist*`, `blacklist*`, `slave` and 9 more

- `.claude/skills/british-technical-writing/SKILL.md:283`: Allow list and block list (not whitelist and blacklist); primary and replica, or main, controller and worker (not master and slave); placeholder (not dummy); ch...

### Words to Examine

| Row | Findings (repo / docs / commits) | Files | Matched terms |
| --- | --- | --- | --- |
| `shape`, `shapes` | 163 (83 / 77 / 3) | 68 | shape 136, shapes 27 |
| `behavior`, `behaviors`, `color` and 39 more | 129 (27 / 97 / 5) | 47 | period 37, enrollment 22, whilst 13, centers 12, program 11, center 10, behavior 8, expiration 7, roster 6, parentheses ... |
| `price`, `prices`, `priced` and 34 more | 101 (42 / 58 / 1) | 36 | lands 18, price 14, collapse 13, land 11, collapses 7, buy 6, rides 5, leak 4, posture 4, bite 3, leaks 3, spends 3, boo... |
| `deliver`, `delivers`, `delivered` and 1 more | 98 (12 / 86 / 0) | 40 | delivered 44, deliver 24, delivers 21, delivering 11 |
| `agenda`, `collaborate`, `collaborates` and 21 more | 90 (32 / 57 / 1) | 44 | hub 26, dialogue 18, initiated 11, focused 8, counter 5, initiate 5, promote 5, collaborate 4, focus 4, focuses 4, agend... |
| `prior to`, `subsequent to`, `in the event that` and 24 more | 86 (22 / 64 / 0) | 39 | currently 28, prior to 9, regarding 7, a number of 6, in accordance with 6, modification 4, modifications 4, respectivel... |
| `note that`, `it is worth noting`, `it's worth noting` and 20 more | 85 (24 / 61 / 0) | 46 | note that 22, simply 16, actually 15, very 14, quite 6, easily 5, it is worth noting 5, not only 5, ultimately 5, basica... |
| `secure`, `secured`, `guarantee` and 3 more | 84 (31 / 53 / 0) | 35 | secure 32, guarantee 19, shall 17, guarantees 10, guaranteed 7, secured 2 |
| `stamps`, `stamped`, `pins to` and 32 more | 78 (35 / 43 / 0) | 44 | surfaces 11, fires 10, the box 10, surfaced 6, blocks on 5, talks to 5, fired 4, happy path 4, stamped 4, comes back 3, ... |
| `reach out`, `reaches out`, `reached out` and 34 more | 77 (32 / 45 / 0) | 36 | architect 26, kind of 13, bandwidth 7, super 6, actionable 4, the ask 3, baked in 2, bottom line 2, deep dive 2, gotchas... |
| `under the hood`, `out of the box`, `out-of-the-box` and 27 more | 68 (18 / 50 / 0) | 37 | go-live 12, stakeholders 12, cadence 7, siloed 6, ongoing 5, agnostic 4, pain point 4, stakeholder 4, under the hood 3, ... |
| `frictionless`, `intuitive`, `mission-critical` and 14 more | 52 (14 / 37 / 1) | 32 | landscape 9, comprehensive 8, harness 8, frictionless 7, meet the 7, best practice 5, introducing 4, best practices 3, c... |
| `alone` | 50 (12 / 38 / 0) | 29 | alone 50 |
| `appropriate`, `appropriately` | 35 (1 / 34 / 0) | 18 | appropriate 33, appropriately 2 |
| `the receiving half`, `the sending half`, `the middle` and 5 more | 19 (10 / 8 / 1) | 11 | the middle 10, waits on 5, nobody owns 4, the receiving half 3, moves on 2, wait on 2, the sending half 1 |
| `click on`, `click the`, `tap the` and 7 more | 12 (8 / 4 / 0) | 5 | click on 6, shows up 6, click the 1, pops up 1 |
| `robust`, `robustly` | 5 (2 / 3 / 0) | 3 | robust 5 |
| `sanity check*`, `man-in-the-middle`, `guys` | 5 (3 / 2 / 0) | 4 | guys 3, man-in-the-middle 2, sanity check 2 |
| `foster`, `fosters`, `fostered` and 1 more | 3 (1 / 2 / 0) | 3 | foster 3 |
| `bounds` | 2 (0 / 2 / 0) | 2 | bounds 2 |
| `overarching` | 1 (1 / 0 / 0) | 1 | overarching 1 |
| `held open under`, `argued under`, `its case is made` and 4 more | 0 (0 / 0 / 0) | 0 |  |

#### `shape`, `shapes`

- 6 times, first at `.claude/skills/confluence-publish/decisions.md:3`: Recorded during CREATE interview. Update if a shape choice
- 3 times, first at `.claude/skills/confluence-publish/decisions.md:10`: ## 2. State shape
- 3 times, first at `.claude/skills/confluence-read/decisions.md:17`: ## 3. State shape
- 2 times, first at `.claude/best-practices/git/commits.md:5`: ## Shape
- `docs-repo/docs/systems/EUDP/Architecture and Development/ADR/ADR-EUDP-007-app-registration-tenancy.md:329`: - [Configure cross-tenant workload identity on AKS](https://learn.microsoft.com/en-us/azure/aks/workload-identity-cross-tenant): Microsoft's worked example of r...
- `.claude/workareas/skills-audit/confluence-publish.md:74`: - **'## Dependencies' body section: present and good** ('SKILL.md:22-41') - states rationale, which features are used, and the depend-over-port justification (t...
- `.claude/workareas/skills-audit/confluence-publish.md:104`: - **A5/A9** (fan-out shapes) - no fan-out; N/A.
- `docs-repo/docs/systems/EUDP/Architecture and Development/ADR/ADR-EUDP-010-ins-tds-schema-resources.md:224`: - **Bare tags or GitHub Releases**: whether the poller lists tags or Releases. A Release can carry a built asset, such as a dictionary export in the shape Purvi...
- `.claude/workareas/technical-authoring/design.md:128`: - **Document types:** the person, mode and tense of a how-to, a reference page, an explanation, a decision record and the team's other document shapes. A decisi...
- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Analysis/EUDP internal model definition.md:237`: - **Follow-up and non-compliance roots:** Part III follow-up ('DocomFollowUp', 'ChedFollowUp') and non-compliance ('ChedNonComplianceDetails') mappings use **di...

#### `behavior`, `behaviors`, `color` and 39 more

- 10 times, first at `docs-repo/docs/systems/EUDP/TRACES Integration Gateway/TIG - Technology/TIG - Analysis/API Calls/ReferenceData/ClassificationTreeNodeDetail_0102.md:176`: \| ZOO \| veterinary \| - false \| Bodies, institutes and centers \| EFTA, European Union \|
- 4 times, first at `docs-repo/docs/systems/IPAFFS/features/ADR-ODP-245 - IPAFFS Software Delivery Solution.md:94`: <figure align="center">
- 4 times, first at `docs-repo/docs/guidelines/ADV QRG v2.2.md:171`: <td><p>As well as service enrollment and being assigned one or more service roles consider changes in user role, for example uplifting or changing privilege</p>
- 4 times, first at `docs-repo/docs/guidelines/ADV QRG v2.2.md:238`: <td><p>User registration and service enrollment must be audited.</p>
- 4 times, first at `docs-repo/docs/guidelines/ADV QRG v2.2.md:73`: <td><p>Whilst anti-malware scanning is via common infrastructure components, local business rules may also need to be implemented (for example document type and...
- 4 times, first at `docs-repo/docs/guidelines/ADV QRG v2.2.md:178`: <td>Consider service enrollment, account permission and privilege management</td>
- 4 times, first at `docs-repo/docs/guidelines/ADV QRG v2.2.md:246`: <td>Successful and unsuccessful user registration and service enrollment action must be logged</td>
- 4 times, first at `docs-repo/docs/guidelines/ADV QRG v2.2.md:226`: <td>Users must accept that their usage will be monitored as part of service enrollment</td>
- 2 times, first at `docs-repo/docs/systems/EUDP/TNT-WebServices/TNT-WebServices-Package-2024.10.14/TNT-WebServices-Electronic-Signature-for-SPS-Certification.md:159`: - 4. XAdES-BASELINE-**LTA**: *Signature with Long Term Data and Archive timestamp* By using periodical timestamping (e.g. each year) compromising is prevented w...
- 2 times, first at `docs-repo/docs/systems/EUDP/TNT-WebServices/TNT-WebServices-Package-2024.10.14/TNT-WebServices-Electronic-Signature-for-SPS-Certification.md:143`: - Validity period

#### `price`, `prices`, `priced` and 34 more

- `docs-repo/docs/systems/EUDP/Explorations/Imports - Explorations/Exploration - IUU/Technical options - IUU.md:63`: - **Alternative (only if policy mandates):** collapse IUU into another certificate journey - high risk of conflating IUU with SPS in UX and data unless hard sep...
- `.claude/skills/trade-imports-dr/assets/style-guide.md:8`: - **Be kind without softening**: no "genuinely", "honestly", "quite frankly", "importantly", "note that", "it is worth noting that". Say the thing.
- `docs-repo/docs/systems/EUDP/Architecture and Development/DR/DR-EUDP-001-import-notification-numbering.md:97`: - **Is secure by design.** The body is generated randomly from a 32⁶ ≈ 1.07 billion address space per '{prefix}-{year}'. A typo or guess overwhelmingly lands on...
- `.claude/workareas/skills-audit/mermaid-check.md:51`: - **Orphaned mktemp siblings** - 'render-mermaid.sh:44' ('tmp_src=$(mktemp -t ...).mmd') and ':71' ('tmp_out=$(mktemp -t ...).svg'): 'mktemp' creates the extens...
- `.claude/skills/defra-architecture-review/SKILL.md:326`: - 'GR-DATA-02' Should. Use authoritative sources for shared entities (customers, organisations, land parcels, holdings, locations, species) rather than local co...
- `.claude/skills/defra-architecture-review/SKILL.md:87`: - 'GR-TECH-01' Look for something to reuse first (Must): any build, buy or choose decision. Did the document show the reuse check?
- `.claude/skills/defra-architecture-review/SKILL.md:280`: - 'GR-TECH-02' Should. Buy commodity, build differentiating: buy or use SaaS for commodity needs; build only where the capability is specific to Defra's mission...
- `.claude/skills/defra-architecture-review/SKILL.md:284`: - 'GR-TECH-06' Must. Get spend approval early: spend under the government digital and technology spend control is discussed with the architecture team before pr...
- `.claude/workareas/skills-audit/confluence-read.md:95`: - 'SKILL.md:17-21' - the three-row "When to use" table exists to encode one routing difference ("fetch" stops after Step 2). Could collapse to a single sentence...
- `docs-repo/docs/systems/EUDP/Architecture and Development/INS - Imports Notification Service/ins-auth-analysis.md:371`: - Auto-enrolment only bootstraps the first admin of an organisation with the default service role; it does not carry every user across with their existing roles...

#### `deliver`, `delivers`, `delivered` and 1 more

- 2 times, first at `docs-repo/docs/systems/EUDP/Architecture and Development/INS - Imports Notification Service/gbn-ag-solutions-overview.md:358`: \| EUDP \| EU Trade Digital Programme delivering SPS Reset EU trade digital services. \|
- 2 times, first at `docs-repo/docs/systems/EUDP/Architecture and Development/INS - Imports Notification Service/gbn-ag-solutions-overview.md:28`: In response to this policy intent, DEFRA has made an internal commitment to deliver Day One digital capability by December 2026. While this date is not external...
- 2 times, first at `docs-repo/docs/systems/EUDP/TNT-WebServices/TNT-CHED-WebServices-Package-2025.02.07/TNT-UN-CEFACT-WebService-for-CHED-submission-V01.md:448`: Once the SOAP message is delivered to the CHED Submission endpoint, the system performs different validations:
- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Future State Views/TRACES Tech Spike Architecture.md:408`: - **Asynchronous (production)**: The supported pattern for all user journeys. Returns 202 Accepted immediately; result delivered via callback and/or polling (GE...
- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Future State Views/TRACES Tech Spike Architecture.md:222`: - **At-least-once delivery**: SQS may deliver messages more than once; idempotency and deduplication are required at the application level.
- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Future State Views/TRACES Integration Solution Overview.md:885`: - **CDP Uploader** ('cdp-uploader') - quarantine and built-in malware scan for digital documents. The Gateway pushes retrieved bytes through it. Only a clean fi...
- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Future State Views/TRACES Integration Solution Overview.md:249`: - **Flow**: Gateway (TRACES Client) → SOAP/XML + WS-Security → TRACES NT; responses transformed to JSON and delivered to callers or to MDM (reference data)
- `docs-repo/docs/systems/EUDP/Architecture and Development/DR/DR-EUDP-004-journey-domain-topology.md:34`: - **IUU (illegal, unreported and unregulated fishing)**, a candidate at Alpha stage and not yet commissioned. It is delivered by a different team and would not ...
- `docs-repo/docs/systems/EUDP/Architecture and Development/DR/DR-EUDP-004-journey-domain-topology.md:99`: - **IUU may not join the INS at all**, sitting at Alpha with the choice still open, delivered by a different team and not bound by the obligations model.
- `docs-repo/docs/systems/EUDP/Architecture and Development/DR/DR-EUDP-005-performance-testing-boundary.md:162`: - **Journey-level targets and testing for IUU**, which belong to the team delivering that journey. This DR sets the boundary rule and the tiers, and the combine...

#### `agenda`, `collaborate`, `collaborates` and 21 more

- 2 times, first at `docs-repo/docs/systems/EUDP/TNT-WebServices/TNT-WebServices-Package-2024.10.14/TNT-WebServices-Electronic-Signature-for-SPS-Certification.md:120`: - 4. Specific case for electronic phytosanitary certificates: IPPC has designed a central ePhyto HUB facilitating the interconnectivity in a 'many to many' conn...
- `.claude/workareas/technical-authoring/planning-dialogue.md:271`: - "Later": "document-planning adds the options drawn from the corpus to the dialogue."
- `.claude/workareas/technical-authoring/planning-dialogue.md:268`: - "The System" and "The Arrows": the author "talks the plan through in the planning dialogue and agrees the plan".
- `.claude/workareas/technical-authoring/planning-dialogue.md:269`: - "Writing a Document", a new first stage: "0. Plan \| the author talks, and authoring plays back the plan, adds no point and writes the plan once the author agr...
- `docs-repo/docs/systems/EUDP/TNT-WebServices/TNT-WebServices-Package-2024.10.14/TNT-WebServices-Electronic-Signature-for-SPS-Certification.md:299`: - § Do not risk to suffer from any removal/change in the SOAP Header (like in the IPPC ePHYTO HUB case)
- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Future State Views/TRACES Integration Solution Overview.md:589`: - **Consumer-initiated requests**: Per-module SNS request topics and SQS queues (INTRA, CHED retrieval, CHED submission, DOCOM, reference data). Request message...
- `docs-repo/docs/Trade/Delivery Information Architecture/Technology View/Current State Views/System Landscape View.md:47`: - **NCH Operator** - National Control Hub operators
- `docs-repo/docs/systems/BTMS/Delivery Passport/Technology View/Current State Views/System Context View.md:154`: - **NCH Operator**: National Clearance Hub operator that will want to investigate no-match instances on BTMS, as this information is not available on IPAFFS or ...
- `.claude/best-practices/skills/patterns.md:15`: - **Prose-canonical** if: the artifact is a narrative the user reads end-to-end and nothing queries (a plan, a Jira description, a refinement verdict report, a ...
- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Future State Views/TRACES Integration Solution Overview.md:570`: - **Responsibilities**: Synchronous certificate and reference-data retrieval; consumer-initiated async operations (202 + callback/polling); per-module queue con...

#### `prior to`, `subsequent to`, `in the event that` and 24 more

- 4 times, first at `docs-repo/docs/guidelines/ADV QRG v2.2.md:21`: Protective monitoring events must be considered as part of the solution design. A RAG status must be produced by the monitored solution component(s) to define t...
- 2 times, first at `docs-repo/docs/systems/EUDP/TNT-WebServices/TNT-WebServices-Package-2024.10.14/TNT-WebServices-Electronic-Signature-for-SPS-Certification.md:157`: - 2. XAdES-BASELINE-**T**: *Signature with a timestamp* A timestamp regarding the time of signing is added to protect against repudiation.
- 2 times, first at `docs-repo/docs/systems/EUDP/Architecture and Development/INS - Imports Notification Service/gbn-ag-solutions-overview.md:24`: Paragraph 25 states: "The vast majority of movements of animals, animal products, plants, and plant products between Great Britain and the European Union will b...
- 2 times, first at `docs-repo/docs/systems/EUDP/TNT-WebServices/TNT-WebServices-Package-2024.10.14/TNT-WebServices-Electronic-Signature-for-SPS-Certification.md:406`: Please note that **no canonicalization algorithm strips spaces, CR/LF or tab characters** and that any change in the spacing or indentation in the XML is consid...
- 2 times, first at `docs-repo/docs/systems/EUDP/TNT-WebServices/TNT-CHED-WebServices-Package-2025.02.07/TNT-UN-CEFACT-WebService-for-CHED-submission-V01.md:297`: This method creates a CHED consignment and decision leaving the decision still open for modifications.
- 2 times, first at `docs-repo/docs/systems/EUDP/TNT-WebServices/TNT-CHED-WebServices-Package-2025.02.07/TNT-UN-CEFACT-WebService-for-CHED-submission-V01.md:345`: This method updates an existing CHED, leaving the decision still open for modifications.
- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Future State Views/TRACES Tech Spike Architecture.md:503`: - **Addresses (Operators)**: There is no bulk download for operators; consumers must regularly call findOperator. UK postcodes and address formats differ from T...
- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Future State Views/TRACES Integration Solution Overview.md:601`: - **Contents**: Correlation IDs, callback URLs, async request state, raw reference-data snapshots prior to MDM publish, and transactional outbox records for TDS...
- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Future State Views/TRACES Reference Data Architecture.md:186`: - **Support SLA**: UK is not a Member State; TRACES support is typically 9–5 Mon–Fri, ticket-based, and can take time through triage. The working assumption is ...
- `docs-repo/docs/systems/EUDP/Explorations/Imports - Explorations/Exploration - IUU/IUU Technical Architecture Proposal.md:30`: - **Technical decoupling:** a separate team can build and maintain the IUU journeys with minimal dependencies on other teams (currently a critical issue in IPAF...

#### `note that`, `it is worth noting`, `it's worth noting` and 20 more

- 3 times, first at `docs-repo/docs/systems/EUDP/TNT-WebServices/TNT-CHED-WebServices-Package-2025.02.07/TNT-UN-CEFACT-WebService-for-CHED-retrieve-V01.md:362`: Please note that when an operator is a non-business operator (or unregistered), the ID element is missing, as in the following example:
- 2 times, first at `docs-repo/docs/systems/EUDP/TNT-WebServices/TNT-CHED-WebServices-Package-2025.02.07/TNT-UN-CEFACT-WebService-for-CHED-submission-V01.md:463`: - a. The validator will perform the same set validation rules that a CHED has to pass when submitted with the standard Web Interface. Business rules at this sta...
- 2 times, first at `docs-repo/docs/systems/EUDP/TNT-WebServices/TNT-WebServices-Package-2024.10.14/TNT-WebServices-Electronic-Signature-for-SPS-Certification.md:457`: **NB:** Please note that the samples given could result in invalid signatures as test certificates were used.
- 2 times, first at `docs-repo/docs/systems/EUDP/TNT-WebServices/TNT-WebServices-Package-2024.10.14/TNT-WebServices-Electronic-Signature-for-SPS-Certification.md:126`: As explained in the previous chapter, in order to replace a paper SPS certificate to be presented to an EU authority, an **advanced or qualified** signature wil...
- 2 times, first at `docs-repo/docs/systems/EUDP/TNT-WebServices/TNT-WebServices-Package-2024.10.14/TNT-WebServices-Electronic-Signature-for-SPS-Certification.md:406`: Please note that **no canonicalization algorithm strips spaces, CR/LF or tab characters** and that any change in the spacing or indentation in the XML is consid...
- `.claude/skills/trade-imports-dr/assets/style-guide.md:8`: - **Be kind without softening**: no "genuinely", "honestly", "quite frankly", "importantly", "note that", "it is worth noting that". Say the thing.
- `.claude/skills/trade-imports-dr/SKILL.md:166`: - **Cut filler adverbs and throat-clearing** such as "genuinely", "honestly", "in essence", "quite frankly", "importantly". Say the thing.
- `.claude/skills/trade-imports-dr/SKILL.md:167`: - **Drop "note that" and "it is worth noting that"**; just say the thing.
- `docs-repo/docs/systems/EUDP/TNT-WebServices/TNT-EPHYTO-WebServices-Package-2024.02.06/TNT-UN-CEFACT-WebService-for-EPHYTO-retrieve-V1.md:74`: - **IMSOC Phyto (or simply Phyto):** a phytosanitary certificate issued using IMSOC user interface.
- `docs-repo/docs/systems/EUDP/Architecture and Development/DR/DR-EUDP-005-performance-testing-boundary.md:122`: - **The shared components stay real** because they are the concentration point for all journeys, and stubbing them would remove the very coupling the combined t...

#### `secure`, `secured`, `guarantee` and 3 more

- 2 times, first at `docs-repo/docs/systems/EUDP/Architecture and Development/INS - Imports Notification Service/gbn-ag-solutions-overview.md:193`: - Secure by Design
- 2 times, first at `docs-repo/docs/systems/EUDP/TNT-WebServices/TNT-WebServices-Package-2024.10.14/TNT-WebServices-Electronic-Signature-for-SPS-Certification.md:105`: signatures in the EU are governed by the Electronic Identification and Trust Services (eIDAS) Regulation. eIDAS provides a predictable regulatory environment di...
- 2 times, first at `docs-repo/docs/systems/EUDP/TNT-WebServices/TNT-CHED-WebServices-Package-2025.02.07/TNT-UN-CEFACT-WebService-for-CHED-submission-V01.md:227`: The objective of the IMSOC-TRACES system defined under Regulation (EU) 2017/625 is to foster EU wide integration for the management of the Official Controls in ...
- `docs-repo/docs/systems/EUDP/Architecture and Development/DR/DR-EUDP-004-journey-domain-topology.md:81`: - **Defect isolation** A bad deploy, a runaway query or a data defect affects one commodity class and one set of importers, which is also what makes the product...
- `docs-repo/docs/systems/EUDP/Architecture and Development/DR/DR-EUDP-001-import-notification-numbering.md:97`: - **Is secure by design.** The body is generated randomly from a 32⁶ ≈ 1.07 billion address space per '{prefix}-{year}'. A typo or guess overwhelmingly lands on...
- `.claude/skills/defra-architecture-review/SKILL.md:313`: - 'GR-API-07' Must. Secure every API: authenticate callers (OAuth 2.0 / OpenID Connect or mutual TLS), authorise every request, validate input, rate limit. No A...
- `.claude/skills/defra-architecture-review/SKILL.md:407`: - 'GR-FIELD-03' Should. Manage and secure every device: enrolled, encrypted, patched, remotely wipeable.
- `.claude/skills/defra-architecture-review/SKILL.md:271`: - 'GR-PRIN-05' **Connect and collaborate**: well-documented, secure, reusable APIs by default; industry standards; event-driven architecture; single sign-on; sh...
- `.claude/skills/defra-architecture-review/SKILL.md:272`: - 'GR-PRIN-06' **Secure today, safe tomorrow**: security proportionate to risk, built in from the start; follow Defra group Security; role-based access control.
- `.claude/skills/defra-architecture-review/SKILL.md:338`: - 'GR-SEC-01' Must. Follow Secure by Design: every new service and significant change, with a named risk owner, from discovery onward.

#### `stamps`, `stamped`, `pins to` and 32 more

- 2 times, first at `docs-repo/docs/guidelines/ADV QRG v2.2.md:45`: \| 01-03 \| Application log files must include the time as part of the log entry \| All log file records must be date and time stamped using Universal Coordinated ...
- 2 times, first at `docs-repo/docs/guidelines/ADV QRG v2.2.md:46`: \| 01-04 \| This is included in the JSON message format specification \| All event messages must be date and time stamped using Universal Coordinated Time and must...
- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Future State Views/TRACES Reference Data Architecture.md:227`: - **Approved Establishments** (also a data domain that was picked up as problematic by NID stakeholders)
- `docs-repo/docs/systems/IPAFFS/features/ADR-ODP-245 - IPAFFS Software Delivery Solution.md:59`: - **Fail fast**: Issues should be detected and surfaced early in the pipeline, not during production deployment
- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Future State Views/TRACES Integration Solution Overview.md:882`: - **Microsoft Entra ID** - operator access to CDP admin surfaces; federated identity credentials for CDP → ASB (ADR-EUDP-004 Option 4)
- `docs-repo/docs/systems/EUDP/Architecture and Development/INS - Imports Notification Service/INS Auth/00-ins-auth-foundations.md:31`: - 'trade-imports-ins-backend' sits behind the front door and aggregates notification data across all INS journeys for the dashboard.
- `docs-repo/docs/systems/EUDP/Explorations/Imports - Explorations/Exploration - IUU/Technical options - IUU.md:45`: - A **Journey Frontend** talks to a **Journey Backend** for the journey it serves.
- `.claude/skills/jira/SKILL.md:61`: - A key Jira does not know makes Jira refuse the whole query. The refusal comes back as a 'USAGE' error naming the key: drop the key and retry.
- `docs-repo/docs/systems/EUDP/Explorations/Imports - Explorations/Exploration - National Notification System/Technical options - NNS.md:62`: - An NNS Journey Frontend talks to an NNS Journey Backend.
- `docs-repo/docs/systems/EUDP/Architecture and Development/INS - Imports Notification Service/ins-nfr-volumetrics.md:19`: - Dependencies are covered in section 9, which inventories the calls INS blocks on, derives the rate each one carries at the design-target peak, and sets out th...

#### `reach out`, `reaches out`, `reached out` and 34 more

- 3 times, first at `docs-repo/docs/systems/EUDP/Architecture and Development/BTMS/BTMS - Technology/BTMS - Future State Views/BTMS Solution Overview.md:8`: - This SO will be reviewed by key stakeholders and approved by the Principal Architect, or designated deputies if appropriate.
- 3 times, first at `docs-repo/docs/guidelines/ADV QRG v2.2.md:173`: <td>All change in local or network account status must be logged and must include the user ID, any domain ID of the user, the host on which the change was made,...
- 2 times, first at `docs-repo/docs/systems/EUDP/Architecture and Development/INS - Imports Notification Service/gbn-ag-solutions-overview.md:10`: - This SO will be reviewed by key stakeholders and approved by the EUTD Chief Architect, or designated deputies if appropriate.
- 2 times, first at `docs-repo/docs/guidelines/ADV QRG v2.2.md:23`: For completeness the controls documented here are a simple super set of those in the previous section. If the business user journey event fully meets the requir...
- `docs-repo/docs/systems/IPAFFS/Delivery Passport/Technology View/Current State Views/System Context View.md:96`: - [Authentication analysis](../../../analysis/IPAFFS-Authentication-Analysis.md) - deep dive on the identity broker
- `.claude/workareas/technical-authoring/planning-dialogue.md:35`: - **Horizontal.** The points at one level are one kind of thing. The gap check runs both ways: every point has material, and every duty or claim in the author's...
- `.claude/skills/trade-imports-dr/assets/style-guide.md:7`: - **Write warmly but professionally**: government context, so the reader is a senior product owner, security architect or service designer, not a customer. Avoi...
- `.claude/skills/defra-architecture-review/SKILL.md:362`: - 'GR-FE-05' Should. Design for low bandwidth and rural users: light pages, save progress, consider offline for field tools.
- `.claude/workareas/skills-audit/confluence-read.md:95`: - 'SKILL.md:17-21' - the three-row "When to use" table exists to encode one routing difference ("fetch" stops after Step 2). Could collapse to a single sentence...
- `docs-repo/docs/systems/EUDP/TRACES Integration Gateway/TIG - Technology/TIG - Analysis/API Calls/ReferenceData/GetClassificationTree_chedp.md:1346`: - Amino-acids, other than those containing more than one kind of oxygen function, and their esters; salts thereof: 'R/N-10026/N-10292/N-19009' [t:nomenclature]

#### `under the hood`, `out of the box`, `out-of-the-box` and 27 more

- 3 times, first at `docs-repo/docs/systems/EUDP/Architecture and Development/BTMS/BTMS - Technology/BTMS - Future State Views/BTMS Solution Overview.md:8`: - This SO will be reviewed by key stakeholders and approved by the Principal Architect, or designated deputies if appropriate.
- 2 times, first at `docs-repo/docs/systems/EUDP/Architecture and Development/INS - Imports Notification Service/gbn-ag-solutions-overview.md:10`: - This SO will be reviewed by key stakeholders and approved by the EUTD Chief Architect, or designated deputies if appropriate.
- 2 times, first at `docs-repo/docs/systems/EUDP/TNT-WebServices/TNT-CHED-WebServices-Package-2025.02.07/TNT-UN-CEFACT-WebService-for-CHED-submission-V01.md:397`: \|               \| -<br>PartiallyRejectedChed<br>o<br>This SPSCertificate must contain the reference to the updating<br>CHED as the method updateConsignmentAndSu...
- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Future State Views/TRACES Reference Data Architecture.md:225`: - **Address (Operators)**: No bulk download; findOperator must be called regularly. Siloed address books across systems; need a central store. UK postcodes vs T...
- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Future State Views/TRACES Tech Spike Architecture.md:503`: - **Addresses (Operators)**: There is no bulk download for operators; consumers must regularly call findOperator. UK postcodes and address formats differ from T...
- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Future State Views/TRACES Reference Data Architecture.md:227`: - **Approved Establishments** (also a data domain that was picked up as problematic by NID stakeholders)
- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Future State Views/TRACES Reference Data Architecture.md:229`: - **Bulk upload of Commodity codes for validation** (identified as a major pain point by an eEHC stakeholder). Commodity codes have also been observed to disapp...
- `.claude/skills/defra-architecture-review/SKILL.md:343`: - 'GR-SEC-06' Must. Test before go-live and after major change: independent IT health check proportionate to risk.
- `docs-repo/docs/systems/IPAFFS/features/ADR-ODP-245 - IPAFFS Software Delivery Solution.md:177`: - Composable, incremental, immutable releases with improved visibility and rapid feedback at each step, instead of a big bang snapshot.
- `docs-repo/docs/systems/EUDP/Explorations/Imports - Explorations/Exploration - IUU/Technical options - IUU.md:172`: - HMRC / CDS: IUU reference representation; one vs two decision streams; interaction with auto-clearance and waiver codes (pain point in service design).

#### `frictionless`, `intuitive`, `mission-critical` and 14 more

- 4 times, first at `docs-repo/docs/guidelines/ADV QRG v2.2.md:74`: <p>Best practice is to scan documents on receipt and also when they are opened/read as zero-day issues may only be detected when scanned at a later date</p></td...
- `docs-repo/docs/systems/EUDP/Architecture and Development/ADR/ADR-EUDP-007-app-registration-tenancy.md:326`: - [Best practices for all isolation architectures](https://learn.microsoft.com/en-us/entra/architecture/secure-best-practices): the multi-tenant application rec...
- `docs-repo/docs/systems/EUDP/Explorations/Imports - Explorations/Exploration - IUU/IUU Technical Architecture Proposal.md:32`: - **BTMS alignment:** integrates into existing customs matching and decision distribution capabilities rather than introducing a new decision channel (which wou...
- `docs-repo/docs/systems/IPAFFS/analysis/IPAFFS-Authentication-Analysis.md:251`: - **Future-proof architecture** for government digital transformation
- `.claude/skills/defra-architecture-review/SKILL.md:268`: - 'GR-PRIN-02' **Design for users**: intuitive, accessible, consistent solutions; GDS-based UI standards; reuse familiar processes across Defra.
- `docs-repo/docs/systems/EUDP/Explorations/Imports - Explorations/Exploration - National Notification System/Technical options - NNS.md:136`: - Apply a border hold to high-risk EU plants: technically feasible (mirroring today's CHED-PP) but defeats the policy intent of frictionless EU movement and rei...
- `docs-repo/docs/systems/EUDP/Explorations/Imports - Explorations/Exploration - National Notification System/Technical options - NNS.md:134`: - Do nothing (paper / email / manual handling): could technically be supported, but does not meet the scale, timeliness, data-quality and auditability needs, an...
- `docs-repo/docs/systems/EUDP/Explorations/Imports - Explorations/Exploration - National Notification System/Technical options - NNS.md:82`: - EU certificate exchange: under the frictionless model, no phytosanitary certificate is exchanged for EU movements, so notification is importer-provided into t...
- `.claude/workareas/technical-authoring/design-review.md:69`: - Evidence: "a comprehensive edit is document-planning's work, a copy edit is authoring's".
- `docs-repo/docs/systems/EUDP/Explorations/Imports - Explorations/Exploration - National Notification System/Technical options - NNS.md:135`: - Extend IPAFFS / IDCOMS as-is: not viable while IPAFFS is being replaced, and the legacy estate (IPAFFS CHED-PP, IDCOMS) carries high coupling and constrained ...

#### `alone`

- 2 times, first at `docs-repo/docs/systems/EUDP/Architecture and Development/INS - Imports Notification Service/ins-auth-solution-space.md:150`: \| Who runs the OIDC flow, how many clients \| 'ins-frontend' alone, one client per provider, two in total \|
- `docs-repo/docs/systems/EUDP/TNT-WebServices/TNT-WebServices-Package-2024.10.14/TNT-WebServices-Electronic-Signature-for-SPS-Certification.md:300`: - § Is producing a stand-alone XML file with content of the original SPSCertificate XML plus its signature inside a single file
- `docs-repo/docs/systems/EUDP/Architecture and Development/PHA/PHA Solution Overview.md:414`: - **Async document identity**: Gateway 'requestId' identifies the outstanding digital-document request (authoritative; PHA proxies it and does not maintain a pa...
- `docs-repo/docs/systems/EUDP/Explorations/Imports - Explorations/Exploration - RoW Import (CHED-PP)/Technical options - RoW Import CHED-PP.md:355`: - **Skipping IDCOMS** - loses casework and explicit assignment; returns pressure onto TRACES UI alone.
- `docs-repo/docs/systems/EUDP/Architecture and Development/DR/DR-EUDP-008-event-consumer-analysis.md:106`: - '(eventType, subType)' on the envelope. The envelope schema states that consumers discriminate on this pair, never on 'eventType' alone, because the same 'eve...
- `docs-repo/docs/systems/EUDP/Explorations/Imports - Explorations/Exploration - Marketing Standards (F&V)/Technical options - Marketing Standards - F&V.md:71`: - call the risk engine at the risk-at time, passing whether the CHED claims a CoC and whether an AIS CoC condition is met, rather than origin or AIS status alon...
- `docs-repo/docs/systems/EUDP/Architecture and Development/ADR/ADR-EUDP-001-dynamics-integration.md:279`: - Deploying stand-alone workers to read a Journey database violates database access over service boundaries (this may be misunderstanding that principle)
- `docs-repo/docs/systems/EUDP/Explorations/Imports - Explorations/Exploration - Marketing Standards (F&V)/Technical options - Marketing Standards - F&V.md:205`: - Goods already in EU free circulation before movement to GB. Origin alone is not a reason to inspect again, and whether GB marketing standards still apply is a...
- `docs-repo/docs/systems/EUDP/TNT-WebServices/TNT-eSignature-WebServices-Package-2022.01.19/TNT-WebServices-Electronic-Signature-for-SPS-Certification.md:296`: - Is producing a stand-alone XML file with content of the original SPSCertificate XML plus its signature inside a single file
- `.claude/skills/british-technical-writing/SKILL.md:294`: - Links: the link text describes the destination and stands alone ("see the retry policy"), never "click here", "here", "this page" or a bare URL in prose.

#### `appropriate`, `appropriately`

- 5 times, first at `docs-repo/docs/systems/EUDP/Architecture and Development/BTMS/BTMS - Technology/BTMS - Future State Views/BTMS Solution Overview.md:9`: - The architecture models will be supplemented and complemented with an appropriate level of narrative description.
- 3 times, first at `docs-repo/docs/systems/EUDP/Architecture and Development/BTMS/BTMS - Technology/BTMS - Future State Views/BTMS Solution Overview.md:8`: - This SO will be reviewed by key stakeholders and approved by the Principal Architect, or designated deputies if appropriate.
- 2 times, first at `docs-repo/docs/systems/EUDP/Architecture and Development/INS - Imports Notification Service/gbn-ag-solutions-overview.md:10`: - This SO will be reviewed by key stakeholders and approved by the EUTD Chief Architect, or designated deputies if appropriate.
- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Analysis/TRACES web services.md:34`: - **CHED Submission V2** ('wsdl/ChedCertificateSubmissionServiceV2.xml') has many operations (e.g. 'CreateDraftChed', 'CreateAndSubmitChedForDecision', 'CreateA...
- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Future State Views/TRACES Tech Spike Architecture.md:129`: - **Queue Manager**: Publishes async requests to appropriate SNS topics based on message type
- `docs-repo/docs/systems/EUDP/Architecture and Development/BTMS/BTMS - Technology/BTMS - Future State Views/BTMS Solution Overview.md:129`: - All internal application functions will only be accessible via trusted network sources and authenticated appropriately
- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Analysis/Traces Integration Requirements.md:116`: - Appropriate timeout handling for long-running TRACES operations
- `docs-repo/docs/systems/BTMS/Delivery Passport/Technology View/Current State Views/Features/Matching and Generating Decisions.md:22`: - Determine the appropriate documentary checks required for imported goods
- `docs-repo/docs/systems/DMP/analysis/dmp-data-storage-pattern.md:226`: - Each database sized appropriately
- `docs-repo/docs/systems/EUDP/Architecture and Development/BTMS/BTMS - Technology/BTMS - Future State Views/BTMS Solution Overview.md:41`: - Import documents from the appropriate source are matched to HMRC CDS clearance requests and decisions are communicated back to CDS

#### `the receiving half`, `the sending half`, `the middle` and 5 more

- `.claude/skills/british-technical-writing/SKILL.md:248`: - Everyday idiom where a literal statement exists: "has nothing to ask INS for" (needs no further input from INS); "moves on" (delete); "falls away" (is elimina...
- `docs-repo/docs/systems/EUDP/Architecture and Development/PHA/PHA Solution Overview.md:110`: - Poll / retrieve must not wait on TRACES PDF operations
- `.claude/skills/british-technical-writing/SKILL.md:245`: - Rhythmic tricolons and balanced contrasts built for effect. A list of three real steps is fine ("one tag, one poll, one registration"). "INS tags and moves on...
- `.claude/skills/british-technical-writing/SKILL.md:244`: - Slogans, epigrams and antithesis. "INS sends, TDS receives, nobody owns the middle" becomes "INS would own the sending workflow and TDS the receiving API. No ...
- `.claude/skills/british-technical-writing/SKILL.md:247`: - Vague partitives and spatial metaphors standing in for a named component: "the receiving half", "the middle", "both ends", "end to end", "inside it", "moved i...
- `docs-repo/docs/systems/EUDP/Architecture and Development/ADR/ADR-EUDP-010-ins-tds-schema-resources.md:98`: ![Two panels. Option 1, push from GitHub Actions: a GitHub Actions runner on the public internet holds a credential for the Defra estate and posts across the es...
- `docs-repo/docs/systems/EUDP/Delivery/Delivery Passport - TRACES Integration Gateway/Operational View - TRACES Integration Gateway/Non-functional requirements - TRACES Integration Gateway.md:25`: \| [NFR-PRF-02](https://defra.github.io/architecture/nfrs/catalogue/#nfr-prf) \| API response time \| [GR-API-02](https://defra.github.io/architecture/guardrails/a...
- `.claude/skills/british-technical-writing/SKILL.md:327`: \| A sends, B receives, nobody owns the middle \| slogan built as a tricolon \| A would own the sending workflow and B the receiving API. No team would own the int...
- `.claude/skills/british-technical-writing/SKILL.md:328`: \| nobody owns the middle \| slogan, partitive \| no team owns the integration between them \|
- `.claude/skills/british-technical-writing/SKILL.md:323`: \| the receiving half, the sending half, the middle \| partitive standing in for a named component \| the receiving API, the sending workflow, the integration betw...

#### `click on`, `click the`, `tap the` and 7 more

- `docs-repo/docs/systems/EUDP/TNT-WebServices/TNT-WebServices-Package-2024.10.14/TNT-SoapUI-WS-Security-Configuration.md:134`: - 1) Open one of the automatically created requests (double click on the selected request).
- `docs-repo/docs/systems/EUDP/TRACES Integration Gateway/TIG - Technology/TIG - Analysis/API Calls/developer-cheat-sheet.md:21`: - click on ***Create new CHED / NOA***
- `docs-repo/docs/systems/EUDP/TNT-WebServices/TNT-WebServices-Package-2024.10.14/TNT-WebServices-Authentication.md:198`: **Note: After 2 years, the authentication key will have to be renewed.** To renew it, simply click the "Renew key" button and use the new authentication key in ...
- `.claude/skills/british-technical-writing/SKILL.md:160`: \| deep dive, double-click on, drill down, dig into \| examine, review in detail, explain \|
- `.claude/skills/defra-architecture-review/SKILL.md:257`: 1. **Platforms before projects. Built as products.** Reusable platforms and long-lived products over one-off solutions. Applies 'GR-PRIN-01', 'GR-PRIN-03'; show...
- `.claude/skills/defra-architecture-review/SKILL.md:258`: 2. **Standards and guardrails before exceptions.** Use approved identity, security and hosting patterns by default; exceptions only for a clear business need. A...
- `docs-repo/docs/systems/EUDP/TNT-WebServices/TNT-WebServices-Package-2024.10.14/TNT-SoapUI-WS-Security-Configuration.md:92`: 2) Double click on the project name, a new window appears. Select the "WS-Security Configurations" tab:
- `.claude/skills/defra-architecture-review/SKILL.md:259`: 3. **Reuse before buy.** Before procuring, ask whether an existing capability, platform or service meets the need. Applies 'GR-PRIN-03'; shows up in 'GR-TECH-01...
- `.claude/skills/defra-architecture-review/SKILL.md:260`: 4. **Data is an enterprise asset.** Data belongs to the organisation, not to systems or teams; do not ask for the same information twice. Applies 'GR-PRIN-04', ...
- `.claude/skills/defra-architecture-review/SKILL.md:261`: 5. **Assume AI until proven otherwise.** Deliberately explore whether AI improves the outcome before defaulting to a traditional approach. Applies 'GR-PRIN-07',...

#### `robust`, `robustly`

- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Future State Views/TRACES Tech Spike Architecture.md:462`: - **Reliability**: Known to be unreliable (requires robust retry logic)
- `docs-repo/docs/systems/EUDP/Architecture and Development/ADR/ADR-EUDP-002-outbox-event-specification.md:91`: - more robust for loosely coupled consumers
- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Future State Views/TRACES Tech Spike Architecture.md:521`: 1. **Robust Retry Logic**: Implement exponential backoff and retry mechanisms for async operations and callback delivery
- `.claude/skills/british-technical-writing/SKILL.md:149`: GOV.UK's list of words to avoid applies in full: agenda (unless for a meeting), advance, collaborate, combat, commit, pledge, counter, deliver (for anything but...
- `.claude/skills/british-technical-writing/SKILL.md:147`: robust, powerful, 'seamless', 'seamlessly', frictionless, intuitive, elegant, beautiful, clean (as praise), delightful, effortless, magic, "just works", cutting...

#### `sanity check*`, `man-in-the-middle`, `guys`

- `.claude/skills/trade-imports-dr/assets/style-guide.md:101`: ## Publishing sanity check
- `.claude/skills/british-technical-writing/SKILL.md:171`: \| a ton of, a bunch of, pretty much, kind of, sort of, super, awesome, real quick, you guys, folks \| many, several, about, some, or delete \|
- `.claude/skills/british-technical-writing/SKILL.md:283`: Allow list and block list (not whitelist and blacklist); primary and replica, or main, controller and worker (not master and slave); placeholder (not dummy); ch...
- `docs-repo/docs/systems/EUDP/TNT-WebServices/TNT-EPHYTO-WebServices-Package-2024.02.06/TNT-UN-CEFACT-WebService-for-EPHYTO-submission-V1.md:152`: This Web Service can be used by NPPO competent authorities to submit an ePhyto document. The web service interface acts mainly as man-in-the-middle with the IPP...
- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Analysis/Jims Analysis.md:13`: To pull the data from TRACES is fine, because they'll wiggle and we'll just absorb it, slinging it into Mongo etc, but given you guys want to push CHEDs and (ho...

#### `foster`, `fosters`, `fostered` and 1 more

- 2 times, first at `docs-repo/docs/systems/EUDP/TNT-WebServices/TNT-CHED-WebServices-Package-2025.02.07/TNT-UN-CEFACT-WebService-for-CHED-submission-V01.md:227`: The objective of the IMSOC-TRACES system defined under Regulation (EU) 2017/625 is to foster EU wide integration for the management of the Official Controls in ...
- `.claude/skills/british-technical-writing/SKILL.md:149`: GOV.UK's list of words to avoid applies in full: agenda (unless for a meeting), advance, collaborate, combat, commit, pledge, counter, deliver (for anything but...

#### `bounds`

- `docs-repo/docs/systems/EUDP/Architecture and Development/DR/DR-EUDP-008-release-process-implementation.md:128`: \| Codelist links \| No 'urlId' host resolves today. A consumer can match the values but not dereference them. Outside the decision, but it bounds what the meanin...
- `docs-repo/docs/systems/EUDP/Architecture and Development/INS - Imports Notification Service/ins-nfr-volumetrics.md:470`: A **synchronous** call is one where INS blocks on the answer, so the callee's latency is added to a user's wait and the callee's availability bounds ours. Those...

#### `overarching`

- `.claude/skills/british-technical-writing/SKILL.md:149`: GOV.UK's list of words to avoid applies in full: agenda (unless for a meeting), advance, collaborate, combat, commit, pledge, counter, deliver (for anything but...

### Patterns

| Pattern | Findings | Files |
| --- | --- | --- |
| em dash | 856 | 28 |
| spaced en dash | 89 | 21 |
| curly quote | 88 | 17 |
| N/A | 40 | 11 |
| trailing it | 100 | 35 |

#### em dash

- 2 times, first at `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Analysis/UN-CEFACT JSON alignment proposal.md:15`: - [TRACES to internal model mapping](TRACES%20to%20internal%20model%20mapping.md) — conversion rules and examples
- 2 times, first at `docs-repo/docs/systems/EUDP/Explorations/Imports - Explorations/Exploration - INS TRACES Integration/INS TRACES BTMS integration pattern.md:127`: - [TRACESNT–BTMS integration design](../../../../../architecture/roadmap/btms-tracesnt/analysis/TRACESNT-BTMS-Integration-Design.md) (on hold — future BTMS–TRAC...
- 2 times, first at `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Analysis/EUDP internal model - TRACES workbook field inventory.md:513`: ### SPSConsignment — identifiers, dates, remaining
- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Analysis/defra-certificate-internal-v1.md:16`: - [ADR-EUDP-003 - Internal Models for SPS Certificates](../../ADR/ADR-EUDP-003%20-%20Internal%20Models%20for%20SPS%20Certificates.md) — UNVTD-first target archi...
- `docs-repo/docs/systems/EUDP/Explorations/Imports - Explorations/Exploration - INS TRACES Integration/INS TRACES BTMS integration pattern.md:125`: - [ADR-EUDP-003 — internal models for SPS certificates](../../Architecture%20and%20Development/ADR/ADR-EUDP-003:%20Internal%20Models%20for%20SPS%20Certificates....
- `docs-repo/docs/systems/EUDP/Architecture and Development/BTMS/BTMS - Technology/BTMS - Future State Views/BTMS Solution Overview.md:506`: - [CDP architectural overview — security](https://portal.cdp-int.defra.cloud/documentation/architecture/architectural-overview.md#security)
- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Analysis/UN-CEFACT JSON alignment proposal.md:17`: - [Defra certificate internal model (v1)](defra-certificate-internal-v1.md) — version contract
- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Analysis/UN-CEFACT JSON alignment proposal.md:16`: - [EUDP internal model — TRACES workbook field inventory](EUDP%20internal%20model%20-%20TRACES%20workbook%20field%20inventory.md) — exhaustive Parent+Element li...
- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Analysis/UN-CEFACT JSON alignment proposal.md:14`: - [EUDP internal model definition](EUDP%20internal%20model%20definition.md) — field catalogue derived from TRACES workbooks (sections 1–7)
- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Analysis/defra-certificate-internal-v1.md:14`: - [EUDP internal model definition](EUDP%20internal%20model%20definition.md) — field list, source in TRACES, purpose

#### spaced en dash

- 4 times, first at `docs-repo/docs/systems/EUDP/TRACES Integration Gateway/TIG - Technology/TIG - Analysis/API Calls/ReferenceData/ClassificationTreeNodeDetail_03021400.md:187`: \| MM \| food \| + true \| Minced meat, meat preparations and mechanically separated meat – MM, MP, MSM \| EFTA, European Union \|
- 2 times, first at `docs-repo/docs/systems/EUDP/TNT-WebServices/TNT-WebServices-Package-2024.10.14/TNT-WebServices-Electronic-Signature-for-SPS-Certification.md:473`: \|                     \| ePhyto – signed SPSCertificate.xml               \| CIRCA-BC                   \|
- 2 times, first at `docs-repo/docs/systems/EUDP/Architecture and Development/ADR/ADR-EUDP-001-dynamics-integration.md:172`: \| Dimension \| Option A – Distributed Per-Journey Integration \| Option B – Centralised Gateway \| Option C – Best Effort + External Queue \|
- 2 times, first at `docs-repo/docs/systems/EUDP/TRACES Integration Gateway/TIG - Technology/TIG - Analysis/API Calls/ReferenceData/ClassificationTreeNodeDetail_03021400.md:343`: \| MM \| food \| + true \| Minced meat, meat preparations and mechanically separated meat – MM, MP, MSM \| Third countries \|
- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Future State Views/TRACES Integration Solution Overview.md:803`: - **Protective Monitoring Specification – Application**: control areas (PMC01–PMC12) and the JSON event message format (v1.2)
- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Analysis/Traces Integration Requirements.md:205`: - 'getAppliedBusinessRules' – Retrieves applied business rules for a specific CHED reference number (useful for diagnostics / support)
- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Analysis/Traces Integration Requirements.md:206`: - 'getAppliedDecisionRules' – Retrieves applied decision rules for a specific CHED reference number (useful for diagnostics / support)
- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Analysis/Traces Integration Requirements.md:203`: - 'getClassificationSections' – Retrieves classification sections used by TRACES
- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Analysis/Traces Integration Requirements.md:202`: - 'getHierarchicalMetadatas' – Retrieves hierarchical metadata lists (tree-structured controlled vocabularies)
- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Analysis/Traces Integration Requirements.md:201`: - 'getMetadatas' – Retrieves metadata lists (e.g. operator activity types, and similar controlled vocabularies)

#### curly quote

- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Analysis/TRACES reference data analysis.md:382`: - “Rule changed” / “required field” type errors → refresh applied business rules / decision rules (and treat as a business validation issue, not purely referenc...
- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Future State Views/TRACES Tech Spike Architecture.md:464`: - **Authentication**: SOAP-level authentication using WS-Security headers (UsernameToken + PasswordDigest + Nonce + Timestamp) plus TRACES header fields (e.g. L...
- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Analysis/TRACES reference data analysis.md:316`: - **Authority/operator IDs** — New BCPs, new approved establishments; Directory has no bulk export, so we rely on search/cache. A quick “is this ID still in our...
- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Analysis/TRACES web services.md:27`: - **CHED Certificate Service V2** (from 'wsdl/ChedCertificateServiceV2.xml') exposes more operations than a single “retrieve CHED” endpoint; the Gateway may exp...
- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Analysis/TRACES web services.md:34`: - **CHED Submission V2** ('wsdl/ChedCertificateSubmissionServiceV2.xml') has many operations (e.g. 'CreateDraftChed', 'CreateAndSubmitChedForDecision', 'CreateA...
- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Future State Views/TRACES Tech Spike Architecture.md:198`: - **Container view**: The following diagram shows the Gateway with the API Stub in place of live TRACES: Gateway Service, TRACES Client Service, and TRACES API ...
- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Analysis/TRACES web services.md:33`: - **Faults** in the WSDLs (e.g. 'ChedCertificateNotFoundException', 'ChedCertificatePermissionDeniedException', 'EuIntraCertificateNotFoundException') should be...
- `docs-repo/docs/systems/EUDP/Architecture and Development/PHA/PHA Solution Overview.md:253`: - **Flow**: IPAFFS → BTMS ingest → Data API → current PHA API version only (not the TRACES-shaped version’s primary contract)
- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Future State Views/TRACES Tech Spike Architecture.md:365`: - **Global throughput (optional)**: To enforce a single cap across all containers (e.g. “max 30 TRACES CHED requests per minute” regardless of replica count), a...
- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Analysis/TRACES to IPAFFS CHED comparison.md:72`: - **IPAFFS CHED** exposes a **Part I / Part II / Part III** API with different property names and extra UK fields. Mapping IPAFFS → internal model is a matter o...

#### N/A

- 2 times, first at `docs-repo/docs/systems/EUDP/Architecture and Development/INS - Imports Notification Service/ins-auth-analysis.md:57`: - CDP Perf: n/a
- 2 times, first at `docs-repo/docs/guidelines/Protective Monitoring Specification - Application v2.2.md:212`: <td>N/A</td>
- `.claude/workareas/skills-audit/confluence-publish.md:100`: - **A1** (walker on single artifact) - no walker exists; N/A.
- `.claude/workareas/skills-audit/confluence-publish.md:104`: - **A5/A9** (fan-out shapes) - no fan-out; N/A.
- `.claude/workareas/skills-audit/confluence-read.md:119`: - A11 (dispatcher-emitted commands off-allowlist) - N/A; no dispatcher, and both typed commands match the blanket tools entry.
- `.claude/workareas/skills-audit/confluence-read.md:117`: - A9 (custom subagent_type) - N/A; no workers.
- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Analysis/TRACES reference data analysis.md:108`: \| **Standard ISO** \| Fallback for country codes. \| N/A \| Validate against TRACES samples; some codes may be TRACES-specific. \|
- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Future State Views/TRACES Integration Solution Overview.md:839`: \| 07-03 / 07-04 / 07-05 (PMC07) \| End-user session, account and privilege change \| - \| **N/A** - no user store or trader session in the Gateway (upstream identi...
- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Future State Views/TRACES Integration Solution Overview.md:841`: \| 12-01…12-06 (PMC12) \| Consent, T&Cs, user sign-up \| - \| **N/A** - no trader UI or enrolment in the Gateway \|
- `docs-repo/docs/systems/EUDP/Architecture and Development/INS - Imports Notification Service/ins-nfr-volumetrics.md:597`: \| Document upload (SYN-28, SYN-29) \| IUU notifications x IUU3, two calls each \| n/a; 2,078 with IUU \| n/a \| 0.58 \| n/a; 0.87 with IUU \| Governed by response tim...

#### trailing it

- `docs-repo/docs/systems/EUDP/Architecture and Development/DR/DR-EUDP-008-schemas-release-process.md:21`: - **A tag is a snapshot** of the whole repository, never moved or deleted, so what it contains stays valid for every event that names it.
- `docs-repo/docs/systems/EUDP/Architecture and Development/TRACES Integration Gateway/TIG - Technology/TIG - Future State Views/TRACES Integration Solution Overview.md:885`: - **CDP Uploader** ('cdp-uploader') - quarantine and built-in malware scan for digital documents. The Gateway pushes retrieved bytes through it. Only a clean fi...
- `docs-repo/docs/systems/EUDP/Architecture and Development/DR/DR-EUDP-008-release-process-implementation.md:27`: - **CI derives the contract sets from the files**: an event schema belongs to the profile its '$ref' names and depends on the envelope its other '$ref' names, a...
- `docs-repo/docs/systems/EUDP/Architecture and Development/ADR/ADR-EUDP-008-ins-language-choice.md:117`: - **Components that call AWS Bedrock on CDP** are excepted. IUU needs backend components that interface with Bedrock, and their language is chosen separately, a...
- `docs-repo/docs/systems/EUDP/Architecture and Development/ADR/ADR-EUDP-010-ins-tds-schema-resources.md:163`: - **Create Data Dictionary resources for each tag**: process the JSON Schemas and JSON-LD files for each tag and use the resulting Purview artefacts to validate...
- `docs-repo/docs/systems/EUDP/Architecture and Development/ADR/ADR-EUDP-010-ins-tds-schema-resources.md:186`: - **Every event already carries the pointer**: 'schemaUri' names the release that governs the event. TDS needs the content behind that pointer, which is public ...
- `docs-repo/docs/systems/EUDP/Architecture and Development/ADR/ADR-EUDP-010-ins-tds-schema-resources.md:144`: - **Every event can be correlated to a tag**, because the gateway sets 'metadata.schemaUri' to a tagged ref rather than 'main', so the URI is immutable. The tag...
- `docs-repo/docs/systems/EUDP/Architecture and Development/DR/DR-EUDP-005-performance-testing-boundary.md:123`: - **No other team's assurance should depend on our run**, because incidental coverage is not a service level: if a downstream component needs load coverage, its...
- `docs-repo/docs/systems/EUDP/Architecture and Development/ADR/ADR-EUDP-010-ins-tds-schema-resources.md:193`: - **No rollback of a published release**, recorded in response to Alok Naik's question at the pre-SDA review of version 0.1. A release that proves wrong is fixe...
- `docs-repo/docs/systems/EUDP/Architecture and Development/DR/DR-EUDP-003-service-naming-strategy.md:119`: - **Sign-in continuity depends on it.** The INS frontend signs the user in and hosts the Unified Dashboard, then hands off to a journey frontend, and the sessio...

