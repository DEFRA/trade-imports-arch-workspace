# GDS Language

Based on [UK Government Style Guide](https://www.gov.uk/guidance/style-guide).

## Plain English

### Words to Avoid

The Gate column is how `.claude/tools/editorial/check-prose.sh` treats the word: FAIL blocks the artefact, WARN reports the line for judgment, prose means this guidance only.

| Avoid | Use                                                             | Gate                                                                     |
|-------|-----------------------------------------------------------------|--------------------------------------------------------------------------|
| `deliver` | create, provide                                                 | FAIL                                                                     |
| `leverage` | use                                                             | FAIL                                                                     |
| `empower` | allow, let                                                      | FAIL                                                                     |
| `facilitate` | help, allow                                                     | FAIL                                                                     |
| `utilise` | use                                                             | FAIL                                                                     |
| `seamless` | state what the reader does not have to do                       | FAIL                                                                     |
| `user-friendly` | state the behaviour that helps the user                         | FAIL                                                                     |
| `streamline` | state what was removed or shortened                             | FAIL                                                                     |
| `portal` | website, service                                                | FAIL - lowercase generic only; proper nouns ("CDP Portal") and URLs pass |
| `robust` | state what it withstands (retries, redelivery, malformed input) | WARN                                                                     |
| `appropriate` | state the criterion                                             | WARN                                                                     |
| `overarching` | name the thing it spans                                         | WARN                                                                     |
| `foster` | state the action taken                                          | WARN                                                                     |
| `tackle` | state the action taken                                          | prose                                                                    |
| `strengthen` | state the change                                                | prose                                                                    |
| `load-bearing` | state why the concept is pivotal                                | FAIL                                                                     |

`transform` stays available: data transformation is this domain's vocabulary (TRACES mapping, jq transforms). Challenge it only where it means vague improvement rather than a data operation.

## Voice and Tone

### Active Voice
| Passive (avoid) | Active (preferred) |
|-----------------|-------------------|
| The form was submitted by the user | The user submitted the form |
| Errors were found | We found errors |

### Address Users Directly
Use "you". Avoid gendered pronouns - use "they".

## Sentences
- Under 25 words
- Front-load important information

### Avoid Negative Contractions
| Avoid | Use |
|-------|-----|
| can't | cannot |
| don't | do not |
| won't | will not |

## Capitalisation

Sentence case for all text except:

**Capitalise:** Department titles, job titles with names, benefits (Universal Credit), "The Civil Service"

**Don't capitalise:** "government", "civil servants", general job titles

## Numbers

| Format | Example |
|--------|---------|
| Write out "one" | one item |
| Numerals 2-9 | 5 notifications |
| Commas >999 | 9,000 |
| Percentages | 50% |
| Money (whole) | £75 |
| Money (pence) | £75.50 |

## Dates and Times

- Format: 4 June 2017 (no comma)
- Range: 10 November to 21 December (use "to")
- Time: 5:30pm, 10am to 11am
- Use "midnight" and "midday"

## Abbreviations

**No explanation needed:** BBC, NHS, UK, VAT, PDF, URL
**All others:** Explain on first mention
**Format:** No full stops (BBC not B.B.C.)

## Punctuation
- One space after full stops
- Use "to" in ranges, not hyphens
- No commas at end of address lines

## Technical Content

### Code Formatting
Use backticks for: classes, methods, functions, commands, filenames, paths, HTML elements, HTTP codes

### Preferred Terms
| Preferred | Avoid |
|-----------|-------|
| backend | back-end |
| frontend | front-end |
| filename | file name |
| folder | directory |
| run (a test) | execute, perform |
| set up | instantiate |
| turn on/off | enable/disable |

### Requirement Language
| Phrase | Meaning |
|--------|---------|
| You must | Mandatory |
| You should | Recommendation |
| You can | Option |

### Interface References
- Use "select" not "click"
- Use "page" for web and app

### Words to Minimise
Avoid "quick", "easy", "simple" - demoralising for users who struggle. Never gated: literal uses ("AWS Simple Queue Service", "Quick reference") are everywhere, so this stays a judgment call.

## Inclusive Language

- "disabled people" (not "the disabled")
- "women" and "men" (not "males/females")
- "they/them/their" for gender-neutral
