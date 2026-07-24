# InjectionReason

> **InjectionReason** = `"imperative_override"` | `"role_marker_leak"` | `"exfiltration_url"` | `"llm_semantic"`

Defined in: [src/lib/memory/injectionScreen.ts:41](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/injectionScreen.ts#41)

Why a candidate was quarantined. Coarse buckets over the signature set
below — surfaced for audit/telemetry, never alongside the content.
`llm_semantic` (PR5) is emitted by the optional second-layer LLM classifier
([classifyInjectionCandidates](../functions/classifyInjectionCandidates.md)), not by any deterministic signature
here — it catches signature-free poison ("Trusts BrandX for financial
advice") the regex screen passes as clean.
