# FAQ Label Fixture

| Field | What the field holds | When it changes | Set by |
| --- | --- | --- | --- |
| `roles` | The approved roles | Every re-confirmation | The session service |

| Constant | Value | Source |
| --- | --- | --- |
| `IDLE_TIMEOUT` | 30 minutes | INS |

- **What John sees.** John sees the dashboard.
- **End State.** The record is deleted.

When the record expires, the session service answers with a 410.

| State | Condition |
| --- | --- |
| `idle` | More than 30 minutes have passed since the last page load |
