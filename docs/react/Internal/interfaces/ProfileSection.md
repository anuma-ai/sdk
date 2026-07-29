# ProfileSection

Defined in: [src/lib/memory/synthesizeProfile.ts:250](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#250)

A synthesized profile section, grounded in specific vault facts.

## Properties

### generatedAt

> **generatedAt**: `number`

Defined in: [src/lib/memory/synthesizeProfile.ts:276](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#276)

Unix ms this section was generated.

***

### interests?

> `optional` **interests**: `string`\[]

Defined in: [src/lib/memory/synthesizeProfile.ts:274](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#274)

Structured interests — the `interests` facet only. Discrete entries,
trimmed and deduped case- and space-insensitively (first spelling wins), at
most 12 items of at most 40 code points each, ready for a profile store's
`interests` column. Absent when nothing survived normalization.

***

### key

> **key**: [`ProfileFacetKey`](../type-aliases/ProfileFacetKey.md)

Defined in: [src/lib/memory/synthesizeProfile.ts:251](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#251)

***

### label

> **label**: `string`

Defined in: [src/lib/memory/synthesizeProfile.ts:252](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#252)

***

### occupation?

> `optional` **occupation**: `string`

Defined in: [src/lib/memory/synthesizeProfile.ts:267](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#267)

Structured occupation — the `work_role` facet only. A short role phrase
(at most 80 code points, PII-gated alongside [ProfileSection.text](#text))
that a profile store's `occupation` column takes verbatim.

Absent when the facet found no evidence, when the model didn't return one,
or when the value it returned couldn't be made publishable. `text` is
unaffected either way, so the prose is never blocked on this.

***

### sourceMemoryIds

> **sourceMemoryIds**: `string`\[]

Defined in: [src/lib/memory/synthesizeProfile.ts:257](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#257)

Vault memory ids this section was grounded on — provenance + delta refresh.

***

### stale?

> `optional` **stale**: `boolean`

Defined in: [src/lib/memory/synthesizeProfile.ts:279](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#279)

True when regeneration failed and a prior section value was carried
forward (e.g. LLM returned empty) — the caller may choose to retry.

***

### text

> **text**: `string`

Defined in: [src/lib/memory/synthesizeProfile.ts:255](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#255)

Synthesized prose (PII-redacted when a redactor is supplied). Empty when
the vault has no evidence for this facet.
