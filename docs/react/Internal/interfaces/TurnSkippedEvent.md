# TurnSkippedEvent

Defined in: [src/lib/memory/autoExtractWorker.ts:46](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#46)

## Properties

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/memory/autoExtractWorker.ts:65](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#65)

***

### reason

> **reason**: `"superseded"` | `"no-messages"` | `"no-new-content"` | `"in-flight"` | `"trivial-content"`

Defined in: [src/lib/memory/autoExtractWorker.ts:64](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#64)

Why the turn produced no extraction call:

* `no-messages`     — the turn carried an empty message array.
* `no-new-content`  — every message was already extracted (watermark is at
  the last message); the natural double-fire / re-mount
  dedup, not a loss.
* `superseded`      — a queued (pending) turn was replaced by a newer one
  before it ran. Lossless: the newer turn's window
  re-covers it.
* `in-flight`       — retained for back-compat; no longer emitted. The
  worker now coalesces in-flight arrivals into the
  pending queue instead of dropping them.
* `trivial-content` — every new user message was a greeting or bare
  acknowledgment that answers no assistant question,
  so no extraction call was made; the watermark
  advanced past them.
