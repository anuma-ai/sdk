# ConsolidationFallbackReason

> **ConsolidationFallbackReason** = `"llm_error"` | `"invalid_response"` | `"target_vanished"` | `"subject_mismatch"`

Defined in: [src/lib/memory/types.ts:403](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#403)

Why a retain returned "create" instead of applying a consolidation decision.
Each value names a DIFFERENT thing to go fix, which is the point of keeping
them apart — and one of them is not a fault at all, see `subject_mismatch`:

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
* `subject_mismatch` — NOT a fault. The model returned a well-formed
  `supersede` and we refused it because the two subjects it named were
  different people, so retiring the target would have hidden a memory that is
  still true (#822 — "User's sister lives in Denver" retiring "User lives in
  Denver"). The refusal is the feature; do not alarm on it. What the rate does
  tell you is how often the model reaches for a cross-subject supersede, and —
  because the guard is inert unless the model fills in its subject fields — a
  rate of exactly zero is as likely to mean "the fields are being omitted" as
  "the mistake never happens". Check compliance before reading zero as health.
