# Synthetic Page for the hedy Fixtures
Space: DOCS | Version: 4 (2026-10-20T10:30:00.000Z) | By: Ada Lovelace
Source: https://example.atlassian.net/wiki/spaces/DOCS/pages/123456

# Purpose

This page exists so that **hedy** can prove its *markdown* conversion against `page.sh`. It holds entities such as &, <tag>, "quotes", it's and a non-breaking space.

Legacy **bold** with *italic* and ~~struck~~ text, then a line
break and a [link to another page](https://example.atlassian.net/wiki/spaces/DOCS/pages/987654/Other+Page), plus a DONE status.

## Lists

- Endpoint `gateway.example.test/mdm`Tenant: `example.onmicrosoft.com`
- Scope: `api://example.test/.default`

Second top-level item

1. First step
2. Second step
3. Third step

## Table

| Name | Value |
| --- | --- |
| timeout | 30 s \| the default |
| retries | `0` |

### Code

```json
{
  "ok": true,
  "result": null
}
```

```
hedy confluence page 123456 --json
```

> A quoted paragraph with *emphasis*.
> 

---

![diagram](/wiki/download/attachments/123456/diagram.png)

Closing paragraph.
