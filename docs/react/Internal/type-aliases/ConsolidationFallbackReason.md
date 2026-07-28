# ConsolidationFallbackReason

> **ConsolidationFallbackReason** = `"llm_error"` | `"invalid_response"` | `"target_vanished"`

Defined in: [src/lib/memory/types.ts:340](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#340)

Why a retain fell back to "create" instead of applying a consolidation
decision. Each value names a DIFFERENT thing to go fix, which is the point of
keeping them apart:

* `llm_error` — the consolidation call never produced a response (network,
  timeout, 5xx, 429, empty completion, or missing credentials). Look at the
  portal and the auth config.
* `invalid_response` — the model answered, but with something unusable: an
  unknown action, a targetId that was not in the candidate set, an `update` or
  `supersede` with empty content, a `noop` with no target. Look at the prompt
  and the model.
* `target_vanished` — the model returned a decision that was valid when it was
  made, and the row it named was deleted or superseded by a concurrent writer
  before the write landed. Nothing is broken in the consolidator; a sustained
  rate points at write contention (for example an auto-extraction worker and a
  manual write racing over the same vault), which quietly costs you the
  dedup that decision would have performed.
