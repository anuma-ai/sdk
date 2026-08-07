# ProfileSection

Defined in: [src/lib/memory/synthesizeProfile.ts:251](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#251)

A synthesized profile section, grounded in specific vault facts.

## Properties

### generatedAt

> **generatedAt**: `number`

Defined in: [src/lib/memory/synthesizeProfile.ts:277](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#277)

Unix ms this section was generated.

***

### interests?

> `optional` **interests**: `string`\[]

Defined in: [src/lib/memory/synthesizeProfile.ts:275](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#275)

Structured interests — the `interests` facet only. Discrete entries,
trimmed and deduped case- and space-insensitively (first spelling wins), at
most 12 items of at most 40 code points each, ready for a profile store's
`interests` column. Absent when nothing survived normalization.

***

### key

> **key**: [`ProfileFacetKey`](../type-aliases/ProfileFacetKey.md)

Defined in: [src/lib/memory/synthesizeProfile.ts:252](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#252)

***

### label

> **label**: `string`

Defined in: [src/lib/memory/synthesizeProfile.ts:253](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#253)

***

### occupation?

> `optional` **occupation**: `string`

Defined in: [src/lib/memory/synthesizeProfile.ts:268](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#268)

Structured occupation — the `work_role` facet only. A short role phrase
(at most 80 code points, PII-gated alongside [ProfileSection.text](#text))
that a profile store's `occupation` column takes verbatim.

Absent when the facet found no evidence, when the model didn't return one,
or when the value it returned couldn't be made publishable. `text` is
unaffected either way, so the prose is never blocked on this.

***

### sourceMemoryIds

> **sourceMemoryIds**: `string`\[]

Defined in: [src/lib/memory/synthesizeProfile.ts:258](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#258)

Vault memory ids this section was grounded on — provenance + delta refresh.

***

### stale?

> `optional` **stale**: `boolean`

Defined in: [src/lib/memory/synthesizeProfile.ts:280](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#280)

True when regeneration failed and a prior section value was carried
forward (e.g. LLM returned empty) — the caller may choose to retry.

***

### text

> **text**: `string`

Defined in: [src/lib/memory/synthesizeProfile.ts:256](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#256)

Synthesized prose (PII-redacted when a redactor is supplied). Empty when
the vault has no evidence for this facet.
