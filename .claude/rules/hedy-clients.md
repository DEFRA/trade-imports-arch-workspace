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
- The helper offers `get`, which resolves to the parsed body, and `redirectTarget`, which does not follow a redirect and resolves to the `Location` of a 3xx answer. The helper's `post` and `put` send the body as JSON with the content type `application/json`, and resolve to the parsed body, or to `null` when the answer is 204. The helper also exposes `normalisedBaseUrl`, the base URL without trailing slashes, and every URL in a projection is built from that value.
- A client method returns a projection of the fields its callers use, never the raw response.
- A read method takes the key or id its command takes and returns the projection the command documents. The projection is built once, in the client.
- The Confluence lookup `pageByTitle(title, spaceKey)` sends one GET to `/wiki/rest/api/content` with `spaceKey`, `title` and `expand=version,metadata.labels` in a query built by `URLSearchParams`. The lookup resolves to `{ id, url, labels }` for the first result, or to `undefined` when the answer holds no result. The Confluence client also exposes `siteAddress` and `pageUrl(spaceKey, id)`, so a command builds no page address itself.

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

A read method's test proves the projection against the fixture captured from the bash tool, and proves 404. For a paginated read, the test also proves that pages join and that the cap stops the reading.

The `pageByTitle` test proves the request's query and the projection against the captured fixture, the encoding of a title holding spaces, a colon, an ampersand, a plus and a hash, and `undefined` for the empty fixture. The test also proves empty labels without metadata, the site address and page address the client exposes, and the messages for 401, 404 and a refused connection.

A write method's test proves that the body sent equals the fixture captured from the bash tool, proves the projection of the answer, and proves 400.
