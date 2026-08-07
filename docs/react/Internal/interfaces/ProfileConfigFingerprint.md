# ProfileConfigFingerprint

Defined in: [src/lib/memory/synthesizeProfile.ts:289](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#289)

Fingerprint of the config that produced a [ProfileDoc](ProfileDoc.md). Delta reuse
(both the wholesale fast path and per-section reuse) is only valid when the
current call's config matches — otherwise reused sections could carry the
wrong scope's evidence, un-redacted text under a now-present redactor, an
old section shape, or text grounded in memory ids that are no longer in the
publish-review set.

## Properties

### facetKeys

> **facetKeys**: [`ProfileFacetKey`](../type-aliases/ProfileFacetKey.md)\[]

Defined in: [src/lib/memory/synthesizeProfile.ts:291](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#291)

Facet keys present in the doc, sorted.

***

### facetsSignature

> **facetsSignature**: `string`

Defined in: [src/lib/memory/synthesizeProfile.ts:299](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#299)

Order-independent digest of each facet's full definition (key + label +
query + guidance) and the response schema it is synthesized under. Reuse
must invalidate when a facet's PROMPT changes, not just its key set —
otherwise reused sections carry text generated under the old definition,
or under an output schema that predates a field the caller now reads.
Facet display order does NOT invalidate (sections are rebuilt in facet
order and reused by key).

***

### redacted

> **redacted**: `boolean`

Defined in: [src/lib/memory/synthesizeProfile.ts:304](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#304)

Whether a PII redactor gated the section text. Reusing un-gated text under
a now-present redactor would leak PII, so this flips the fingerprint.

***

### reviewedMemoryIdsSignature

> **reviewedMemoryIdsSignature**: `string`

Defined in: [src/lib/memory/synthesizeProfile.ts:312](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#312)

Order-independent digest of [SynthesizeProfileOptions.reviewedMemoryIds](SynthesizeProfileOptions.md#reviewedmemoryids).
Empty string when the review gate is off (omit / empty array). Changing the
set must invalidate reuse — otherwise a narrowed review keeps text grounded
in unreviewed ids, and a widened review leaves previously-cleared sections
empty.

***

### scopes

> **scopes**: `string`\[]

Defined in: [src/lib/memory/synthesizeProfile.ts:301](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#301)

Scopes the facts were drawn from, sorted.
