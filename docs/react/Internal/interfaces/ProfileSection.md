# ProfileSection

Defined in: [src/lib/memory/synthesizeProfile.ts:142](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#142)

A synthesized profile section, grounded in specific vault facts.

## Properties

### generatedAt

> **generatedAt**: `number`

Defined in: [src/lib/memory/synthesizeProfile.ts:151](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#151)

Unix ms this section was generated.

***

### key

> **key**: [`ProfileFacetKey`](../type-aliases/ProfileFacetKey.md)

Defined in: [src/lib/memory/synthesizeProfile.ts:143](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#143)

***

### label

> **label**: `string`

Defined in: [src/lib/memory/synthesizeProfile.ts:144](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#144)

***

### sourceMemoryIds

> **sourceMemoryIds**: `string`\[]

Defined in: [src/lib/memory/synthesizeProfile.ts:149](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#149)

Vault memory ids this section was grounded on — provenance + delta refresh.

***

### stale?

> `optional` **stale**: `boolean`

Defined in: [src/lib/memory/synthesizeProfile.ts:154](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#154)

True when regeneration failed and a prior section value was carried
forward (e.g. LLM returned empty) — the caller may choose to retry.

***

### text

> **text**: `string`

Defined in: [src/lib/memory/synthesizeProfile.ts:147](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#147)

Synthesized prose (PII-redacted when a redactor is supplied). Empty when
the vault has no evidence for this facet.
