# Calibration round 1: plan-run

### 1. C-03-002 · sample session, line 13 · S3 omission · tool: author/author
Point: The passage states what the design has not settled about the seal key.
Defect: The sentence leaves the rotation schedule undecided without saying who decides it; who owns the schedule?
Text: `Whether the seal key is rotated on a schedule is not yet decided.`
Close: [R] remove `Whether the seal key is rotated on a schedule is not yet decided.` · [O] record as open: Who owns the seal key rotation schedule? (Ben) (default) · [I] ignore for now · [T] tell me what to do

### 2. C-02-001 · sample routing, line 7 · S1 citation · tool: fix/verified
Point: The passage grounds the redirect check in the RFC.
Defect: The reference names section 4.11, which RFC 9700 does not have; which section covers the redirect check?
Text: `sections 4.7 and 4.11`
Close: [R] remove `sections 4.7 and 4.11` (default) · [C] correct to `sections 4.7 and 4.5` (0 words) · [O] record as open: The reference names section 4.11, which RFC 9700 does not have; which section covers the redirect check? (owner unknown) · [I] ignore for now · [T] tell me what to do

### 3. C-02-006 · sample routing, line 11 · S3 fact · tool: propose/removal
Point: The passage states what the sign-out form carries.
Defect: The clause states return-URL validation as settled while the page's own open item leaves the tenant setting unverified; what makes the validation happen?
Text: `and validate the return URL`
Close: [R] remove `and validate the return URL` (default) · [O] record as open: The clause states return-URL validation as settled while the page's own open item leaves the tenant setting unverified; what makes the validation happen? (owner unknown) · [I] ignore for now · [T] tell me what to do

### 4. C-03-003 · sample session, line 11 · S4 ambiguity · tool: propose/inference
Point: The passage states the logging rule.
Defect: The sentence states the logging rule without the exception the routing page names; which page is the home of the rule?
Text: `Every request is logged at the front door whichever path it takes.`
Close: [R] remove `Every request is logged at the front door whichever path it takes.` · [O] record as open: The sentence states the logging rule without the exception the routing page names; which page is the home of the rule? (owner unknown) (default) · [I] ignore for now · [T] tell me what to do

### 5. C-02-005 · sample routing, line 9 · S2 contradiction · tool: propose/no-rewrite
Point: The passage states which routing-service controls the direct path bypasses.
Defect: The list says request logging does not apply on the direct path while the session page says every request is logged; which statement stands?
Text: `the routing service's allowlist, header stripping and request logging do not apply`
Close: [R] remove `and request logging` (default) · [K] keep A `the routing service's allowlist, header stripping and request logging do not apply` or B `Every request is logged at the front door whichever path it takes` · [O] record as open: The list says request logging does not apply on the direct path while the session page says every request is logged; which statement stands? (owner unknown) · [I] ignore for now · [T] tell me what to do

### 6. C-03-004 · sample session, line 3 · S5 flow · tool: propose/restructure
Point: The passage opens the record page.
Defect: The opening sentence lists the fields before the reader knows what the record is for; what does the list establish here?
Text: `The session record holds the subject, the organisation and the expiry.`
Close: [R] remove `The session record holds the subject, the organisation and the expiry.` · [O] record as open: The opening sentence lists the fields before the reader knows what the record is for; what does the list establish here? (owner unknown) · [I] ignore for now (default) · [T] tell me what to do
