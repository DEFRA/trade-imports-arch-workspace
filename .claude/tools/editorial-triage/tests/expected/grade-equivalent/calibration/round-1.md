# Calibration round 1: equivalent-run

### 1. C-03-001 · sample session, line 5 · S2 contradiction · tool: author/author
Point: The passage states the session lifetime.
Defect: The record states an eight-hour session while the routing page states twelve; which value does the IDM policy set?
Text: `the session lasts eight hours`
Close: [R] remove `the session lasts eight hours` (default) · [K] keep A `the session lasts eight hours` or B `the session lasts twelve hours` · [O] record as open: Which session lifetime is current, eight hours or twelve? (Ben) · [I] ignore for now · [T] tell me what to do

### 2. C-02-002 · sample routing, line 12 · S1 citation · tool: fix/verified
Point: The passage grounds the redirect check in the RFC.
Defect: The RFC reference names section 4.11, which RFC 9700 does not have; which section covers the redirect check?
Text: `sections 4.7 and 4.11`
Close: [R] remove `sections 4.7 and 4.11` (default) · [C] correct to `sections 4.7 and 4.5` (0 words) · [O] record as open: The RFC reference names section 4.11, which RFC 9700 does not have; which section covers the redirect check? (owner unknown) · [I] ignore for now · [T] tell me what to do

### 3. C-04-001 · sample cookies, line 88 · S2 contradiction · tool: propose/grows
Point: The Open questions list names what the proposal still has to settle.
Defect: The Open questions bullet asks for the library, provisioning and runbook while the Cookie design section says they are recorded separately from this proposal; which statement stands?
Text: `Which sealing library INS uses, how the seal key is provisioned, and what the rotation runbook says.`
Close: [R] remove `- Which sealing library INS uses, how the seal key is provisioned, and what the rotation runbook says.` (default) · [K] keep A `Which sealing library INS uses, how the seal key is provisioned, and what the rotation runbook says.` or B `The library choice, key provisioning and the rotation runbook are implementation detail, to be recorded separately from this proposal.` · [O] record as open: The Open questions bullet asks for the library, provisioning and runbook while the Cookie design section says they are recorded separately from this proposal; which statement stands? (owner unknown) · [I] ignore for now · [T] tell me what to do

### 4. C-03-003 · sample session, line 30 · S3 fact · tool: propose/tangent
Point: The passage states what IDM contributes at sign-in.
Defect: The clause places the lifetimes in the session record while the record table lists no such field; where do the lifetimes live?
Text: `IDM's contribution arrives at sign-in as token lifetimes, held server-side in the session record;`
Close: [R] remove `, held server-side in the session record` (default) · [C] correct to `IDM's contribution arrives at sign-in as token lifetimes;` (-6 words) · [O] record as open: The clause places the lifetimes in the session record while the record table lists no such field; where do the lifetimes live? (owner unknown) · [I] ignore for now · [T] tell me what to do

### 5. C-02-001 · sample routing, line 46 · S2 contradiction · tool: propose/removal
Point: The sign-out form carries the ID token hint so IDM can identify the session.
Defect: States return-URL validation as fact while Open questions says it depends on a tenant setting that is unverified.
Text: `which IDM uses to identify the session and validate the return URL`
Close: [R] remove `and validate the return URL` (default) · [C] correct to `which IDM uses to identify the session` (-5 words) · [K] keep A `which IDM uses to identify the session and validate the return URL` or B `That setting is what makes IDM validate the return URL against the registered list` · [O] record as open: States return-URL validation as fact while Open questions says it depends on a tenant setting that is unverified. (owner unknown) · [I] ignore for now · [T] tell me what to do

### 6. C-02-003 · sample routing, line 33 · S3 fact · tool: propose/dispersion
Point: The passage states which routing-service controls the direct path bypasses.
Defect: The list says request logging does not apply on the direct path, while the logging page says every request is logged at the front door; which is true?
Text: `the routing service's allowlist, header stripping and request logging do not apply`
Close: [R] remove `and request logging` (default) · [C] correct to `the routing service's allowlist and header stripping do not apply` (-2 words) · [O] record as open: The list says request logging does not apply on the direct path, while the logging page says every request is logged at the front door; which is true? (owner unknown) · [I] ignore for now · [T] tell me what to do

### 7. C-03-002 · sample session, line 9 · S2 contradiction · tool: propose/no-rewrite
Point: The passage states the token lifetime.
Defect: The paragraph states an eight-hour token at line 9 and a twelve-hour token at line 14; which lifetime does the policy set?
Text: `the token lives for eight hours`
Close: [R] remove `the token lives for twelve hours` · [K] keep A `the token lives for eight hours` or B `the token lives for twelve hours` (default: A) · [O] record as open: The paragraph states an eight-hour token at line 9 and a twelve-hour token at line 14; which lifetime does the policy set? (owner unknown) · [I] ignore for now · [T] tell me what to do
