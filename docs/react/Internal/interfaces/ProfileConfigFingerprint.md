# ProfileConfigFingerprint

Defined in: [src/lib/memory/synthesizeProfile.ts:161](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#161)

Fingerprint of the config that produced a [ProfileDoc](ProfileDoc.md). Delta reuse
(both the wholesale fast path and per-section reuse) is only valid when the
current call's config matches — otherwise reused sections could carry the
wrong scope's evidence, un-redacted text under a now-present redactor, or an
old section shape.

## Properties

### facetKeys

> **facetKeys**: [`ProfileFacetKey`](../type-aliases/ProfileFacetKey.md)\[]

Defined in: [src/lib/memory/synthesizeProfile.ts:163](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#163)

Facet keys present in the doc, sorted.

***

### facetsSignature

> **facetsSignature**: `string`

Defined in: [src/lib/memory/synthesizeProfile.ts:169](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#169)

Order-independent digest of each facet's full definition (key + label +
query + guidance). Reuse must invalidate when a facet's PROMPT changes, not
just its key set — otherwise reused sections carry text generated under the
old definition. Facet display order does NOT invalidate (sections are
rebuilt in facet order and reused by key).

***

### redacted

> **redacted**: `boolean`

Defined in: [src/lib/memory/synthesizeProfile.ts:174](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#174)

Whether a PII redactor gated the section text. Reusing un-gated text under
a now-present redactor would leak PII, so this flips the fingerprint.

***

### scopes

> **scopes**: `string`\[]

Defined in: [src/lib/memory/synthesizeProfile.ts:171](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#171)

Scopes the facts were drawn from, sorted.
