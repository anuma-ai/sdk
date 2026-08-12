# TopicSkipReason

> **TopicSkipReason** = `"excluded"` | `"link-declined"` | `"stamp-declined"` | `"llm-unanswered"` | `"unreadable"` | `"not-found"` | `"link-failed"`

Defined in: [src/lib/memory/topicExtract.ts:306](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/topicExtract.ts#306)

Why one memory was skipped by a topic sweep.

Split along the line that actually matters operationally — did the sweep
DECLINE this row on purpose, or did something BREAK:

Deliberate (healthy; a sweep of nothing but these is a success):

* `excluded`        — deleted, owned by another user, or `topicsUserManaged`.
* `link-declined`   — the entity-link write's in-row guard declined (the row
  became user-managed / deleted / absent mid-run).
* `stamp-declined`  — same, caught by the stamp op's own re-check.

Degraded (something is wrong; see [isDegradedTopicSkip](../functions/isDegradedTopicSkip.md)):

* `llm-unanswered`  — the batch failed or the model omitted this id. THE one
  to alarm on: it is how a wholly broken sweep looks.
* `unreadable`      — the row could not be loaded/decrypted.
* `not-found`       — the lookup threw (absent row or read fault).
* `link-failed`     — the entity-link write threw.
