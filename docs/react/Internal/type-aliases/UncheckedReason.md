# UncheckedReason

> **UncheckedReason** = `"llm-unavailable"` | `"over-budget"` | `"sources-unavailable"`

Defined in: [src/lib/memory/verifySupport.ts:65](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/verifySupport.ts#65)

Why a memory that COULD have been checked wasn't. Never conflate with
`unsupported`: this says the verifier didn't run, not that the fact failed.
