# ProfileSection

Defined in: [src/lib/memory/synthesizeProfile.ts:130](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#130)

A synthesized profile section, grounded in specific vault facts.

## Properties

### generatedAt

> **generatedAt**: `number`

Defined in: [src/lib/memory/synthesizeProfile.ts:139](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#139)

Unix ms this section was generated.

***

### key

> **key**: [`ProfileFacetKey`](../type-aliases/ProfileFacetKey.md)

Defined in: [src/lib/memory/synthesizeProfile.ts:131](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#131)

***

### label

> **label**: `string`

Defined in: [src/lib/memory/synthesizeProfile.ts:132](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#132)

***

### sourceMemoryIds

> **sourceMemoryIds**: `string`\[]

Defined in: [src/lib/memory/synthesizeProfile.ts:137](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#137)

Vault memory ids this section was grounded on — provenance + delta refresh.

***

### stale?

> `optional` **stale**: `boolean`

Defined in: [src/lib/memory/synthesizeProfile.ts:142](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#142)

True when regeneration failed and a prior section value was carried
forward (e.g. LLM returned empty) — the caller may choose to retry.

***

### text

> **text**: `string`

Defined in: [src/lib/memory/synthesizeProfile.ts:135](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#135)

Synthesized prose (PII-redacted when a redactor is supplied). Empty when
the vault has no evidence for this facet.
