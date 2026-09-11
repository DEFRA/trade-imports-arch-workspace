# Calibration round 2: plan-run

### 1. C-03-005 · sample session, line 9 · S3 fact · tool: fix/verified
Point: The passage states the session lifetime.
Defect: The record states eight hours where the routing page states twelve; which lifetime is current?
Text: `the session lasts eight hours`
Close: [R] remove `the session lasts eight hours` · [C] correct to `the session lasts twelve hours` (0 words) (default) · [O] record as open: The record states eight hours where the routing page states twelve; which lifetime is current? (owner unknown) · [I] ignore for now · [T] tell me what to do

### 2. C-02-002 · sample routing, line 17 · S4 residue · tool: propose/removal
Point: The Open questions list names what the proposal still has to settle.
Defect: The bullet keeps an open question inside the page while the register outside the pages holds the questions; where does this item belong?
Text: `- Which sealing library INS uses, how the seal key is provisioned, and what the rotation runbook says.`
Close: [R] remove `- Which sealing library INS uses, how the seal key is provisioned, and what the rotation runbook says.` (default) · [O] record as open: The bullet keeps an open question inside the page while the register outside the pages holds the questions; where does this item belong? (owner unknown) · [I] ignore for now · [T] tell me what to do

### 3. C-03-006 · sample session, line 7 · S3 omission · tool: propose/no-rewrite
Point: The passage states where sessions are stored.
Defect: The sentence covers every environment while the page names no store for test; which store does test use?
Text: `Sessions utilise the same store in every environment.`
Close: [R] remove `Sessions utilise the same store in every environment.` · [O] record as open: The sentence covers every environment while the page names no store for test; which store does test use? (owner unknown) · [I] ignore for now (default) · [T] tell me what to do

### 4. C-03-001 · sample session, line 5 · S4 term · tool: fix/verified
Point: The passage states what the service does with the token.
Defect: The verb is the Latinate form the style guide names; what does the longer verb add?
Text: `utilise the session token`
Close: [R] remove `utilise the session token` · [W] reword to `use the session token` (0 words) (default) · [O] record as open: The verb is the Latinate form the style guide names; what does the longer verb add? (owner unknown) · [I] ignore for now · [T] tell me what to do

### 5. C-02-003 · sample routing, line 13 · S4 repetition · tool: propose/removal
Point: The passage states where a session starts.
Defect: The sentence names the front door twice where the second clause could carry the pronoun; what does the repeat add?
Text: `the front door`
Close: [R] remove `the front door` (default) · [O] record as open: The sentence names the front door twice where the second clause could carry the pronoun; what does the repeat add? (owner unknown) · [I] ignore for now · [T] tell me what to do
