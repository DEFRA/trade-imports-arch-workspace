---
paths:
  - "hedy/src/clients/**"
---

# `hedy` Client Rules

These rules apply to every file under `hedy/src/clients/`, alongside the source and test rules.

## Shape

- A client is a factory, such as `createJiraClient({ user, token, baseUrl }, { timeoutMs })`, that returns an object of methods. The options argument is optional and passes `timeoutMs` through to the HTTP helper.
- `credentialsFromEnv` in `atlassian.js` is the only function that reads the environment. A factory takes the values `credentialsFromEnv` returns and does not check the values again.
- One HTTP helper, `createAtlassianHttp`, holds the Basic header and the status map. A client holds only its endpoints and its projections.
- A client method returns a projection of the fields its callers use, never the raw response.

## Status Map

The helper maps each outcome to one error code:

- A failed connection is `NETWORK`. A request with no full answer within `timeoutMs`, 30000 by default, is also `NETWORK`.
- 401 and 403 are `AUTH`.
- 404 is `NOT_FOUND`.
- 429 is `RATE_LIMIT`.
- 400 and any other 4xx status are `USAGE`, carrying the body's `errorMessages` and `errors` entries, or the body's `message` when those are absent.
- 500 and above are `NETWORK`.
- A body that is not JSON is `PARSE`.

## Messages

- Every message names the service, the action and the next step the caller can take.
- No message, cause or note carries a credential value. No message carries a response body beyond the reasons a 4xx answer gives.

## Tests

A client test runs under nock and covers success with the Basic header asserted through `matchHeader`, 401, 404, 429, 400, a body that is not JSON and a refused connection. A timeout test points the client at the loopback server from `startSilentServer` in `test-support/http.js`, not at a delayed nock reply.
